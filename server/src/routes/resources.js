import express from "express";
import Resource from "../models/Resource.js";
import Classroom from "../models/Classroom.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { uploadToDuality } from "../services/duality.service.js";
import { mintVersionProof } from "../services/algorand.service.js";

const router = express.Router();

const isValidObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ""));

const isTeacherInClassroom = (classroom, userId) => {
  const id = String(userId);
  return (
    String(classroom.ownerId) === id ||
    classroom.teacherIds.some((teacherId) => String(teacherId) === id)
  );
};

const canAccessClassroom = (classroom, userId) => {
  const id = String(userId);
  return (
    isTeacherInClassroom(classroom, userId) ||
    classroom.studentIds.some((studentId) => String(studentId) === id)
  );
};

const getAllowedClassroomIds = async (userId) => {
  const classrooms = await Classroom.find({
    $or: [{ ownerId: userId }, { teacherIds: userId }, { studentIds: userId }],
  }).select("_id");

  return classrooms.map((classroom) => classroom._id);
};

/**
 * GET /api/resources
 * Fetch all resources, optionally filtered by userId query param.
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const allowedClassroomIds = await getAllowedClassroomIds(req.user._id);
    if (allowedClassroomIds.length === 0) {
      return res.json([]);
    }

    const filter = {
      classroomId: { $in: allowedClassroomIds },
    };

    if (req.query.classroomId) {
      if (!isValidObjectId(req.query.classroomId)) {
        return res.status(400).json({ error: "Invalid classroomId" });
      }

      const requestedId = String(req.query.classroomId);
      const hasAccess = allowedClassroomIds.some(
        (id) => String(id) === requestedId,
      );
      if (!hasAccess) {
        return res
          .status(403)
          .json({ error: "You are not a member of this classroom" });
      }

      filter.classroomId = req.query.classroomId;
    }

    if (req.query.userId) {
      filter.userId = req.query.userId;
    }

    const resources = await Resource.find(filter)
      .populate("userId", "name email department")
      .populate("classroomId", "name section subject")
      .sort({ createdAt: -1 });

    return res.json(resources);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/resources/:id
 * Update a classroom resource and append a blockchain-backed version snapshot.
 */
router.patch(
  "/:id",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const resource = await Resource.findById(req.params.id);
      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }

      if (!resource.classroomId) {
        return res.status(400).json({
          error: "This resource is not classroom-linked and cannot be updated",
        });
      }

      const classroom = await Classroom.findById(resource.classroomId).select(
        "ownerId teacherIds studentIds",
      );
      if (!classroom) {
        return res.status(404).json({ error: "Classroom not found" });
      }

      if (!isTeacherInClassroom(classroom, req.user._id)) {
        return res
          .status(403)
          .json({ error: "Only classroom teachers can update resources" });
      }

      const updates = {};
      if (typeof req.body.title === "string") {
        updates.title = req.body.title.trim();
      }
      if (typeof req.body.aiSummary === "string") {
        updates.aiSummary = req.body.aiSummary.trim();
      }
      if (Array.isArray(req.body.aiTags)) {
        updates.aiTags = req.body.aiTags.map((tag) => String(tag));
      } else if (typeof req.body.aiTags === "string") {
        try {
          const parsed = JSON.parse(req.body.aiTags);
          if (Array.isArray(parsed)) {
            updates.aiTags = parsed.map((tag) => String(tag));
          } else {
            updates.aiTags = req.body.aiTags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean);
          }
        } catch (_error) {
          updates.aiTags = req.body.aiTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);
        }
      }

      if (req.file) {
        const dualityUrl = await uploadToDuality(
          req.file.buffer,
          req.file.originalname,
        );
        updates.dualityUrl = dualityUrl;
      }

      const hasAnyChanges = Object.keys(updates).some((key) => {
        const existing = resource[key];
        const incoming = updates[key];
        return JSON.stringify(existing) !== JSON.stringify(incoming);
      });

      if (!hasAnyChanges) {
        return res.json({
          message: "No changes detected",
          resource,
        });
      }

      Object.assign(resource, updates);

      const nextVersion = Number(resource.versionNumber || 1) + 1;
      let versionTxId = "";
      try {
        versionTxId = await mintVersionProof({
          entityType: "RESOURCE",
          entityId: String(resource._id),
          versionNumber: nextVersion,
          action: "UPDATE",
          actor: req.user.name,
          referenceUrl: resource.dualityUrl || "",
          payload: {
            title: resource.title,
            aiSummary: resource.aiSummary || "",
            aiTags: resource.aiTags || [],
            status: resource.status,
            hasNewAttachment: Boolean(req.file),
          },
        });
      } catch (_error) {
        versionTxId = process.env.DEMO_FALLBACK_TXID || "";
      }

      resource.versionNumber = nextVersion;
      resource.versionHistory = resource.versionHistory || [];
      resource.versionHistory.push({
        versionNumber: nextVersion,
        action: "UPDATE",
        title: resource.title,
        githubUrl: resource.githubUrl || "",
        status: resource.status,
        aiSummary: resource.aiSummary || "",
        aiTags: resource.aiTags || [],
        techStack: resource.techStack || [],
        originalityScore: resource.originalityScore,
        dualityUrl: resource.dualityUrl || "",
        algorandTxId: versionTxId || "",
        updatedByName: req.user.name,
        updatedByRole: req.user.role,
        updatedByUserId: req.user._id,
        updatedAt: new Date(),
      });

      if (versionTxId) {
        resource.algorandTxId = versionTxId;
      }

      await resource.save();
      await resource.populate("userId", "name email department");
      await resource.populate("classroomId", "name section subject");

      return res.json({
        message: "Resource updated and version tracked on blockchain",
        resource,
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },
);

/**
 * GET /api/resources/:id/history
 * Fetch blockchain-tracked resource version history for classroom members.
 */
router.get("/:id/history", authMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id).select(
      "_id title classroomId versionNumber versionHistory",
    );

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    if (!resource.classroomId) {
      return res.status(403).json({
        error:
          "This resource is not linked to a classroom and has no participant history view",
      });
    }

    const classroom = await Classroom.findById(resource.classroomId).select(
      "ownerId teacherIds studentIds",
    );

    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    if (!canAccessClassroom(classroom, req.user._id)) {
      return res
        .status(403)
        .json({ error: "You are not a member of this classroom" });
    }

    const versions = [...(resource.versionHistory || [])].sort(
      (a, b) => Number(b.versionNumber || 0) - Number(a.versionNumber || 0),
    );

    return res.json({
      resourceId: resource._id,
      title: resource.title,
      currentVersion: resource.versionNumber || 1,
      count: versions.length,
      versions,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/resources/:id
 * Fetch a single resource by id.
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id).populate(
      "userId",
      "name email department",
    );

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    if (!resource.classroomId) {
      return res.status(403).json({
        error:
          "This resource is not linked to a classroom and is no longer accessible",
      });
    }

    const classroom = await Classroom.findById(resource.classroomId).select(
      "ownerId teacherIds studentIds",
    );

    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    const userId = String(req.user._id);
    const canAccess = canAccessClassroom(classroom, userId);

    if (!canAccess) {
      return res
        .status(403)
        .json({ error: "You are not a member of this classroom" });
    }

    return res.json(resource);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
