import mongoose from "mongoose";
import dotenv from "dotenv";
import Submission from "../src/models/Submission.js";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected to MongoDB\n");

    // Get the submission we just logged to check it
    const submission = await Submission.findOne({}).sort({ createdAt: -1 });

    if (!submission) {
      console.log("❌ No submissions found");
      mongoose.disconnect();
      return;
    }

    console.log("📋 LATEST SUBMISSION:");
    console.log("Student ID:", submission.studentId);
    console.log("Post ID:", submission.postId);
    console.log("GitHub URL:", submission.githubUrl || "(NOT SET)");
    console.log("Link:", submission.link || "(NOT SET)");
    console.log("Content Type:", submission.contentType);
    console.log("Files:", submission.files.map((f) => f.fileName).join(", "));
    console.log("Status:", submission.status);
    console.log("Submission Status:", submission.submissionStatus);

    if (submission.githubUrl) {
      console.log("\n✅ GitHub URL IS BEING SAVED CORRECTLY!");
    } else {
      console.log("\n⚠️  GitHub URL is still not being saved");
    }

    mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    mongoose.disconnect();
  }
};

connectDB();
