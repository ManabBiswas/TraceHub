import express from "express";
import { authMiddleware, adminGuard } from "../middlewares/auth.middleware.js";
import {
  register,
  login,
  getCurrentUser,
  forgotPassword,
  updateProfilePicture,
  promoteUser,
  revokeUserPrivileges,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
// router.get("/me", authMiddleware, getCurrentUser);
// router.post("/forgot-password", forgotPassword);
// router.patch("/profile-picture", authMiddleware, updateProfilePicture);
// router.post("/promote", authMiddleware, adminGuard, promoteUser);
// router.post("/revoke", authMiddleware, adminGuard, revokeUserPrivileges);

export default router;
