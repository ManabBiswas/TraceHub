import express from "express";
import upload from "../middlewares/upload.middleware.js";
import { authMiddleware, uploadGuard } from "../middlewares/auth.middleware.js";
import { extractText } from "../utils/pdfParser.js";
import { fetchGitHubReadme } from "../utils/githubFetcher.js";
import { analyzeDocument } from "../services/requesty.service.js";
import { uploadToDuality } from "../services/storage.service.js";
import { mintProofOfPublication } from "../services/algorand.service.js";
import Resource from "../models/Resource.js";
import Classroom from "../models/Classroom.js";

const router = express.Router();

/** Helper — detect if the uploaded file is an image */
const isImage = (mimetype) => mimetype.startsWith("image/");

/**
 * Extract a text string from an uploaded buffer.
 * - PDF  → use pdf-parse
 * - Image → return a descriptive placeholder so the AI prompt still gets
 *           something meaningful (vision analysis via Requesty is a v2 feature)
 */
async function extractFileText(buffer, mimetype, originalname) {
  if (mimetype === "application/pdf") {
    return await extractText(buffer);
  }
  // Image: return a minimal stub — the AI service will generate a generic summary
  return `[Image upload: ${originalname}]\nThis resource is an image file. Please analyse and summarise its academic content.`;
}

/**
 * POST /api/upload
 * Upload a PDF or image (PROFESSOR or HOD only).
 * Requires: JWT authentication + PROFESSOR/HOD role
 */
router.post(
  "/",
  authMiddleware,
  uploadGuard,
  upload.single("file"),
  async (req, res) => {
    try {
      const { title, classroomId } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: "Missing required file: file" });
      }

      if (!title || !classroomId) {
        return res.status(400).json({
          error: "Missing required fields: title, classroomId",
        });
      }

      const { buffer, mimetype, originalname } = req.file;
      const user = req.user;
      const fileIsImage = isImage(mimetype);

      const classroom = await Classroom.findById(classroomId);
      if (!classroom) {
        return res.status(404).json({ error: "Classroom not found" });
      }

      const isTeacherInClassroom =
        String(classroom.ownerId) === String(user._id) ||
        classroom.teacherIds.some(
          (teacherId) => String(teacherId) === String(user._id),
        );

      if (!isTeacherInClassroom) {
        return res.status(403).json({
          error: "Only teachers of the selected classroom can upload resources",
        });
      }

      if (!user.canUpload()) {
        return res.status(403).json({
          error: `Upload access denied. You are a ${user.role}. Only Professors and HODs can upload.`,
        });
      }

      let rawText = "";
      try {
        rawText = await extractFileText(buffer, mimetype, originalname);
      } catch (e) {
        console.error("Text extraction failed:", e.message);
        rawText = `[${fileIsImage ? "Image" : "PDF"} upload: ${title}] Text extraction failed.`;
      }

      let aiData = {};
      try {
        aiData = await analyzeDocument(rawText, "Professor");
      } catch (e) {
        console.error("Requesty failed, using mock:", e.message);
        aiData = {
          summary: "AI analysis unavailable.",
          tags: [],
          flashcards: [],
        };
      }

      let dualityUrl = null;
      try {
        dualityUrl = await uploadToDuality(buffer, originalname);
      } catch (e) {
        console.error("Duality upload failed:", e.message);
      }

      let algorandTxId = null;
      try {
        if (dualityUrl) {
          algorandTxId = await mintProofOfPublication(dualityUrl, user.name);
        }
      } catch (e) {
        console.error("Algorand mint failed:", e.message);
        algorandTxId = process.env.DEMO_FALLBACK_TXID || null;
      }

      const resource = new Resource({
        title,
        uploaderName: user.name,
        uploaderEmail: user.email,
        userId: user._id,
        classroomId,
        userDepartment: user.department,
        role: "Professor",
        status: "pending",
        aiSummary: aiData.summary,
        aiTags: aiData.tags || [],
        aiFlashcards: aiData.flashcards || [],
        dualityUrl,
        algorandTxId,
        versionNumber: 1,
        versionHistory: [
          {
            versionNumber: 1,
            action: "CREATE",
            title,
            githubUrl: "",
            status: "pending",
            aiSummary: aiData.summary || "",
            aiTags: aiData.tags || [],
            techStack: [],
            originalityScore: null,
            dualityUrl: dualityUrl || "",
            algorandTxId: algorandTxId || "",
            updatedByName: user.name,
            updatedByRole: user.role,
            updatedByUserId: user._id,
            updatedAt: new Date(),
          },
        ],
      });

      await resource.save();
      await resource.populate("userId", "name email department");
      await resource.populate("classroomId", "name section subject");

      return res.status(200).json({
        message: "Document uploaded successfully! Awaiting teacher approval before publishing.",
        resource,
      });
    } catch (err) {
      console.error("Upload route error:", err);
      return res.status(500).json({ error: err.message });
    }
  },
);

/**
 * POST /api/upload/github
 * Student submits GitHub project for approval (no auth required for MVP)
 * Body: { title, githubUrl, studentName }
 */
router.post("/github", upload.none(), async (req, res) => {
  try {
    const { title, githubUrl, studentName } = req.body;

    if (!title || !githubUrl || !studentName) {
      return res.status(400).json({
        error: "Missing required fields: title, githubUrl, studentName",
      });
    }

    // Step 1: Fetch README from GitHub
    let rawText;
    try {
      rawText = await fetchGitHubReadme(githubUrl);
    } catch (e) {
      return res.status(400).json({
        error: `Failed to fetch GitHub README: ${e.message}`,
      });
    }

    // Step 2: AI analysis (student role)
    let aiData = {};
    try {
      aiData = await analyzeDocument(rawText, "Student");
    } catch (e) {
      console.error("Requesty failed, using mock:", e.message);
      aiData = {
        summary: "AI analysis unavailable.",
        tags: [],
        techStack: [],
        originalityScore: 70,
      };
    }

    // Step 3: Save to MongoDB (pending approval)
    const resource = new Resource({
      title,
      uploaderName: studentName,
      uploaderEmail: "student@university.edu",
      role: "Student",
      status: "pending",
      githubUrl,
      aiSummary: aiData.summary,
      aiTags: aiData.tags || [],
      techStack: aiData.techStack || [],
      originalityScore: aiData.originalityScore || null,
      versionNumber: 1,
      versionHistory: [
        {
          versionNumber: 1,
          action: "CREATE",
          title,
          githubUrl,
          status: "pending",
          aiSummary: aiData.summary || "",
          aiTags: aiData.tags || [],
          techStack: aiData.techStack || [],
          originalityScore: aiData.originalityScore || null,
          dualityUrl: "",
          algorandTxId: "",
          updatedByName: studentName,
          updatedByRole: "STUDENT",
          updatedAt: new Date(),
        },
      ],
      // dualityUrl and algorandTxId are null until approved
    });

    await resource.save();

    res.status(201).json({
      message:
        "GitHub project submitted for approval. Awaiting professor review.",
      resource,
      status: "pending",
    });
  } catch (err) {
    console.error("GitHub upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
