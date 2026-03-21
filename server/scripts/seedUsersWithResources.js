import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import Resource from "../src/models/Resource.js";

const demoUsers = [
  {
    email: "hod@tracehub.edu",
    password: "HodPassword123!",
    name: "Dr. Arnab Roy",
    role: "HOD",
    department: "Computer Science",
    managedDepartments: ["Computer Science"],
    isVerified: true
  },
  {
    email: "professor1@tracehub.edu",
    password: "ProfPassword123!",
    name: "Dr. Priya Sharma",
    role: "PROFESSOR",
    department: "Computer Science",
    isVerified: true
  },
  {
    email: "professor2@tracehub.edu",
    password: "ProfPassword123!",
    name: "Prof. Subhash Gupta",
    role: "PROFESSOR",
    department: "Computer Science",
    isVerified: true
  },
  {
    email: "student1@tracehub.edu",
    password: "StudentPass123!",
    name: "Arjun Das",
    role: "STUDENT",
    isVerified: true
  },
  {
    email: "student2@tracehub.edu",
    password: "StudentPass123!",
    name: "Rahul Ghosh",
    role: "STUDENT",
    isVerified: true
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Resource.deleteMany({});
    console.log("✅ Cleared existing users and resources");

    // Create users
    const createdUsers = await User.insertMany(demoUsers);
    console.log(`✅ Seeded ${createdUsers.length} demo users`);

    // Create demo resources for professors
    const prof1 = createdUsers.find(u => u.email === "professor1@tracehub.edu");
    const prof2 = createdUsers.find(u => u.email === "professor2@tracehub.edu");
    const student1 = createdUsers.find(u => u.email === "student1@tracehub.edu");
    const student2 = createdUsers.find(u => u.email === "student2@tracehub.edu");

    const demoResources = [
      {
        title: "Data Structures & Algorithms — Syllabus",
        uploaderName: prof1.name,
        uploaderEmail: prof1.email,
        userId: prof1._id,
        userDepartment: prof1.department,
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
        uploaderName: prof2.name,
        uploaderEmail: prof2.email,
        userId: prof2._id,
        userDepartment: prof2.department,
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
      // PENDING STUDENT SUBMISSIONS (awaiting professor approval)
      {
        title: "Smart Attendance System — Python + ML",
        uploaderName: student1.name,
        uploaderEmail: student1.email,
        userId: student1._id,
        userDepartment: "Computer Science",
        role: "Student",
        status: "pending",
        githubUrl: "https://github.com/arjundas/smart-attendance-system",
        aiSummary:
          "A facial recognition-based attendance system using Python, OpenCV, and machine learning to automate classroom attendance tracking.",
        aiTags: ["attendance", "facial recognition", "ML", "Python", "OpenCV"],
        aiFlashcards: [
          {
            q: "What library is used for facial recognition?",
            a: "OpenCV with face_recognition module"
          },
          {
            q: "How is attendance stored?",
            a: "Time-stamped records in SQLite database"
          }
        ],
        techStack: ["Python", "OpenCV", "NumPy", "SQLite"],
        originalityScore: 78,
        // NOT APPROVED YET - no Duality or Algorand
        dualityUrl: null,
        algorandTxId: null,
        approvedBy: null,
        approvedAt: null
      },
      {
        title: "E-Commerce Platform — Full Stack",
        uploaderName: student2.name,
        uploaderEmail: student2.email,
        userId: student2._id,
        userDepartment: "Computer Science",
        role: "Student",
        status: "pending",
        githubUrl: "https://github.com/rahulghosh/ecommerce-fullstack",
        aiSummary:
          "A responsive e-commerce platform built with React frontend and Node.js backend, featuring product catalog, shopping cart, and payment integration.",
        aiTags: ["e-commerce", "React", "Node.js", "MongoDB", "payment"],
        aiFlashcards: [
          {
            q: "What database is used?",
            a: "MongoDB for document storage"
          },
          {
            q: "How are orders processed?",
            a: "Through Stripe payment gateway integration"
          }
        ],
        techStack: ["React", "Node.js", "MongoDB", "Stripe", "TailwindCSS"],
        originalityScore: 82,
        // NOT APPROVED YET - no Duality or Algorand
        dualityUrl: null,
        algorandTxId: null,
        approvedBy: null,
        approvedAt: null
      }
    ];

    await Resource.insertMany(demoResources);
    console.log(`✅ Seeded ${demoResources.length} demo resources (2 approved professor docs + 2 pending student GitHub submissions)`);

    // Print credentials
    console.log("\n" + "=".repeat(60));
    console.log("🔐 DEMO CREDENTIALS");
    console.log("=".repeat(60));
    console.log("\n📌 HOD (Administrator):");
    console.log("   Email: hod@tracehub.edu");
    console.log("   Password: HodPassword123!");
    console.log("   Role: HOD (manages Computer Science department)");

    console.log("\n👨‍🏫 Professor 1:");
    console.log("   Email: professor1@tracehub.edu");
    console.log("   Password: ProfPassword123!");
    console.log("   Role: PROFESSOR (Can upload)");

    console.log("\n👨‍🏫 Professor 2:");
    console.log("   Email: professor2@tracehub.edu");
    console.log("   Password: ProfPassword123!");
    console.log("   Role: PROFESSOR (Can upload)");

    console.log("\n👨‍🎓 Student 1:");
    console.log("   Email: student1@tracehub.edu");
    console.log("   Password: StudentPass123!");
    console.log("   Role: STUDENT (View-only access)");

    console.log("\n👨‍🎓 Student 2:");
    console.log("   Email: student2@tracehub.edu");
    console.log("   Password: StudentPass123!");
    console.log("   Role: STUDENT (View-only access)");

    console.log("\n" + "=".repeat(60));
    console.log("📋 DEMO WORKFLOW: DRAFT → APPROVE → BLOCKCHAIN");
    console.log("=".repeat(60));
    console.log("\n✅ 2 Approved Resources (already on blockchain):");
    console.log("   1. Data Structures & Algorithms — Syllabus (Prof. Priya Sharma)");
    console.log("   2. Database Management Systems — Course Notes (Prof. Subhash Gupta)");
    
    console.log("\n⏳ 2 Pending Student Submissions (awaiting approval):");
    console.log("   1. Smart Attendance System — Python + ML (Arjun Das)");
    console.log("      → GitHub: https://github.com/arjundas/smart-attendance-system");
    console.log("   2. E-Commerce Platform — Full Stack (Rahul Ghosh)");
    console.log("      → GitHub: https://github.com/rahulghosh/ecommerce-fullstack");

    console.log("\n🔑 APPROVAL WORKFLOW:");
    console.log("   Step 1: GET /api/pending → view pending queue (no auth required)");
    console.log("   Step 2: POST /api/pending/approve/:resourceId");
    console.log("           Body: {passcode: \"ApproveDemo2024!\"}");
    console.log("   Result: Resource minted on Algorand + moved to verified status");
    console.log("\n" + "=".repeat(60));

    await mongoose.disconnect();
    console.log("\n✅ Database connection closed");
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
