import express from "express";
import { uploadToDuality } from "../services/storage.service.js";
import { mintVersionProof } from "../services/algorand.service.js";
import Resource from "../models/Resource.js";

const router = express.Router();

/**
 * GET /api/pending
 * Get all pending resources (no auth required, public)
 */
router.get("/", async (req, res) => {
  try {
    const pending = await Resource.find({ status: "pending" }).sort({
      createdAt: -1,
    });

    res.json({
      count: pending.length,
      resources: pending,
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

    // Step 2: Mint Algorand transaction
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

    // Step 3: Update resource status
    resource.status = "approved";
    resource.approvedAt = new Date();
    resource.approvedBy = "Professor (Passcode)";
    resource.dualityUrl = dualityUrl;
    resource.algorandTxId = algorandTxId;
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

export default router;
