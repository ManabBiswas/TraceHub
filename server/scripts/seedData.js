import "dotenv/config";
import mongoose from "mongoose";
import Resource from "../models/Resource.js";

const seeds = [
  {
    title: "Data Structures & Algorithms — Syllabus",
    uploaderName: "Dr. Priya Sharma",
    role: "Professor",
    aiSummary:
      "A 16-week course covering arrays, trees, graphs, sorting, and dynamic programming with weekly lab sessions.",
    aiTags: ["data structures", "algorithms", "sorting", "graphs"],
    aiFlashcards: [
      {
        q: "What is the time complexity of QuickSort (average)?",
        a: "O(n log n)"
      },
      { q: "What data structure uses LIFO ordering?", a: "A stack" },
      {
        q: "What is a balanced binary tree?",
        a: "A tree where the height difference between subtrees is at most 1"
      }
    ],
    dualityUrl: "https://storage.duality.network/ipfs/QmDemoHash1",
    algorandTxId: process.env.DEMO_FALLBACK_TXID || "DEMO_TX_001"
  },
  {
    title: "Database Management Systems — Course Notes",
    uploaderName: "Prof. Subhash Gupta",
    role: "Professor",
    aiSummary:
      "Covers relational databases, SQL, normalization, transactions, and indexing over 14 weeks.",
    aiTags: ["databases", "SQL", "normalization", "ACID"],
    aiFlashcards: [
      {
        q: "What does ACID stand for?",
        a: "Atomicity, Consistency, Isolation, Durability"
      },
      {
        q: "What is a foreign key?",
        a: "A field that links to the primary key of another table"
      }
    ],
    dualityUrl: "https://storage.duality.network/ipfs/QmDemoHash2",
    algorandTxId: process.env.DEMO_FALLBACK_TXID || "DEMO_TX_002"
  },
  {
    title: "Smart Attendance System Using Face Recognition",
    uploaderName: "Arjun Das",
    role: "Student",
    aiSummary:
      "A real-time attendance system using OpenCV and a custom CNN model, integrated with a React dashboard and Firebase backend.",
    aiTags: ["machine learning", "computer vision", "React", "Firebase"],
    techStack: ["Python", "OpenCV", "TensorFlow", "React", "Firebase"],
    originalityScore: 82,
    dualityUrl: "https://storage.duality.network/ipfs/QmDemoHash3",
    algorandTxId: process.env.DEMO_FALLBACK_TXID || "DEMO_TX_003"
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected to MongoDB");

    await Resource.deleteMany({});
    console.log("✅ Cleared existing resources");

    await Resource.insertMany(seeds);
    console.log(`✅ Seeded ${seeds.length} demo resources`);

    await mongoose.disconnect();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
