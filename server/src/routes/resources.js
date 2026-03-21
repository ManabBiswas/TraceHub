import express from "express";
import Resource from "../models/Resource.js";

const router = express.Router();

/**
 * GET /api/resources
 * Fetch all resources, optionally filtered by userId query param.
 */
router.get("/", async (req, res) => {
  try {
    const filter = req.query.userId ? { userId: req.query.userId } : {};
    const resources = await Resource.find(filter)
      .populate("userId", "name email department")
      .sort({ createdAt: -1 });

    return res.json(resources);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/resources/:id
 * Fetch a single resource by id.
 */
router.get("/:id", async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id).populate(
      "userId",
      "name email department",
    );

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    return res.json(resource);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
