import mongoose from "mongoose";

const PostAttachmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
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
  },
  {
    timestamps: true,
  },
);

ClassPostSchema.index({ classroomId: 1, createdAt: -1 });

export default mongoose.model("ClassPost", ClassPostSchema);
