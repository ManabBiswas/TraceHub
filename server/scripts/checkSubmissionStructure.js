import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection;

    // Get first submission
    const submission = await db.collection("submissions").findOne({});

    if (!submission) {
      console.log("❌ No submissions found in database");
      mongoose.disconnect();
      return;
    }

    console.log("\n📋 SUBMISSION STRUCTURE:");
    console.log("GitHub URL:", submission.githubUrl);
    console.log("Files array length:", submission.files?.length || 0);

    if (submission.files && submission.files.length > 0) {
      console.log("\n📎 First file structure:");
      const firstFile = submission.files[0];
      console.log("Type:", typeof firstFile);
      console.log("Keys:", Object.keys(firstFile || {}).slice(0, 10));
      console.log("fileName:", firstFile.fileName);
      console.log("mimeType:", firstFile.mimeType);
      console.log("size:", firstFile.size);
      console.log("has data field:", !!firstFile.data);
      if (firstFile.data) {
        console.log("data type:", typeof firstFile.data);
        console.log("data length:", firstFile.data.length || "N/A");
        console.log("data is Buffer:", Buffer.isBuffer(firstFile.data));
      }
    }

    console.log("\n✅ Full submission object (sanitized):");
    const plain = submission.toObject ? submission.toObject() : submission;
    if (plain.files) {
      plain.files = plain.files.map((f) => ({
        ...f,
        data: f.data ? `<Buffer ${f.data.length} bytes>` : undefined,
      }));
    }
    console.log(JSON.stringify(plain, null, 2).slice(0, 1000));

    mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    mongoose.disconnect();
  }
};

connectDB();
