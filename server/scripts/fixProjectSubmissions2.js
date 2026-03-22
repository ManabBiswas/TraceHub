import mongoose from "mongoose";
import dotenv from "dotenv";
import ClassPost from "../src/models/ClassPost.js";

dotenv.config();

const main = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL || "mongodb://localhost:27017/tracehub");
    console.log("✅ Connected to MongoDB");

    // Update all PROJECT posts to enable student submissions
    const result = await ClassPost.updateMany(
      { type: "PROJECT" },
      { $set: { allowStudentSubmissions: true } }
    );

    console.log(`✅ Updated ${result.modifiedCount} PROJECT posts to enable submissions`);

    if (result.matchedCount > 0) {
      console.log(`📊 Total PROJECT posts matched: ${result.matchedCount}`);
    }

    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

main();
