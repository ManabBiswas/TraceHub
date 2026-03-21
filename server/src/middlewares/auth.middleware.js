import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Verify JWT token and attach user to request
 * Usage: app.use(authMiddleware) or app.get(route, authMiddleware, ...)
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const token =
      req.headers.authorization?.split(" ")[1] ||
      req.cookies.token;

    if (!token) {
      return res.status(401).json({
        error: "Unauthorized: No token provided"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    if (user.isAccountLocked()) {
      return res.status(403).json({
        error: "Account is locked due to multiple failed login attempts"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired"
      });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Invalid token"
      });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Role-based access control guard
 * Usage: app.post(route, authMiddleware, roleGuard("PROFESSOR", "HOD"), handler)
 */
export const roleGuard = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized: User not authenticated"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Only users with roles [ ${allowedRoles.join(", ")} ] can access this resource. Your role: ${req.user.role}`
      });
    }

    next();
  };
};

/**
 * Check if user can upload (PROFESSOR or HOD only)
 * Usage: app.post(route, authMiddleware, uploadGuard, handler)
 */
export const uploadGuard = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized: User not authenticated"
    });
  }

  if (!req.user.canUpload()) {
    return res.status(403).json({
      error: `Forbidden: Only Professors and HODs can upload documents. Your role: ${req.user.role}. Students have view-only access.`
    });
  }

  next();
};

/**
 * Check if user is HOD
 * Usage: app.delete(route, authMiddleware, adminGuard, handler)
 */
export const adminGuard = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized: User not authenticated"
    });
  }

  if (!req.user.isAdmin()) {
    return res.status(403).json({
      error: `Forbidden: Only HODs (administrators) can perform this action`
    });
  }

  next();
};

export default authMiddleware;
