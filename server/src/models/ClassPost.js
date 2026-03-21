import mongoose from "mongoose";

const VersionAttachmentSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    fileName: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0, min: 0 },
    hasBinaryData: { type: Boolean, default: false },
    url: { type: String, default: "" },
  },
  { _id: false },
);

const ClassPostVersionSchema = new mongoose.Schema(
  {
    versionNumber: { type: Number, required: true, min: 1 },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE"],
      required: true,
    },
    title: { type: String, default: "" },
    body: { type: String, default: "" },
    type: {
      type: String,
      enum: ["ANNOUNCEMENT", "ASSIGNMENT"],
      default: "ANNOUNCEMENT",
    },
    dueDate: { type: Date, default: null },
    points: { type: Number, default: null },
    allowStudentSubmissions: { type: Boolean, default: true },
    allowedSubmissionTypes: {
      type: [String],
      enum: ["LINK", "FILE"],
      default: ["LINK", "FILE"],
    },
    attachments: {
      type: [VersionAttachmentSchema],
      default: [],
    },
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

const PostAttachmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },
    fileName: {
      type: String,
      trim: true,
      default: "",
    },
    mimeType: {
      type: String,
      trim: true,
      default: "",
    },
    size: {
      type: Number,
      min: 0,
      default: 0,
    },
    data: {
      type: Buffer,
      default: null,
    },
    url: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

const ClassPostSchema = new mongoose.Schema(
  {
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      trim: true,
      required: true,
    },
    body: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: ["ANNOUNCEMENT", "ASSIGNMENT"],
      default: "ANNOUNCEMENT",
    },
    dueDate: {
      type: Date,
      default: null,
    },
    points: {
      type: Number,
      default: null,
      min: 0,
    },
    allowStudentSubmissions: {
      type: Boolean,
      default: true,
    },
    allowedSubmissionTypes: {
      type: [String],
      enum: ["LINK", "FILE"],
      default: ["LINK", "FILE"],
    },
    attachments: {
      type: [PostAttachmentSchema],
      default: [],
    },
    versionNumber: {
      type: Number,
      min: 1,
      default: 1,
    },
    versionHistory: {
      type: [ClassPostVersionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

ClassPostSchema.index({ classroomId: 1, createdAt: -1 });

export default mongoose.model("ClassPost", ClassPostSchema);
