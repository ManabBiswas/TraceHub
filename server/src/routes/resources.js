import express from "express";
import Resource from "../models/Resource.js";
import Classroom from "../models/Classroom.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

const isValidObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ""));

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
    const canAccess =
      String(classroom.ownerId) === userId ||
      classroom.teacherIds.some((teacherId) => String(teacherId) === userId) ||
      classroom.studentIds.some((studentId) => String(studentId) === userId);

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
