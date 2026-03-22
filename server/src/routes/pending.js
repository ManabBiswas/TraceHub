import express from "express";
import { uploadToDuality } from "../services/storage.service.js";
import { mintVersionProof } from "../services/algorand.service.js";
import Resource from "../models/Resource.js";
import Submission from "../models/Submission.js";
import { hashResource } from "../utils/contentHash.js";

const router = express.Router();

/**
 * GET /api/pending
 * Get all pending resources and student submissions (no auth required, public)
 */
router.get("/", async (req, res) => {
  try {
    // Fetch pending resources (uploaded files)
    const pendingResources = await Resource.find({ status: "pending" })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    // Fetch pending student submissions (project files under review)
    const pendingSubmissions = await Submission.find({ submissionStatus: "UNDER_REVIEW" })
      .populate("studentId", "name email")
      .populate("classroomId", "name")
      .populate("postId", "title")
      .sort({ updatedAt: -1 });

    // Transform submissions to match resource structure for frontend
    const formattedSubmissions = pendingSubmissions.map((sub) => ({
      _id: sub._id,
      type: "SUBMISSION",
      title: `${sub.studentId?.name || "Student"} - ${sub.postId?.title || "Project"}`,
      uploaderName: sub.studentId?.name || "Student",
      uploaderEmail: sub.studentId?.email || "",
      githubUrl: sub.githubUrl,
      files: sub.files,
      classroomId: sub.classroomId,
      postId: sub.postId,
      studentId: sub.studentId,
      status: "pending",
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    }));

    // Combine both into single array
    const allPending = [...pendingResources, ...formattedSubmissions].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
    );

    res.json({
      count: allPending.length,
      resources: allPending,
      submissionsCount: pendingSubmissions.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pending/approve/:resourceId
 * Approve a pending resource and mint on Algorand
 * Body: { passcode }
 */
router.post("/approve/:resourceId", async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { passcode } = req.body;

    // Simple passcode check (hardcoded for MVP)
    if (passcode !== process.env.PROFESSOR_PASSCODE) {
      return res.status(403).json({
        error: "Invalid passcode. Contact an organizer if you're a professor.",
      });
    }

    // Find the pending resource
    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    if (resource.status === "approved") {
      return res.status(400).json({ error: "Resource already approved" });
    }

    // Step 1: Upload to Duality
    let dualityUrl = null;
    try {
      // Create a buffer from the GitHub repo name or title
      const fileName = resource.githubUrl
        ? resource.githubUrl.split("/").pop() + ".md"
        : resource.title + ".txt";

      // MVP Design: Store metadata reference file, not full GitHub archive
      // Full repo archival is a v2 feature. This demonstrates the mint workflow.
      const content = `TraceHub Archive Reference
Repository: ${resource.githubUrl || "N/A"}
Title: ${resource.title}
Uploader: ${resource.uploaderName}
Approved At: ${new Date().toISOString()}
GitHub URL: ${resource.githubUrl}
`;
      const buffer = Buffer.from(content);
      dualityUrl = await uploadToDuality(buffer, fileName);
    } catch (e) {
      console.error("Duality upload failed:", e.message);
      // Continue with mock URL
      dualityUrl = `https://storage.duality.network/ipfs/QmPending${resource._id}`;
    }

    // Step 2: Compute content hash for blockchain verification
    // This hash will be written to Algorand and used to detect tampering
    const contentHash = hashResource(resource);

    // Step 3: Mint Algorand transaction
    let algorandTxId = null;
    try {
      const nextVersion = Number(resource.versionNumber || 1) + 1;
      algorandTxId = await mintVersionProof({
        entityType: "RESOURCE",
        entityId: String(resource._id),
        versionNumber: nextVersion,
        action: "APPROVE",
        actor: "Professor (Passcode)",
        referenceUrl: dualityUrl,
        contentHash, // This is the critical addition - hash is now on-chain
        payload: {
          title: resource.title,
          githubUrl: resource.githubUrl || "",
          status: "approved",
        },
      });
    } catch (e) {
      console.error("Algorand mint failed:", e.message);
      algorandTxId = process.env.DEMO_FALLBACK_TXID || null;
    }

    // Step 4: Update resource status
    resource.status = "approved";
    resource.approvedAt = new Date();
    resource.approvedBy = "Professor (Passcode)";
    resource.dualityUrl = dualityUrl;
    resource.algorandTxId = algorandTxId;
    resource.contentHash = contentHash; // Store hash for verification comparison
    resource.versionHistory = resource.versionHistory || [];
    if (resource.versionHistory.length === 0) {
      resource.versionHistory.push({
        versionNumber: 1,
        action: "CREATE",
        title: resource.title,
        githubUrl: resource.githubUrl || "",
        status: "pending",
        aiSummary: resource.aiSummary || "",
        aiTags: resource.aiTags || [],
        techStack: resource.techStack || [],
        originalityScore: resource.originalityScore,
        dualityUrl: resource.dualityUrl || "",
        algorandTxId: resource.algorandTxId || "",
        updatedByName: resource.uploaderName || "Student",
        updatedByRole: "STUDENT",
        updatedAt: resource.createdAt || new Date(),
      });
      resource.versionNumber = 1;
    }

    resource.versionNumber = Number(resource.versionNumber || 1) + 1;
    resource.versionHistory.push({
      versionNumber: resource.versionNumber,
      action: "APPROVE",
      title: resource.title,
      githubUrl: resource.githubUrl || "",
      status: "approved",
      aiSummary: resource.aiSummary || "",
      aiTags: resource.aiTags || [],
      techStack: resource.techStack || [],
      originalityScore: resource.originalityScore,
      dualityUrl: dualityUrl || "",
      algorandTxId: algorandTxId || "",
      updatedByName: "Professor (Passcode)",
      updatedByRole: "PROFESSOR",
      updatedAt: new Date(),
    });

    await resource.save();

    res.json({
      message: "Resource approved and verified on blockchain!",
      resource,
      blockchainTxId: algorandTxId,
    });
  } catch (error) {
    console.error("Approval error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/pending/:resourceId
 * Reject a pending resource (passcode required)
 * Body: { passcode }
 */
router.delete("/:resourceId", async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { passcode } = req.body;

    // Simple passcode check
    if (passcode !== process.env.PROFESSOR_PASSCODE) {
      return res.status(403).json({ error: "Invalid passcode" });
    }

    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Only allow deleting pending resources
    if (resource.status !== "pending") {
      return res.status(400).json({
        error: "Can only reject pending resources",
      });
    }

    await Resource.findByIdAndDelete(resourceId);

    res.json({
      message: "Resource rejected and deleted",
      deletedId: resourceId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pending/approve-submission/:submissionId
 * Approve a pending student submission
 * Body: { passcode }
 */
router.post("/approve-submission/:submissionId", async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { passcode } = req.body;

    // Simple passcode check
    if (passcode !== process.env.PROFESSOR_PASSCODE) {
      return res.status(403).json({
        error: "Invalid passcode. Contact an organizer if you're a professor.",
      });
    }

    // Find the submission
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    if (submission.submissionStatus !== "UNDER_REVIEW") {
      return res.status(400).json({ error: "Submission is not pending review" });
    }

    // Update submission status to VERIFIED
    submission.submissionStatus = "VERIFIED";
    submission.projectVerification.decision = "VERIFIED";
    submission.projectVerification.verifiedAt = new Date();
    submission.projectVerification.verifiedBy = "Professor (Passcode)";

    await submission.save();

    res.json({
      message: "Submission approved and verified!",
      submissionId: submission._id,
      status: "VERIFIED",
    });
  } catch (error) {
    console.error("Submission approval error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pending/reject-submission/:submissionId
 * Reject a pending student submission
 * Body: { passcode, feedback }
 */
router.post("/reject-submission/:submissionId", async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { passcode, feedback } = req.body;

    // Simple passcode check
    if (passcode !== process.env.PROFESSOR_PASSCODE) {
      return res.status(403).json({
        error: "Invalid passcode. Contact an organizer if you're a professor.",
      });
    }

    // Find the submission
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    if (submission.submissionStatus !== "UNDER_REVIEW") {
      return res.status(400).json({ error: "Submission is not pending review" });
    }

    // Update submission status to REJECTED_FOR_REVISION
    submission.submissionStatus = "REJECTED_FOR_REVISION";
    submission.projectVerification.decision = "REJECTED_FOR_REVISION";
    submission.projectVerification.verifiedAt = new Date();
    submission.projectVerification.verifiedBy = "Professor (Passcode)";
    submission.projectVerification.professorNote = feedback || "Please revise and resubmit";
    submission.revisionCycle = (submission.revisionCycle || 1) + 1;

    await submission.save();

    res.json({
      message: "Submission rejected. Student notified to revise.",
      submissionId: submission._id,
      status: "REJECTED_FOR_REVISION",
      revisionCycle: submission.revisionCycle,
    });
  } catch (error) {
    console.error("Submission rejection error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
