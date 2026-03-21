import mongoose from "mongoose";

/**
 * ProjectMetadata stores AI analysis results for project submissions
 * Hackathon-optimized: Uses feature vectors from Requesty, NOT Atlas Vector Search
 */

const ProjectMetadataSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      required: true,
      unique: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassPost",
      required: true,
    },
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
    },
    
    // ── AI Analysis Status ─────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["NOT_STARTED", "PROCESSING", "READY", "FAILED"],
      default: "NOT_STARTED",
    },

    // ── Project Metadata Extracted by AI ───────────────────────────────────
    projectTitle: { type: String, default: "" },
    oneLiner: { type: String, default: "" },
    summary: { type: String, default: "" },
    
    // Tech stack extracted from GitHub README / code analysis
    techStack: { type: [String], default: [] },
    architecture: { type: String, default: "" },
    
    // ── Code Complexity Signals ────────────────────────────────────────────
    codeComplexitySignals: {
      primaryLanguage: { type: String, default: "" },
      hasTests: { type: Boolean, default: false },
      hasDockerfile: { type: Boolean, default: false },
      hasCI: { type: Boolean, default: false },
      hasReadme: { type: Boolean, default: false },
      estimatedComplexity: { type: Number, default: 0.5, min: 0, max: 1 },
    },

    // ── Feature Vector for Similarity (Requesty-generated, not embeddings) ──
    // This is NOT a traditional embedding — it's a structured feature set
    // that we can use for similarity comparison without Atlas Vector Search
    featureVector: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // ── Similarity Report (compared against other projects) ────────────────
    similarityReport: [
      {
        comparedSubmissionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Submission",
        },
        studentName: { type: String },
        projectTitle: { type: String },
        techStack: [String],
        similarityScore: { type: Number, min: 0, max: 1 },
        verdict: {
          type: String,
          enum: ["IDENTICAL", "VERY_SIMILAR", "SIMILAR", "DIFFERENT"],
        },
      },
    ],

    // ── Risk Assessment ────────────────────────────────────────────────────
    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "LOW",
    },
    riskFactors: { type: [String], default: [] },

    // ── GitHub Analysis ────────────────────────────────────────────────────
    githubUrl: { type: String, default: "" },
    githubMetrics: {
      stars: { type: Number, default: 0 },
      commits: { type: Number, default: 0 },
      contributors: { type: Number, default: 0 },
      hasLicense: { type: Boolean, default: false },
    },

    // ── Timestamps ────────────────────────────────────────────────────────
    analyzedAt: { type: Date },
    aiProcessedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Indexes
ProjectMetadataSchema.index({ submissionId: 1 }, { unique: true });
ProjectMetadataSchema.index({ postId: 1 });
ProjectMetadataSchema.index({ classroomId: 1 });
ProjectMetadataSchema.index({ status: 1 });

export default mongoose.model("ProjectMetadata", ProjectMetadataSchema);
