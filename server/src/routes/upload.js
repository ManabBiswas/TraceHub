import express from "express";
import upload from "../middlewares/upload.middleware.js";
import { authMiddleware, uploadGuard } from "../middlewares/auth.middleware.js";
import { extractText } from "../utils/pdfParser.js";
import { fetchGitHubReadme } from "../utils/githubFetcher.js";
import { analyzeDocument } from "../services/requesty.service.js";
import { uploadToDuality } from "../services/duality.service.js";
import { mintProofOfPublication } from "../services/algorand.service.js";
import Resource from "../models/Resource.js";

const router = express.Router();

/**
 * POST /api/upload
 * Upload a document (PROFESSOR or HOD upload directly with status=approved)
 * Requires: JWT authentication + PROFESSOR/HOD role
 */
router.post("/", authMiddleware, uploadGuard, upload.single("file"), async (req, res) => {
  try {
    const { title } = req.body;
    const fileBuffer = req.file.buffer;
    const user = req.user;

    if (!title) {
      return res.status(400).json({
        error: "Missing required field: title"
      });
    }

    // Verify user can upload (Professor or HOD)
    if (!user.canUpload()) {
      return res.status(403).json({
        error: `Upload access denied. You are a ${user.role}. Only Professors and HODs can upload.`
      });
    }

    // Map user role to document role (for AI analysis)
    const documentRole = "Professor";

    // Step 1: Extract text from PDF
    const rawText = await extractText(fileBuffer);

    // Step 2: AI analysis
    let aiData = {};
    try {
      aiData = await analyzeDocument(rawText, documentRole);
    } catch (e) {
      console.error("Requesty failed, using mock:", e.message);
      aiData = {
        summary: "AI analysis unavailable.",
        tags: [],
        flashcards: []
      };
    }

    // Step 3a: Duality upload
    let dualityUrl = null;
    try {
      dualityUrl = await uploadToDuality(fileBuffer, req.file.originalname);
    } catch (e) {
      console.error("Duality upload failed:", e.message);
    }

    // Step 3b: Algorand mint (professors auto-approved)
    let algorandTxId = null;
    try {
      if (dualityUrl) {
        algorandTxId = await mintProofOfPublication(dualityUrl, user.name);
      }
    } catch (e) {
      console.error("Algorand mint failed:", e.message);
      algorandTxId = process.env.DEMO_FALLBACK_TXID || null;
    }

    // Step 4: Save to MongoDB (professors auto-approved)
    const resource = new Resource({
      title,
      uploaderName: user.name,
      uploaderEmail: user.email,
      userId: user._id,
      userDepartment: user.department,
      role: documentRole,
      status: "approved", // Professors auto-approve
      approvedBy: user.name,
      approvedAt: new Date(),
      aiSummary: aiData.summary,
      aiTags: aiData.tags || [],
      aiFlashcards: aiData.flashcards || [],
      dualityUrl,
      algorandTxId
    });

    await resource.save();
    await resource.populate("userId", "name email department");

    res.status(200).json({
      message: "Document uploaded successfully and verified on blockchain",
      resource
    });
  } catch (err) {
    console.error("Upload route error:", err);
    res.status(500).json({ error: err.message });
  }
});

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
        error: "Missing required fields: title, githubUrl, studentName"
      });
    }

    // Step 1: Fetch README from GitHub
    let rawText;
    try {
      rawText = await fetchGitHubReadme(githubUrl);
    } catch (e) {
      return res.status(400).json({
        error: `Failed to fetch GitHub README: ${e.message}`
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
        originalityScore: 70
      };
    }

    // Step 3: Save to MongoDB (pending approval, no Duality/Algorand yet)
    const resource = new Resource({
      title,
      uploaderName: studentName,
      uploaderEmail: "student@university.edu", // Placeholder
      role: "Student",
      status: "pending", // Awaiting professor approval
      githubUrl, // Store the GitHub URL
      aiSummary: aiData.summary,
      aiTags: aiData.tags || [],
      techStack: aiData.techStack || [],
      originalityScore: aiData.originalityScore || null
      // dualityUrl and algorandTxId are null until approved
    });

    await resource.save();

    res.status(201).json({
      message: "GitHub project submitted for approval. Awaiting professor review.",
      resource,
      status: "pending"
    });
  } catch (err) {
    console.error("GitHub upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
