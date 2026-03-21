import mongoose from "mongoose";

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
    required: false,  // Students submit GitHub URLs without JWT
    default: null
  },
  userDepartment: { type: String },

  // Approval workflow (NEW)
  status: {
    type: String,
    enum: ["pending", "approved"],
    default: function() {
      return this.role === "Professor" ? "approved" : "pending"; // Professors auto-approve, students are pending
    }
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

  createdAt: { type: Date, default: Date.now }
});

// Indexes
ResourceSchema.index({ userId: 1, createdAt: -1 });
ResourceSchema.index({ status: 1, createdAt: -1 }); // For pending queue

export default mongoose.model("Resource", ResourceSchema);
