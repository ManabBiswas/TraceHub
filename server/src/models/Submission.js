import mongoose from "mongoose";

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
  },
  {
    timestamps: true,
  },
);

SubmissionSchema.index({ postId: 1, studentId: 1 }, { unique: true });
SubmissionSchema.index({ classroomId: 1, createdAt: -1 });

export default mongoose.model("Submission", SubmissionSchema);
