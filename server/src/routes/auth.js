import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { authMiddleware, adminGuard } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user (Student by default)
 * Body: { email, password, name }
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        error: "Missing required fields: email, password, name"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters"
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        error: "Email already registered"
      });
    }

    // Create user (STUDENT role by default)
    const user = new User({
      email,
      password,
      name,
      role: "STUDENT", // Default role
      isVerified: true // For MVP, auto-verify (in production, use email verification)
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/login
 * Login user
 * Body: { email, password }
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Missing email or password"
      });
    }

    // Find user and include password field (normally hidden)
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      return res.status(403).json({
        error: "Account is locked. Please try again later."
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment failed login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 mins
      }
      await user.save();
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile (requires auth)
 */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    res.json({
      user: {
        _id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        department: req.user.department,
        profilePicture: req.user.profilePicture,
        managedDepartments: req.user.managedDepartments,
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/forgot-password
 * Reset password using email (MVP flow)
 * Body: { email, newPassword }
 */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        error: "Email and newPassword are required"
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters"
      });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(404).json({
        error: "No account found with this email"
      });
    }

    user.password = newPassword;
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    res.json({
      message: "Password reset successful. You can now login."
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/auth/profile-picture
 * Update current user profile picture (base64 data URL)
 * Body: { profilePicture }
 */
router.patch("/profile-picture", authMiddleware, async (req, res) => {
  try {
    const { profilePicture } = req.body;

    if (typeof profilePicture !== "string" || profilePicture.length === 0) {
      return res.status(400).json({
        error: "profilePicture is required"
      });
    }

    if (!profilePicture.startsWith("data:image/")) {
      return res.status(400).json({
        error: "Invalid image format"
      });
    }

    if (profilePicture.length > 2_000_000) {
      return res.status(400).json({
        error: "Image too large. Please use a smaller image."
      });
    }

    req.user.profilePicture = profilePicture;
    await req.user.save();

    res.json({
      message: "Profile picture updated",
      user: {
        _id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        department: req.user.department,
        profilePicture: req.user.profilePicture
      }
    });
  } catch (error) {
    console.error("Profile picture update error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/promote
 * Promote a user to Professor or HOD (HOD only)
 * Body: { userId, newRole, department }
 */
router.post("/promote", authMiddleware, adminGuard, async (req, res) => {
  try {
    const { userId, newRole, department } = req.body;

    if (!userId || !newRole || !["PROFESSOR", "HOD"].includes(newRole)) {
      return res.status(400).json({
        error: "Invalid userId or newRole. newRole must be PROFESSOR or HOD"
      });
    }

    if (!department) {
      return res.status(400).json({
        error: "Department is required for Professor/HOD role"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update user role
    user.role = newRole;
    user.department = department;
    if (newRole === "HOD") {
      user.managedDepartments = [department];
    }
    await user.save();

    res.json({
      message: `User promoted to ${newRole}`,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error("Promote error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/revoke
 * Revoke upload privileges (HOD only)
 * Body: { userId }
 */
router.post("/revoke", authMiddleware, adminGuard, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== "PROFESSOR") {
      return res.status(400).json({
        error: "Can only revoke upload privileges from Professors"
      });
    }

    // Demote back to student
    user.role = "STUDENT";
    user.department = null;
    await user.save();

    res.json({
      message: "User upload privileges revoked",
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Revoke error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
