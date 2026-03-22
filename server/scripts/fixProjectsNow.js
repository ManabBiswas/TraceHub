import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection;

    // Check all PROJECT posts
    const projects = await db.collection("classposts").find({ type: "PROJECT" }).toArray();

    console.log(`📊 Total PROJECT posts found: ${projects.length}\n`);

    if (projects.length > 0) {
      console.log("PROJECT Posts Status:");
      projects.forEach((p, i) => {
        console.log(`  ${i + 1}. "${p.title}"`);
        console.log(`     allowStudentSubmissions: ${p.allowStudentSubmissions}`);
      });

      // Count how many have submissions disabled
      const disabled = projects.filter(p => p.allowStudentSubmissions === false).length;
      console.log(`\n⚠️  ${disabled} PROJECT posts have submissions DISABLED`);

      if (disabled > 0) {
        console.log("\nFixing all PROJECT posts...");
        const result = await db.collection("classposts").updateMany(
          { type: "PROJECT" },
          { $set: { allowStudentSubmissions: true } }
        );
        console.log(`✅ Updated ${result.modifiedCount} PROJECT posts`);
      }
    }

    mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    mongoose.disconnect();
  }
};

connectDB();
