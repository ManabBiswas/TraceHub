import mongoose from "mongoose";

// ── Version file metadata (lightweight, no binary data) ───────────────────────
const SubmissionVersionFileSchema = new mongoose.Schema(
  {
    fileName: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0, min: 0 },
    hasBinaryData: { type: Boolean, default: false },
  },
  { _id: false }
);

// ── Version snapshot schema (tracks each significant event) ──────────────────
const SubmissionVersionSchema = new mongoose.Schema(
  {
    versionNumber: { type: Number, required: true, min: 1 },

    // What triggered this version snapshot
    action: {
      type: String,
      enum: [
        "DRAFT_SAVE",
        "FINAL_SUBMIT",
        "REJECTED_FOR_REVISION",
        "REVISION_DRAFT",
        "REVISION_FINAL",
        "VERIFIED",
        "GRADE",
        "CREATE",
        "UPDATE",
      ],
      required: true,
    },

    // Content snapshot
    contentType: {
      type: String,
      enum: ["LINK", "FILE", "BOTH", "TEXT"],
      default: "BOTH",
    },
    githubUrl: { type: String, default: "" },
    link: { type: String, default: "" },
    text: { type: String, default: "" },
    files: { type: [SubmissionVersionFileSchema], default: [] },

    // Professor feedback
    professorNote: { type: String, default: "" },
    marks: { type: Number, default: null },
    feedback: { type: String, default: "" },

    // Blockchain proof
    algorandTxId: { type: String, default: "" },
    contentHash: { type: String, default: "" },

    // Who made this change
    updatedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedByName: { type: String, default: "" },
    updatedByRole: { type: String, default: "" },
    updatedAt: { type: Date, default: Date.now },

    // Revision cycle tracking
    revisionCycle: { type: Number, default: 1 },
  },
  { _id: false }
);

// ── Binary file storage (for PDFs) ─────────────────────────────────────────
const SubmissionFileSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
      min: 1,
    },
    data: {
      type: Buffer,
      required: true,
    },
  },
  { _id: false }
);

// ── Main submission schema ─────────────────────────────────────────────────
const SubmissionSchema = new mongoose.Schema(
  {
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassPost",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Core submission status machine (for PROJECT assignments) ─────────────
    submissionStatus: {
      type: String,
      enum: [
        "DRAFT",
        "FINAL_SUBMITTED",
        "UNDER_REVIEW",
        "REJECTED_FOR_REVISION",
        "VERIFIED",
        "PERMANENTLY_REJECTED",
        "TURNED_IN",
        "RETURNED",
      ],
      default: "DRAFT",
    },

    // Tracks revision cycles (incremented when professor rejects)
    revisionCycle: { type: Number, default: 1 },

    // ── Current version content (always reflects latest) ───────────────────
    contentType: {
      type: String,
      enum: ["LINK", "FILE", "BOTH", "TEXT"],
      default: "BOTH",
    },
    link: { type: String, trim: true, default: "" },
    githubUrl: { type: String, trim: true, default: "" },
    text: { type: String, trim: true, default: "" },
    files: {
      type: [SubmissionFileSchema],
      default: [],
    },

    // ── Grading fields (for non-project assignments) ──────────────────────
    marks: { type: Number, min: 0, default: null },
    feedback: { type: String, trim: true, default: "" },

    // ── PROJECT-specific fields ──────────────────────────────────────────
    metadataId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectMetadata",
      default: null,
    },

    // Verification lifecycle
    projectVerification: {
      decision: {
        type: String,
        enum: ["PENDING", "VERIFIED", "REJECTED_FOR_REVISION", "PERMANENTLY_REJECTED"],
        default: "PENDING",
      },
      verifiedBy: { type: String },
      verifiedAt: { type: Date },
      professorNote: { type: String, default: "" },
      algorandVerificationTxId: { type: String },
      contentHash: { type: String },
    },

    // AI pipeline state
    aiAnalysisStatus: {
      type: String,
      enum: ["NOT_STARTED", "PROCESSING", "READY", "FAILED"],
      default: "NOT_STARTED",
    },

    // Public gallery visibility
    isPublic: { type: Boolean, default: false },
    publicApprovedAt: { type: Date },

    // ── Version history (all significant events) ──────────────────────────
    versionNumber: { type: Number, min: 1, default: 1 },
    versionHistory: { type: [SubmissionVersionSchema], default: [] },

    // Legacy fields (for backward compatibility with non-project submissions)
    status: {
      type: String,
      enum: ["DRAFT", "TURNED_IN", "RETURNED"],
      default: "TURNED_IN",
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
SubmissionSchema.index({ postId: 1, studentId: 1 }, { unique: true });
SubmissionSchema.index({ classroomId: 1, createdAt: -1 });
SubmissionSchema.index({ submissionStatus: 1 });
SubmissionSchema.index({ isPublic: 1, publicApprovedAt: -1 });

export default mongoose.model("Submission", SubmissionSchema);
