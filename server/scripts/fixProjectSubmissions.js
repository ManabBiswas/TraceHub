import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const run = async () => {
  try {
    if (!process.env.MONGODB_URL) {
      console.error(
        "MONGODB_URL not set in .env file. Please configure it.",
      );
      process.exit(1);
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to MongoDB");

    console.log("\nFixing all PROJECT posts...");
    const result = await mongoose.connection
      .collection("classposts")
      .updateMany(
        { type: "PROJECT" },
        { $set: { allowStudentSubmissions: true } },
      );

    console.log(`✓ Updated ${result.modifiedCount} PROJECT post(s)`);
    console.log(`  (${result.matchedCount} total PROJECT posts found)`);

    if (result.modifiedCount > 0) {
      console.log("\n✓ All PROJECT posts now have submissions enabled!");
    } else {
      console.log("\n✓ All PROJECT posts already have submissions enabled.");
    }

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
};

void run();
