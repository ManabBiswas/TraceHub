import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  register,
  login,
  loginStudent,
  loginTeacher,
  registerTeacher,
  getCurrentUser,
  renewTeacherSubscription,
  // forgotPassword,
  // updateProfilePicture,
  // promoteUser,
  // revokeUserPrivileges,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/register-teacher", registerTeacher);
router.post("/login", login);
router.post("/login/student", loginStudent);
router.post("/login/teacher", loginTeacher);
router.get("/me", authMiddleware, getCurrentUser);
router.post("/renew-subscription", authMiddleware, renewTeacherSubscription);
// router.post("/forgot-password", forgotPassword);
// router.patch("/profile-picture", authMiddleware, updateProfilePicture);
// router.post("/promote", authMiddleware, adminGuard, promoteUser);
// router.post("/revoke", authMiddleware, adminGuard, revokeUserPrivileges);

export default router;
