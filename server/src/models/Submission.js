import mongoose from "mongoose";

const SubmissionVersionFileSchema = new mongoose.Schema(
  {
    fileName: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0, min: 0 },
    hasBinaryData: { type: Boolean, default: false },
  },
  { _id: false },
);

const SubmissionVersionSchema = new mongoose.Schema(
  {
    versionNumber: { type: Number, required: true, min: 1 },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "GRADE"],
      required: true,
    },
    contentType: {
      type: String,
      enum: ["LINK", "FILE", "BOTH", "TEXT"],
      default: "LINK",
    },
    link: { type: String, default: "" },
    text: { type: String, default: "" },
    files: {
      type: [SubmissionVersionFileSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["DRAFT", "TURNED_IN", "RETURNED"],
      default: "TURNED_IN",
    },
    marks: { type: Number, default: null },
    feedback: { type: String, default: "" },
    updatedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedByName: { type: String, default: "" },
    updatedByRole: { type: String, default: "" },
    updatedAt: { type: Date, default: Date.now },
    algorandTxId: { type: String, default: "" },
  },
  { _id: false },
);

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
  { _id: false },
);

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
    contentType: {
      type: String,
      enum: ["LINK", "FILE", "BOTH", "TEXT"],
      default: "LINK",
    },
    link: {
      type: String,
      trim: true,
      default: "",
    },
    text: {
      type: String,
      trim: true,
      default: "",
    },
    files: {
      type: [SubmissionFileSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["DRAFT", "TURNED_IN", "RETURNED"],
      default: "TURNED_IN",
    },
    marks: {
      type: Number,
      min: 0,
      default: null,
    },
    feedback: {
      type: String,
      trim: true,
      default: "",
    },
    versionNumber: {
      type: Number,
      min: 1,
      default: 1,
    },
    versionHistory: {
      type: [SubmissionVersionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

SubmissionSchema.index({ postId: 1, studentId: 1 }, { unique: true });
SubmissionSchema.index({ classroomId: 1, createdAt: -1 });

export default mongoose.model("Submission", SubmissionSchema);
