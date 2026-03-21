import express from "express";
import { authMiddleware, roleGuard } from "../middlewares/auth.middleware.js";
import submissionUpload from "../middlewares/submissionUpload.middleware.js";
import {
  saveProjectDraft,
  submitProjectFinal,
  verifyProject,
  rejectForRevision,
  permanentlyRejectProject,
  getMyProjectSubmission,
  getProjectAnalysisReport,
} from "../controllers/projectSubmission.controller.js";

const router = express.Router({ mergeParams: true });

// ── Student routes ─────────────────────────────────────────────────────────
router.get("/me", authMiddleware, roleGuard("STUDENT"), getMyProjectSubmission);

router.post(
  "/draft",
  authMiddleware,
  roleGuard("STUDENT"),
  submissionUpload.array("files", 1),
  saveProjectDraft
);

router.post("/final", authMiddleware, roleGuard("STUDENT"), submitProjectFinal);

// ── Professor routes ───────────────────────────────────────────────────────
router.post(
  "/:submissionId/verify",
  authMiddleware,
  roleGuard("PROFESSOR", "HOD"),
  verifyProject
);

router.post(
  "/:submissionId/reject-for-revision",
  authMiddleware,
  roleGuard("PROFESSOR", "HOD"),
  rejectForRevision
);

router.post(
  "/:submissionId/reject-permanently",
  authMiddleware,
  roleGuard("PROFESSOR", "HOD"),
  permanentlyRejectProject
);

router.get(
  "/:submissionId/analysis",
  authMiddleware,
  roleGuard("PROFESSOR", "HOD"),
  getProjectAnalysisReport
);

export default router;
