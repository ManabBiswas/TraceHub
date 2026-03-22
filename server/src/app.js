import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import uploadRouter from "./routes/upload.js";
import authRouter from "./routes/auth.js";
import pendingRouter from "./routes/pending.js";
import classroomsRouter from "./routes/classrooms.js";
import resourcesRouter from "./routes/resources.js";
import verifyRouter from "./routes/verify.js";
import projectSubmissionsRouter from "./routes/projectSubmissions.js";

import { isDBConnected, getDBStats } from "./config/db.js";
import { isAlgorandHealthy } from "./services/algorand.service.js";

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"],
    maxAge: 86400,
  })
);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(helmet());
app.use(morgan("tiny"));
app.use(cookieParser());

// Health check — DB + Algorand status visible to judges
app.get("/health", async (req, res) => {
  const dbOk = isDBConnected();
  const algoOk = await isAlgorandHealthy().catch(() => false);

  const status = dbOk ? (algoOk ? "ok" : "degraded") : "error";

  res.status(dbOk ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? "connected" : "disconnected",
      algorand: algoOk ? "reachable" : "unreachable",
    },
    db: getDBStats(),
  });
});

// ── Root ──────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("TraceHub API running 🚀"));

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/resources", resourcesRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/pending", pendingRouter);
app.use("/api/classrooms", classroomsRouter);
app.use(
  "/api/classrooms/:classroomId/posts/:postId/project-submissions",
  projectSubmissionsRouter
);
app.use("/api/verify", verifyRouter);
// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(err.status ?? 500).json({
    error: err.message ?? "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;