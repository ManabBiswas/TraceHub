import mongoose from "mongoose";

const ResourceVersionSchema = new mongoose.Schema(
  {
    versionNumber: { type: Number, required: true, min: 1 },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "APPROVE"],
      required: true,
    },
    title: { type: String, default: "" },
    githubUrl: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
    },
    aiSummary: { type: String, default: "" },
    aiTags: [{ type: String }],
    techStack: [{ type: String }],
    originalityScore: { type: Number, default: null },
    dualityUrl: { type: String, default: "" },
    algorandTxId: { type: String, default: "" },
    updatedByName: { type: String, default: "System" },
    updatedByRole: { type: String, default: "SYSTEM" },
    updatedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ResourceSchema = new mongoose.Schema({
  // Core fields
  title: { type: String, required: true },
  uploaderName: { type: String, required: true },
  uploaderEmail: { type: String, required: true },
  role: { type: String, enum: ["Professor", "Student"], required: true },

  // User reference (auth) - optional for student GitHub submissions without auth
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // Students submit GitHub URLs without JWT
    default: null,
  },
  classroomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Classroom",
    required: false,
    default: null,
  },
  userDepartment: { type: String },

  // Approval workflow (NEW)
  status: {
    type: String,
    enum: ["pending", "approved"],
    default: function () {
      return this.role === "Professor" ? "approved" : "pending"; // Professors auto-approve, students are pending
    },
  },
  approvedBy: { type: String }, // Professor name who approved
  approvedAt: { type: Date }, // When it was approved

  // GitHub field (for student submissions)
  githubUrl: { type: String }, // Optional: GitHub repo URL

  // AI-generated fields (populated after Requesty call)
  aiSummary: { type: String },
  aiTags: [{ type: String }],
  aiFlashcards: [{ q: String, a: String }], // Professor only
  techStack: [{ type: String }], // Student only
  originalityScore: { type: Number }, // Student only (0–100)

  // Web3 fields (populated after Duality + Algorand calls)
  // NOTE: Algorand mint only happens on approval
  dualityUrl: { type: String }, // Permanent file URL
  algorandTxId: { type: String }, // Testnet transaction ID (null until approved)

  // Versioning fields (every create/update/approval appends an immutable snapshot)
  versionNumber: {
    type: Number,
    min: 1,
    default: 1,
  },
  versionHistory: {
    type: [ResourceVersionSchema],
    default: [],
  },

  createdAt: { type: Date, default: Date.now },
});

// Indexes
ResourceSchema.index({ userId: 1, createdAt: -1 });
ResourceSchema.index({ classroomId: 1, createdAt: -1 });
ResourceSchema.index({ status: 1, createdAt: -1 }); // For pending queue
ResourceSchema.index({ classroomId: 1, versionNumber: -1 });

export default mongoose.model("Resource", ResourceSchema);
