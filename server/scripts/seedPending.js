import mongoose from "mongoose";
import dotenv from "dotenv";
import Resource from "../src/models/Resource.js";
import Submission from "../src/models/Submission.js";
import Classroom from "../src/models/Classroom.js";
import ClassPost from "../src/models/ClassPost.js";
import User from "../src/models/User.js";

dotenv.config();

const main = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL || "mongodb://localhost:27017/tracehub");
    console.log("✅ Connected to MongoDB\n");

    // Get a user and classroom for testing
    const testUser = await User.findOne();
    const classroom = await Classroom.findOne();
    const post = await ClassPost.findOne({ type: "PROJECT" });

    if (!testUser || !classroom || !post) {
      console.error("❌ Missing test data (user, classroom, or project post)");
      await mongoose.connection.close();
      process.exit(1);
    }

    // Create a pending resource (uploaded document)
    const pendingResource = new Resource({
      title: "Advanced Python Patterns - Test Document",
      uploaderName: testUser.name,
      uploaderEmail: testUser.email,
      userId: testUser._id,
      classroomId: classroom._id,
      userDepartment: testUser.department || "Engineering",
      role: "Professor",
      status: "pending", // PENDING - needs approval
      aiSummary: "This document covers advanced design patterns in Python including decorators, metaclasses, and context managers.",
      aiTags: ["Python", "Design Patterns", "Advanced"],
      dualityUrl: null,
      algorandTxId: null,
      versionNumber: 1,
      versionHistory: [],
    });

    await pendingResource.save();
    console.log(`✅ Created pending resource: "${pendingResource.title}"`);

    // Create a pending submission (student project under review)
    const pendingSubmission = new Submission({
      classroomId: classroom._id,
      postId: post._id,
      studentId: testUser._id,
      submissionStatus: "UNDER_REVIEW", // Under review - needs teacher approval
      githubUrl: "https://github.com/testuser/awesome-project",
      contentType: "BOTH",
      files: [
        {
          fileName: "PROJECT_REPORT.pdf",
          mimeType: "application/pdf",
          size: 1024000,
          data: Buffer.from("Sample PDF content for testing"),
        },
      ],
      projectVerification: {
        decision: "PENDING",
      },
      aiAnalysisStatus: "READY",
      versionNumber: 1,
      versionHistory: [],
      status: "TURNED_IN", // Legacy field
    });

    await pendingSubmission.save();
    console.log(`✅ Created pending submission from "${testUser.name}" for project "${post.title}"`);

    // Verify data
    const pendingCount = await Resource.countDocuments({ status: "pending" });
    const underReviewCount = await Submission.countDocuments({ submissionStatus: "UNDER_REVIEW" });
    
    console.log(`\n📊 Pending Resources in DB: ${pendingCount}`);
    console.log(`📊 Under Review Submissions in DB: ${underReviewCount}`);

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
    console.log("\n🔄 Refresh the Pending Approvals page to see the test data!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

main();
