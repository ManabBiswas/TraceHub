import jwt from "jsonwebtoken";
import User from "../models/User.js";

const createAuthResponse = (user) => ({
  _id: user._id,
  email: user.email,
  name: user.name,
  role: user.role,
  department: user.department,
  profilePicture: user.profilePicture,
  teacherSubscription: user.teacherSubscription,
});

export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        error: "Missing required fields: email, password, name",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        error: "Email already registered",
      });
    }

    const user = new User({
      email,
      password,
      name,
      role: "STUDENT",
      isVerified: true,
    });

    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: createAuthResponse(user),
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const registerTeacher = async (req, res) => {
  try {
    const { email, password, name, department, monthlyFee } = req.body;

    if (!email || !password || !name || !department) {
      return res.status(400).json({
        error: "Missing required fields: email, password, name, department",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        error: "Email already registered",
      });
    }

    const fee = Number(monthlyFee ?? process.env.TEACHER_MONTHLY_FEE ?? 99);
    const now = new Date();
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    const teacher = await User.create({
      email,
      password,
      name,
      department,
      role: "PROFESSOR",
      isVerified: true,
      teacherSubscription: {
        status: "ACTIVE",
        amount: fee,
        currency: "INR",
        interval: "monthly",
        startedAt: now,
        nextBillingDate,
        lastPaymentAt: now,
      },
    });

    const token = jwt.sign({ userId: teacher._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(201).json({
      message: "Teacher registered with active monthly subscription",
      token,
      user: createAuthResponse(teacher),
    });
  } catch (error) {
    console.error("Register teacher error:", error);
    return res.status(500).json({ error: error.message });
  }
};

const performLogin = async (req, res, expectedRole = null) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Missing email or password",
    });
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res.status(401).json({
      error: "Invalid email or password",
    });
  }

  if (expectedRole && user.role !== expectedRole) {
    const roleLabel = expectedRole === "PROFESSOR" ? "teacher" : "student";
    return res.status(403).json({
      error: `This account is ${user.role}. Please use ${roleLabel} login.`,
    });
  }

  if (user.isAccountLocked()) {
    return res.status(403).json({
      error: "Account is locked. Please try again later.",
    });
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
    }
    await user.save();
    return res.status(401).json({
      error: "Invalid email or password",
    });
  }

  user.loginAttempts = 0;
  user.lockUntil = null;
  user.lastLogin = new Date();
  await user.save();

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  return res.status(200).json({
    message: "Login successful",
    token,
    user: createAuthResponse(user),
  });
};

export const login = async (req, res) => {
  try {
    return await performLogin(req, res);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const loginStudent = async (req, res) => {
  try {
    return await performLogin(req, res, "STUDENT");
  } catch (error) {
    console.error("Student login error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const loginTeacher = async (req, res) => {
  try {
    return await performLogin(req, res, "PROFESSOR");
  } catch (error) {
    console.error("Teacher login error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    return res.json({ user: createAuthResponse(req.user) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const renewTeacherSubscription = async (req, res) => {
  try {
    if (req.user.role !== "PROFESSOR") {
      return res
        .status(403)
        .json({ error: "Only teachers can renew subscription" });
    }

    const now = new Date();
    const baseDate =
      req.user.teacherSubscription?.nextBillingDate &&
      req.user.teacherSubscription.nextBillingDate > now
        ? new Date(req.user.teacherSubscription.nextBillingDate)
        : now;

    baseDate.setMonth(baseDate.getMonth() + 1);

    req.user.teacherSubscription = {
      ...req.user.teacherSubscription,
      status: "ACTIVE",
      amount:
        req.user.teacherSubscription?.amount ||
        Number(process.env.TEACHER_MONTHLY_FEE ?? 99),
      currency: req.user.teacherSubscription?.currency || "INR",
      interval: "monthly",
      startedAt: req.user.teacherSubscription?.startedAt || now,
      nextBillingDate: baseDate,
      lastPaymentAt: now,
    };

    await req.user.save();

    return res.json({
      message: "Subscription renewed successfully",
      teacherSubscription: req.user.teacherSubscription,
    });
  } catch (error) {
    console.error("Renew subscription error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// export const getCurrentUser = async (req, res) => {
//   try {
//     res.json({
//       user: {
//         _id: req.user._id,
//         email: req.user.email,
//         name: req.user.name,
//         role: req.user.role,
//         department: req.user.department,
//         profilePicture: req.user.profilePicture,
//         managedDepartments: req.user.managedDepartments,
//         lastLogin: req.user.lastLogin,
//         createdAt: req.user.createdAt,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// export const forgotPassword = async (req, res) => {
//   try {
//     const { email, newPassword } = req.body;

//     if (!email || !newPassword) {
//       return res.status(400).json({
//         error: "Email and newPassword are required",
//       });
//     }

//     if (newPassword.length < 8) {
//       return res.status(400).json({
//         error: "Password must be at least 8 characters",
//       });
//     }

//     const user = await User.findOne({ email }).select("+password");
//     if (!user) {
//       return res.status(404).json({
//         error: "No account found with this email",
//       });
//     }

//     user.password = newPassword;
//     user.loginAttempts = 0;
//     user.lockUntil = null;
//     await user.save();

//     res.json({
//       message: "Password reset successful. You can now login.",
//     });
//   } catch (error) {
//     console.error("Forgot password error:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

// export const updateProfilePicture = async (req, res) => {
//   try {
//     const { profilePicture } = req.body;

//     if (typeof profilePicture !== "string" || profilePicture.length === 0) {
//       return res.status(400).json({
//         error: "profilePicture is required",
//       });
//     }

//     if (!profilePicture.startsWith("data:image/")) {
//       return res.status(400).json({
//         error: "Invalid image format",
//       });
//     }

//     if (profilePicture.length > 2_000_000) {
//       return res.status(400).json({
//         error: "Image too large. Please use a smaller image.",
//       });
//     }

//     req.user.profilePicture = profilePicture;
//     await req.user.save();

//     res.json({
//       message: "Profile picture updated",
//       user: {
//         _id: req.user._id,
//         email: req.user.email,
//         name: req.user.name,
//         role: req.user.role,
//         department: req.user.department,
//         profilePicture: req.user.profilePicture,
//       },
//     });
//   } catch (error) {
//     console.error("Profile picture update error:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

// export const promoteUser = async (req, res) => {
//   try {
//     const { userId, newRole, department } = req.body;

//     if (!userId || !newRole || !["PROFESSOR", "HOD"].includes(newRole)) {
//       return res.status(400).json({
//         error: "Invalid userId or newRole. newRole must be PROFESSOR or HOD",
//       });
//     }

//     if (!department) {
//       return res.status(400).json({
//         error: "Department is required for Professor/HOD role",
//       });
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     user.role = newRole;
//     user.department = department;
//     if (newRole === "HOD") {
//       user.managedDepartments = [department];
//     }
//     await user.save();

//     res.json({
//       message: `User promoted to ${newRole}`,
//       user: {
//         _id: user._id,
//         email: user.email,
//         name: user.name,
//         role: user.role,
//         department: user.department,
//       },
//     });
//   } catch (error) {
//     console.error("Promote error:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

// export const revokeUserPrivileges = async (req, res) => {
//   try {
//     const { userId } = req.body;

//     if (!userId) {
//       return res.status(400).json({ error: "userId is required" });
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     if (user.role !== "PROFESSOR") {
//       return res.status(400).json({
//         error: "Can only revoke upload privileges from Professors",
//       });
//     }

//     user.role = "STUDENT";
//     user.department = null;
//     await user.save();

//     res.json({
//       message: "User upload privileges revoked",
//       user: {
//         _id: user._id,
//         email: user.email,
//         name: user.name,
//         role: user.role,
//       },
//     });
//   } catch (error) {
//     console.error("Revoke error:", error);
//     res.status(500).json({ error: error.message });
//   }
// };
