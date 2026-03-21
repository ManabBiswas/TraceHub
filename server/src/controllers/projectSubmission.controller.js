import mongoose from "mongoose";
import Classroom from "../models/Classroom.js";
import ClassPost from "../models/ClassPost.js";
import Submission from "../models/Submission.js";
import ProjectMetadata from "../models/ProjectMetadata.js";
import { mintVersionProof } from "../services/algorand.service.js";
import { hashProjectSubmission } from "../utils/contentHash.js";
import { analyzeProjectSubmission } from "../services/projectAnalysis.service.js";

// ── Helper functions ───────────────────────────────────────────────────────
function isStudentInClassroom(classroom, userId) {
  const id = String(userId);
  return classroom.studentIds.some((s) => String(s) === id);
}

function isTeacherInClassroom(classroom, userId) {
  const id = String(userId);
  return (
    String(classroom.ownerId) === id ||
    classroom.teacherIds.some((t) => String(t) === id)
  );
}

function sanitizeSubmissionForStudent(submission) {
  const plain = submission.toObject ? submission.toObject() : submission;
  if (plain.files) {
    plain.files = (plain.files || []).map((f) => ({
      fileName: f.fileName,
      mimeType: f.mimeType,
      size: f.size,
    }));
  }
  return plain;
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE DRAFT
// Student uploads PDF + GitHub URL without making it final.
// Can be called multiple times. Each call creates a new version snapshot.
// ─────────────────────────────────────────────────────────────────────────────
export const saveProjectDraft = async (req, res) => {
  try {
    const { classroomId, postId } = req.params;
    const { githubUrl, notes } = req.body;
    const files = Array.isArray(req.files) ? req.files : [];

    if (githubUrl && !githubUrl.match(/github\.com\/[^\/]+\/[^\/]+/)) {
      return res.status(400).json({
        error: "Please provide a valid public GitHub repository URL",
      });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    if (!isStudentInClassroom(classroom, req.user._id)) {
      return res.status(403).json({
        error: "Only enrolled students can submit projects",
      });
    }

    const post = await ClassPost.findOne({ _id: postId, classroomId });
    if (!post || post.type !== "PROJECT") {
      return res.status(400).json({
        error: "This endpoint is only for PROJECT type posts",
      });
    }

    if (post.dueDate && new Date() > new Date(post.dueDate)) {
      return res.status(400).json({
        error: "The deadline for this project has passed",
      });
    }

    let submission = await Submission.findOne({
      classroomId,
      postId,
      studentId: req.user._id,
    });

    // Guard: block edits when student has finalized submission
    if (submission) {
      const blockedStatuses = ["FINAL_SUBMITTED", "UNDER_REVIEW", "VERIFIED"];
      if (blockedStatuses.includes(submission.submissionStatus)) {
        return res.status(403).json({
          error: `You cannot make changes. Status: ${submission.submissionStatus}.`,
          submissionStatus: submission.submissionStatus,
        });
      }
    }

    const pdfFile = files.find((f) => f.mimetype === "application/pdf");
    const storedFiles = pdfFile
      ? [
          {
            fileName: pdfFile.originalname,
            mimeType: pdfFile.mimetype,
            size: pdfFile.size,
            data: pdfFile.buffer,
          },
        ]
      : submission?.files || [];

    const isRevision =
      submission && submission.submissionStatus === "REJECTED_FOR_REVISION";
    const versionAction = isRevision ? "REVISION_DRAFT" : "DRAFT_SAVE";
    const currentCycle = submission?.revisionCycle || 1;

    if (!submission) {
      submission = new Submission({
        classroomId,
        postId,
        studentId: req.user._id,
        submissionStatus: "DRAFT",
        revisionCycle: 1,
        contentType: "BOTH",
        githubUrl: githubUrl?.trim() || "",
        text: notes || "",
        files: storedFiles,
        aiAnalysisStatus: "NOT_STARTED",
        versionNumber: 1,
        versionHistory: [],
      });
    } else {
      if (githubUrl) submission.githubUrl = githubUrl.trim();
      if (notes !== undefined) submission.text = notes;
      if (pdfFile) submission.files = storedFiles;
    }

    const nextVersion = (submission.versionHistory?.length || 0) + 1;
    let draftTxId = "";
    try {
      draftTxId = await mintVersionProof({
        entityType: "PROJECT_DRAFT",
        entityId: String(submission._id || "new"),
        versionNumber: nextVersion,
        action: versionAction,
        actor: req.user.name,
        payload: {
          classroomId,
          postId,
          githubUrl: githubUrl?.trim() || submission.githubUrl,
          revisionCycle: currentCycle,
          hasPdf: Boolean(pdfFile),
        },
      });
    } catch {
      draftTxId = process.env.ALGORAND_DEMO_FALLBACK === "true" ? `DEMO_DRAFT_${Date.now()}` : "";
    }

    submission.versionNumber = nextVersion;
    submission.versionHistory.push({
      versionNumber: nextVersion,
      action: versionAction,
      contentType: "BOTH",
      githubUrl: submission.githubUrl,
      text: submission.text,
      files: storedFiles.map((f) => ({
        fileName: f.fileName,
        mimeType: f.mimeType,
        size: f.size,
        hasBinaryData: true,
      })),
      algorandTxId: draftTxId,
      updatedByUserId: req.user._id,
      updatedByName: req.user.name,
      updatedByRole: req.user.role,
      updatedAt: new Date(),
      revisionCycle: currentCycle,
    });

    await submission.save();

    return res.status(200).json({
      message: "Draft saved successfully. You can continue editing or submit final when ready.",
      submission: sanitizeSubmissionForStudent(submission),
      submissionStatus: submission.submissionStatus,
      versionNumber: submission.versionNumber,
      draftTxId,
    });
  } catch (error) {
    console.error("saveProjectDraft error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBMIT FINAL
// Student locks their submission. Triggers AI pipeline.
// ─────────────────────────────────────────────────────────────────────────────
export const submitProjectFinal = async (req, res) => {
  try {
    const { classroomId, postId } = req.params;

    const submission = await Submission.findOne({
      classroomId,
      postId,
      studentId: req.user._id,
    });

    if (!submission) {
      return res.status(404).json({
        error: "No draft found. Please save a draft first.",
      });
    }

    const alreadyFinalized = [
      "FINAL_SUBMITTED",
      "UNDER_REVIEW",
      "VERIFIED",
    ];
    if (alreadyFinalized.includes(submission.submissionStatus)) {
      return res.status(403).json({
        error: "You have already made a final submission.",
        submissionStatus: submission.submissionStatus,
      });
    }

    if (!submission.githubUrl) {
      return res.status(400).json({
        error: "A public GitHub repository URL is required.",
      });
    }

    const post = await ClassPost.findOne({ _id: postId, classroomId });
    if (
      post?.projectConfig?.requirePdfReport &&
      submission.files.length === 0
    ) {
      return res.status(400).json({
        error: "A PDF project report is required.",
      });
    }

    if (post?.dueDate && new Date() > new Date(post.dueDate)) {
      return res.status(400).json({
        error: "The deadline has passed.",
      });
    }

    const isRevision = submission.revisionCycle > 1;
    const finalAction = isRevision ? "REVISION_FINAL" : "FINAL_SUBMIT";
    const nextVersion = submission.versionNumber + 1;

    let finalTxId = "";
    try {
      finalTxId = await mintVersionProof({
        entityType: "PROJECT_FINAL_SUBMISSION",
        entityId: String(submission._id),
        versionNumber: nextVersion,
        action: finalAction,
        actor: req.user.name,
        payload: {
          classroomId,
          postId,
          githubUrl: submission.githubUrl,
          revisionCycle: submission.revisionCycle,
          totalDraftVersions: submission.versionHistory.length,
          hasPdfReport: submission.files.length > 0,
        },
      });
    } catch {
      finalTxId = process.env.ALGORAND_DEMO_FALLBACK === "true" ? `DEMO_FINAL_${Date.now()}` : "";
    }

    submission.submissionStatus = "FINAL_SUBMITTED";
    submission.aiAnalysisStatus = "NOT_STARTED";
    submission.versionNumber = nextVersion;
    submission.versionHistory.push({
      versionNumber: nextVersion,
      action: finalAction,
      contentType: "BOTH",
      githubUrl: submission.githubUrl,
      text: submission.text,
      files: submission.files.map((f) => ({
        fileName: f.fileName,
        mimeType: f.mimeType,
        size: f.size,
        hasBinaryData: true,
      })),
      algorandTxId: finalTxId,
      updatedByUserId: req.user._id,
      updatedByName: req.user.name,
      updatedByRole: req.user.role,
      updatedAt: new Date(),
      revisionCycle: submission.revisionCycle,
    });

    await submission.save();

    triggerAIAnalysis(submission._id, postId, classroomId, req.user._id, submission.githubUrl)
      .catch((err) => console.error("AI analysis failed:", err.message));

    return res.status(200).json({
      message: "Final submission received. Your work is now locked and under AI analysis.",
      submissionStatus: "FINAL_SUBMITTED",
      finalSubmissionTxId: finalTxId,
      revisionCycle: submission.revisionCycle,
    });
  } catch (error) {
    console.error("submitProjectFinal error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY PROJECT (professor)
// ─────────────────────────────────────────────────────────────────────────────
export const verifyProject = async (req, res) => {
  try {
    const { classroomId, postId, submissionId } = req.params;
    const { professorNote } = req.body;

    const classroom = await Classroom.findById(classroomId);
    if (!isTeacherInClassroom(classroom, req.user._id)) {
      return res.status(403).json({ error: "Only teachers can verify projects" });
    }

    const submission = await Submission.findOne({
      _id: submissionId,
      classroomId,
      postId,
    });

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const reviewableStatuses = ["FINAL_SUBMITTED", "UNDER_REVIEW"];
    if (!reviewableStatuses.includes(submission.submissionStatus)) {
      return res.status(400).json({
        error: `Cannot verify a project with status: ${submission.submissionStatus}`,
        submissionStatus: submission.submissionStatus,
      });
    }

    const metadata = await ProjectMetadata.findOne({
      submissionId: submission._id,
    });

    const contentHash = hashProjectSubmission(submission, metadata);

    const nextVersion = submission.versionNumber + 1;
    let verificationTxId = "";
    try {
      verificationTxId = await mintVersionProof({
        entityType: "PROJECT_VERIFICATION",
        entityId: String(submission._id),
        versionNumber: nextVersion,
        action: "VERIFIED",
        actor: req.user.name,
        contentHash,
        payload: {
          classroomId,
          postId,
          studentId: String(submission.studentId),
          githubUrl: submission.githubUrl,
          revisionCycle: submission.revisionCycle,
        },
      });
    } catch {
      verificationTxId = process.env.ALGORAND_DEMO_FALLBACK === "true" ? `DEMO_VERIFY_${Date.now()}` : "";
    }

    submission.submissionStatus = "VERIFIED";
    submission.isPublic = true;
    submission.publicApprovedAt = new Date();

    submission.projectVerification = {
      decision: "VERIFIED",
      verifiedBy: req.user.name,
      verifiedAt: new Date(),
      professorNote: professorNote || "",
      algorandVerificationTxId: verificationTxId,
      contentHash,
    };

    submission.versionNumber = nextVersion;
    submission.versionHistory.push({
      versionNumber: nextVersion,
      action: "VERIFIED",
      contentType: submission.contentType,
      githubUrl: submission.githubUrl,
      text: submission.text,
      files: submission.files.map((f) => ({
        fileName: f.fileName,
        mimeType: f.mimeType,
        size: f.size,
        hasBinaryData: true,
      })),
      professorNote: professorNote || "",
      algorandTxId: verificationTxId,
      contentHash,
      updatedByUserId: req.user._id,
      updatedByName: req.user.name,
      updatedByRole: req.user.role,
      updatedAt: new Date(),
      revisionCycle: submission.revisionCycle,
    });

    await submission.save();

    return res.status(200).json({
      message: "Project verified and published to the public gallery.",
      submissionStatus: "VERIFIED",
      isPublic: true,
      blockchainProof: {
        txId: verificationTxId,
        contentHash,
        explorerUrl: verificationTxId.startsWith("DEMO_")
          ? null
          : `https://testnet.algoexplorer.io/tx/${verificationTxId}`,
      },
    });
  } catch (error) {
    console.error("verifyProject error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// REJECT FOR REVISION (professor)
// ─────────────────────────────────────────────────────────────────────────────
export const rejectForRevision = async (req, res) => {
  try {
    const { classroomId, postId, submissionId } = req.params;
    const { professorNote } = req.body;

    if (!professorNote || professorNote.trim().length < 10) {
      return res.status(400).json({
        error: "A detailed professor note is required when rejecting for revision.",
      });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!isTeacherInClassroom(classroom, req.user._id)) {
      return res.status(403).json({ error: "Only teachers can review projects" });
    }

    const submission = await Submission.findOne({
      _id: submissionId,
      classroomId,
      postId,
    });

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    if (submission.submissionStatus === "VERIFIED") {
      return res.status(400).json({
        error: "A verified project cannot be rejected. Verification is permanent.",
      });
    }

    const reviewableStatuses = ["FINAL_SUBMITTED", "UNDER_REVIEW"];
    if (!reviewableStatuses.includes(submission.submissionStatus)) {
      return res.status(400).json({
        error: `Cannot reject a project with status: ${submission.submissionStatus}`,
      });
    }

    const nextVersion = submission.versionNumber + 1;
    const newRevisionCycle = submission.revisionCycle + 1;

    let rejectionTxId = "";
    try {
      rejectionTxId = await mintVersionProof({
        entityType: "PROJECT_REVIEW",
        entityId: String(submission._id),
        versionNumber: nextVersion,
        action: "REJECTED_FOR_REVISION",
        actor: req.user.name,
        payload: {
          classroomId,
          postId,
          studentId: String(submission.studentId),
          revisionCycleOpened: newRevisionCycle,
        },
      });
    } catch {
      rejectionTxId = process.env.ALGORAND_DEMO_FALLBACK === "true" ? `DEMO_REJECT_${Date.now()}` : "";
    }

    submission.submissionStatus = "REJECTED_FOR_REVISION";
    submission.revisionCycle = newRevisionCycle;

    submission.projectVerification = submission.projectVerification || {};
    submission.projectVerification.decision = "REJECTED_FOR_REVISION";
    submission.projectVerification.professorNote = professorNote.trim();

    submission.versionNumber = nextVersion;
    submission.versionHistory.push({
      versionNumber: nextVersion,
      action: "REJECTED_FOR_REVISION",
      professorNote: professorNote.trim(),
      algorandTxId: rejectionTxId,
      updatedByUserId: req.user._id,
      updatedByName: req.user.name,
      updatedByRole: req.user.role,
      updatedAt: new Date(),
      revisionCycle: submission.revisionCycle,
    });

    await submission.save();

    return res.status(200).json({
      message: "Project sent back for revision. Student can now submit a new version.",
      submissionStatus: "REJECTED_FOR_REVISION",
      revisionCycle: newRevisionCycle,
      rejectionTxId,
      professorNote: professorNote.trim(),
    });
  } catch (error) {
    console.error("rejectForRevision error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PERMANENTLY REJECT (professor)
// ─────────────────────────────────────────────────────────────────────────────
export const permanentlyRejectProject = async (req, res) => {
  try {
    const { classroomId, postId, submissionId } = req.params;
    const { professorNote } = req.body;

    if (!professorNote || professorNote.trim().length < 10) {
      return res.status(400).json({
        error: "A detailed reason is required for permanent rejection.",
      });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!isTeacherInClassroom(classroom, req.user._id)) {
      return res.status(403).json({ error: "Only teachers can review projects" });
    }

    const submission = await Submission.findOne({
      _id: submissionId,
      classroomId,
      postId,
    });

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    if (submission.submissionStatus === "VERIFIED") {
      return res.status(400).json({
        error: "A verified project cannot be permanently rejected.",
      });
    }

    const nextVersion = submission.versionNumber + 1;
    let txId = "";
    try {
      txId = await mintVersionProof({
        entityType: "PROJECT_REVIEW",
        entityId: String(submission._id),
        versionNumber: nextVersion,
        action: "PERMANENTLY_REJECTED",
        actor: req.user.name,
        payload: { classroomId, postId, studentId: String(submission.studentId) },
      });
    } catch {
      txId = process.env.ALGORAND_DEMO_FALLBACK === "true" ? `DEMO_PERM_REJECT_${Date.now()}` : "";
    }

    submission.submissionStatus = "PERMANENTLY_REJECTED";
    submission.isPublic = false;
    submission.projectVerification = submission.projectVerification || {};
    submission.projectVerification.decision = "PERMANENTLY_REJECTED";
    submission.projectVerification.professorNote = professorNote.trim();
    submission.versionNumber = nextVersion;
    submission.versionHistory.push({
      versionNumber: nextVersion,
      action: "PERMANENTLY_REJECTED",
      professorNote: professorNote.trim(),
      algorandTxId: txId,
      updatedByUserId: req.user._id,
      updatedByName: req.user.name,
      updatedByRole: req.user.role,
      updatedAt: new Date(),
      revisionCycle: submission.revisionCycle,
    });

    await submission.save();

    return res.status(200).json({
      message: "Project permanently rejected.",
      submissionStatus: "PERMANENTLY_REJECTED",
    });
  } catch (error) {
    console.error("permanentlyRejectProject error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET MY SUBMISSION (student)
// ─────────────────────────────────────────────────────────────────────────────
export const getMyProjectSubmission = async (req, res) => {
  try {
    const { classroomId, postId } = req.params;

    const submission = await Submission.findOne({
      classroomId,
      postId,
      studentId: req.user._id,
    }).select("-files.data");

    if (!submission) {
      return res.json({ submission: null, submissionStatus: null });
    }

    return res.json({
      submission: sanitizeSubmissionForStudent(submission),
      submissionStatus: submission.submissionStatus,
      revisionCycle: submission.revisionCycle,
      canEdit: ["DRAFT", "REJECTED_FOR_REVISION"].includes(
        submission.submissionStatus
      ),
      canFinalSubmit: ["DRAFT", "REJECTED_FOR_REVISION"].includes(
        submission.submissionStatus
      ),
      professorNote:
        submission.submissionStatus === "REJECTED_FOR_REVISION"
          ? submission.projectVerification?.professorNote
          : null,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ANALYSIS REPORT (professor)
// ─────────────────────────────────────────────────────────────────────────────
export const getProjectAnalysisReport = async (req, res) => {
  try {
    const { classroomId, postId, submissionId } = req.params;

    const classroom = await Classroom.findById(classroomId);
    if (!isTeacherInClassroom(classroom, req.user._id)) {
      return res.status(403).json({ error: "Only teachers can view analysis" });
    }

    const metadata = await ProjectMetadata.findOne({
      submissionId,
      postId,
      classroomId,
    });

    if (!metadata) {
      return res.json({
        status: "NOT_STARTED",
        message: "Analysis has not started yet",
      });
    }

    return res.json({
      status: metadata.status,
      metadata: metadata.toObject(),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND: Trigger AI analysis after final submission
// ─────────────────────────────────────────────────────────────────────────────
async function triggerAIAnalysis(
  submissionId,
  postId,
  classroomId,
  studentId,
  githubUrl
) {
  try {
    // Update status to PROCESSING
    await Submission.findByIdAndUpdate(submissionId, {
      aiAnalysisStatus: "PROCESSING",
    });

    // Run analysis
    const metadata = await analyzeProjectSubmission(
      submissionId,
      postId,
      classroomId,
      studentId,
      githubUrl
    );

    // AI done — move to UNDER_REVIEW
    await Submission.findByIdAndUpdate(submissionId, {
      aiAnalysisStatus: "READY",
      submissionStatus: "UNDER_REVIEW",
      metadataId: metadata._id,
    });
  } catch (err) {
    console.error("AI analysis error:", err.message);
    await Submission.findByIdAndUpdate(submissionId, {
      aiAnalysisStatus: "FAILED",
      submissionStatus: "UNDER_REVIEW",
    });
  }
}
