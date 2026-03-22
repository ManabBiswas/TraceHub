import mongoose from "mongoose";
import dotenv from "dotenv";
import Resource from "../src/models/Resource.js";
import Submission from "../src/models/Submission.js";

dotenv.config();

const main = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL || "mongodb://localhost:27017/tracehub");
    console.log("✅ Connected to MongoDB\n");

    // Check pending resources
    const pendingResources = await Resource.find({ status: "pending" }).populate("userId", "name email");
    console.log(`📄 Pending Resources: ${pendingResources.length}`);
    if (pendingResources.length > 0) {
      pendingResources.forEach((r) => {
        console.log(`  - ${r.title} by ${r.uploaderName}`);
      });
    }

    // Check under review submissions
    const underReviewSubmissions = await Submission.find({ submissionStatus: "UNDER_REVIEW" })
      .populate("studentId", "name")
      .populate("postId", "title");
    console.log(`\n📝 Under Review Submissions: ${underReviewSubmissions.length}`);
    if (underReviewSubmissions.length > 0) {
      underReviewSubmissions.forEach((s) => {
        console.log(`  - ${s.studentId?.name} - ${s.postId?.title}`);
      });
    }

    // Check all submissions
    const allSubmissions = await Submission.countDocuments();
    console.log(`\n📊 Total Submissions in DB: ${allSubmissions}`);

    // Check all resources
    const allResources = await Resource.countDocuments();
    console.log(`📊 Total Resources in DB: ${allResources}`);

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

main();
