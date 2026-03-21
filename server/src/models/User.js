import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema({
  // Identity
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please provide a valid email",
    ],
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false, // Don't return password by default
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },

  // Profile
  profilePicture: {
    type: String,
    default: null,
  },

  // Role-based hierarchy
  role: {
    type: String,
    enum: ["STUDENT", "PROFESSOR", "HOD"],
    required: true,
    default: "STUDENT",
  },

  // Department affiliation
  department: {
    type: String,
    required: function () {
      return this.role === "PROFESSOR" || this.role === "HOD";
    },
  },

  // For HOD: manages which departments
  managedDepartments: [
    {
      type: String,
    },
  ],

  // Account status
  isVerified: {
    type: Boolean,
    default: false,
  },
  teacherSubscription: {
    status: {
      type: String,
      enum: ["NONE", "ACTIVE", "PAST_DUE", "CANCELED"],
      default: "NONE",
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    interval: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    startedAt: {
      type: Date,
      default: null,
    },
    nextBillingDate: {
      type: Date,
      default: null,
    },
    lastPaymentAt: {
      type: Date,
      default: null,
    },
  },
  verificationToken: String,
  verificationTokenExpiry: Date,

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // Audit
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date, // Account lock after failed login attempts
});

// Hash password before save
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to check if account is locked
UserSchema.methods.isAccountLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Method to check role hierarchy (can they upload?)
UserSchema.methods.canUpload = function () {
  return this.role === "PROFESSOR" || this.role === "HOD";
};

// Method to check if user is admin
UserSchema.methods.isAdmin = function () {
  return this.role === "HOD";
};

// Method to check if user can manage a department
UserSchema.methods.canManageDepartment = function (dept) {
  if (this.role === "HOD") {
    return this.managedDepartments.includes(dept);
  }
  return false;
};

UserSchema.methods.hasActiveTeacherSubscription = function () {
  if (this.role !== "PROFESSOR") {
    return true;
  }

  return (
    this.teacherSubscription?.status === "ACTIVE" &&
    this.teacherSubscription?.nextBillingDate &&
    this.teacherSubscription.nextBillingDate > new Date()
  );
};

export default mongoose.model("User", UserSchema);
