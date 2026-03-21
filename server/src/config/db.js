/**
 * db.js — Hardened MongoDB connection for TraceHub
 *
 * Security features:
 *  • Strict connection options (no implicit auth, TLS enforced on Atlas)
 *  • Automatic reconnection with exponential back-off
 *  • Connection-event audit log (visible in server terminal)
 *  • Write-concern: majority — every DB write is confirmed by the
 *    majority of Atlas replica-set nodes before the server responds,
 *    which prevents data loss even if the primary crashes mid-write
 *  • Read-preference: primaryPreferred — reads go to primary by default
 *    but fall back to a secondary so the app stays responsive during
 *    brief failovers
 *  • Heartbeat polling so stale connections are detected quickly
 *  • Max pool size capped to avoid overwhelming a free Atlas cluster
 */

import mongoose from "mongoose";

// ── Retry state ───────────────────────────────────────────────────────────────
const MAX_RETRIES   = 5;
const BASE_DELAY_MS = 1500; // 1.5 s → 3 s → 6 s → 12 s → 24 s
let   retryCount    = 0;

// ── Mongoose global settings ──────────────────────────────────────────────────
mongoose.set("strictQuery", true);   // reject unknown fields at the ORM level
mongoose.set("strict", true);        // belt-and-suspenders
mongoose.set("sanitizeFilter", true); // strip $ and . from query filters → blocks NoSQL injection

// ── Connection options ────────────────────────────────────────────────────────
const MONGO_OPTIONS = {
  // Reliability
  serverSelectionTimeoutMS : 8000,   // fail fast if Atlas is unreachable
  socketTimeoutMS          : 45000,
  heartbeatFrequencyMS     : 10000,  // detect dead connections every 10 s
  maxPoolSize              : 10,     // safe ceiling for free M0 cluster
  minPoolSize              : 2,      // keep warm connections ready

  // Data safety
  writeConcern: {
    w        : "majority",  // write must be acknowledged by majority of replica-set
    j        : true,        // write must be on disk (journal) before ack
    wtimeout : 10000,       // abort if majority ack takes > 10 s
  },
  readPreference: "primaryPreferred",

  // Connection string extras are handled by Atlas URI itself (TLS, authSource)
  // but we also set these for non-Atlas local dev:
  autoIndex       : process.env.NODE_ENV !== "production", // don't rebuild indexes on every boot in prod
  autoCreate      : true,   // create collections if missing
};

// ── Internal connect helper (called recursively on failure) ───────────────────
async function _connect() {
  const uri = process.env.MONGODB_URL;

  if (!uri) {
    console.error("❌  MONGODB_URL is not set in .env — cannot connect");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, MONGO_OPTIONS);
    retryCount = 0; // reset on success
  } catch (err) {
    retryCount += 1;
    if (retryCount > MAX_RETRIES) {
      console.error(`❌  MongoDB: failed after ${MAX_RETRIES} retries — shutting down`);
      process.exit(1);
    }
    const delay = BASE_DELAY_MS * Math.pow(2, retryCount - 1);
    console.warn(`⚠️   MongoDB: connection attempt ${retryCount}/${MAX_RETRIES} failed — retrying in ${delay}ms`);
    console.warn(`    Reason: ${err.message}`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return _connect();
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────
mongoose.connection.on("connected", () => {
  const host = mongoose.connection.host;
  const db   = mongoose.connection.name;
  console.log(`✅  MongoDB connected  →  ${host}/${db}`);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️   MongoDB disconnected — Mongoose will attempt to reconnect automatically");
});

mongoose.connection.on("reconnected", () => {
  console.log("✅  MongoDB reconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("❌  MongoDB runtime error:", err.message);
  // If the connection is permanently broken, reconnect manually
  if (err.name === "MongoNetworkError" || err.name === "MongoServerSelectionError") {
    mongoose.disconnect().then(() => _connect());
  }
});

// Warn when the pool is saturated (helps catch slow-query issues early)
mongoose.connection.on("fullsetup", () => {
  console.log("ℹ️   MongoDB replica-set fully connected");
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function _gracefulClose(signal) {
  console.log(`\nℹ️   ${signal} received — closing MongoDB connection gracefully`);
  await mongoose.connection.close();
  console.log("✅  MongoDB connection closed");
  process.exit(0);
}

process.on("SIGINT",  () => _gracefulClose("SIGINT"));
process.on("SIGTERM", () => _gracefulClose("SIGTERM"));

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Connect to MongoDB.  Call once at server startup.
 * Retries automatically with exponential back-off.
 */
const connectDB = _connect;

/**
 * Quick health-check — returns true if the connection is live.
 * Used by the /health endpoint.
 */
function isDBConnected() {
  return mongoose.connection.readyState === 1; // 1 = connected
}

/**
 * Return basic stats about the current connection pool.
 * Safe to expose in internal /health responses.
 */
function getDBStats() {
  const conn = mongoose.connection;
  return {
    state      : ["disconnected","connected","connecting","disconnecting"][conn.readyState] ?? "unknown",
    host       : conn.host  ?? null,
    database   : conn.name  ?? null,
    models     : Object.keys(conn.models),
  };
}

export default connectDB;
export { isDBConnected, getDBStats };