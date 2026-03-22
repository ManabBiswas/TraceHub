import express from "express";
import { authMiddleware, roleGuard } from "../middlewares/auth.middleware.js";
import submissionUpload from "../middlewares/submissionUpload.middleware.js";
import {
  createClassroom,
  fetchClassrooms,
  joinClassroom,
  createPost,
  fetchClassroomPosts,
  fetchPostHistory,
  downloadPostAttachment,
  updatePost,
  submitLink,
  submitAssignment,
  fetchMySubmission,
  fetchPostSubmissions,
  fetchSubmissionHistory,
  downloadSubmissionFile,
  updateSubmission,
  getVerifiedProjects,
} from "../controllers/classrooms.controller.js";

const router = express.Router();

router.get("/", authMiddleware, fetchClassrooms);
router.post(
  "/",
  authMiddleware,
  roleGuard("PROFESSOR", "HOD"),
  createClassroom,
);
router.post("/join", authMiddleware, joinClassroom);

router.get("/:classroomId/posts", authMiddleware, fetchClassroomPosts);
router.get(
  "/:classroomId/posts/:postId/history",
  authMiddleware,
  fetchPostHistory,
);
router.get(
  "/:classroomId/posts/:postId/attachments/:attachmentIndex",
  authMiddleware,
  downloadPostAttachment,
);
router.post(
  "/:classroomId/posts",
  authMiddleware,
  roleGuard("PROFESSOR", "HOD"),
  submissionUpload.array("attachments", 5),
  createPost,
);
router.patch(
  "/:classroomId/posts/:postId",
  authMiddleware,
  roleGuard("PROFESSOR", "HOD"),
  submissionUpload.array("attachments", 5),
  updatePost,
);

router.post(
  "/:classroomId/posts/:postId/submissions/link",
  authMiddleware,
  roleGuard("STUDENT"),
  submitLink,
);
router.post(
  "/:classroomId/posts/:postId/submissions",
  authMiddleware,
  roleGuard("STUDENT"),
  submissionUpload.array("files", 5),
  submitAssignment,
);
router.get(
  "/:classroomId/posts/:postId/submissions/me",
  authMiddleware,
  roleGuard("STUDENT"),
  fetchMySubmission,
);
router.get(
  "/:classroomId/posts/:postId/submissions",
  authMiddleware,
  roleGuard("PROFESSOR", "HOD"),
  fetchPostSubmissions,
);
router.get(
  "/:classroomId/posts/:postId/submissions/:submissionId/history",
  authMiddleware,
  fetchSubmissionHistory,
);
router.get(
  "/:classroomId/posts/:postId/submissions/:submissionId/files/:fileIndex",
  authMiddleware,
  roleGuard("PROFESSOR", "HOD"),
  downloadSubmissionFile,
);
router.patch(
  "/:classroomId/posts/:postId/submissions/:submissionId",
  authMiddleware,
  roleGuard("PROFESSOR", "HOD"),
  updateSubmission,
);

// ── Verified Projects Gallery ─────────────────────────────────────────────
router.get(
  "/:classroomId/projects/verified",
  authMiddleware,
  getVerifiedProjects,
);

export default router;
