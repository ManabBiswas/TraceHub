import axios from "axios";
import ProjectMetadata from "../models/ProjectMetadata.js";
import Submission from "../models/Submission.js";
import {
  extractMetadataWithFallback,
  extractFeatureVectorWithFallback,
} from "./aiRouting.service.js";

/**
 * Project Analysis Service - Plagiarism Detection Pipeline
 * 
 * Flow:
 * 1. Extract metadata (Groq → Gemini fallback)
 * 2. Generate feature vector (Groq → Gemini fallback)
 * 3. Compare with ALL existing projects sequentially
 * 4. Calculate plagiarism risk
 * 5. Store results for professor review (PROFESSOR decides, not automated)
 */

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTE SIMILARITY BETWEEN TWO FEATURE VECTORS (local, no API calls)
// ─────────────────────────────────────────────────────────────────────────────

function computeFeatureSimilarity(vectorA, vectorB) {
  if (!vectorA || !vectorB) return 0;

  let matchScore = 0;
  let totalWeight = 0;

  // ── Tech stack fingerprints — most important signal ────────────────────
  const techA = vectorA.techStackFingerprint || {};
  const techB = vectorB.techStackFingerprint || {};
  const techKeys = Object.keys(techA);

  techKeys.forEach((key) => {
    if (techA[key] === techB[key]) matchScore += 2;
    totalWeight += 2;
  });

  // ── Architecture type ──────────────────────────────────────────────────
  const archA = vectorA.architectureType || {};
  const archB = vectorB.architectureType || {};
  const archKeys = Object.keys(archA);

  archKeys.forEach((key) => {
    if (archA[key] === archB[key]) matchScore += 1;
    totalWeight += 1;
  });

  // ── Problem domain — critical for catching identical project ideas ────
  const domainA = vectorA.problemDomain || {};
  const domainB = vectorB.problemDomain || {};
  const domainKeys = Object.keys(domainA);

  domainKeys.forEach((key) => {
    if (domainA[key] === domainB[key]) matchScore += 3;
    totalWeight += 3;
  });

  // ── Domain scores using cosine-like similarity ─────────────────────────
  const domScoresA = Object.values(vectorA.domainScores || {});
  const domScoresB = Object.values(vectorB.domainScores || {});

  if (domScoresA.length === domScoresB.length && domScoresA.length > 0) {
    const dotProduct = domScoresA.reduce((sum, a, i) => sum + a * domScoresB[i], 0);
    const magA = Math.sqrt(domScoresA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(domScoresB.reduce((sum, b) => sum + b * b, 0));
    const cosineSim = magA && magB ? dotProduct / (magA * magB) : 0;
    matchScore += cosineSim * 10;
    totalWeight += 10;
  }

  // ── Complexity signal ──────────────────────────────────────────────────
  const complexA =
    vectorA.complexitySignals?.estimatedComplexity || 0.5;
  const complexB =
    vectorB.complexitySignals?.estimatedComplexity || 0.5;
  const complexDiff = Math.abs(complexA - complexB);
  const complexScore = 1 - complexDiff; // 0-1 based on proximity
  matchScore += complexScore * 2;
  totalWeight += 2;

  return totalWeight > 0 ? matchScore / totalWeight : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEQUENTIAL COMPARISON WITH ALL EXISTING PROJECTS
// ─────────────────────────────────────────────────────────────────────────────

async function findSimilarProjectsSequential(
  featureVector,
  postId,
  excludeSubmissionId
) {
  console.log("🔍 Starting sequential similarity comparison...");

  const allMetadata = await ProjectMetadata.find({
    postId,
    submissionId: { $ne: excludeSubmissionId },
    status: "READY",
  }).select(
    "submissionId projectTitle techStack featureVector codeComplexitySignals"
  );

  console.log(
    `📊 Comparing against ${allMetadata.length} existing projects...\n`
  );

  const results = [];

  // ── SEQUENTIAL COMPARISON (one by one) ─────────────────────────────────
  for (let i = 0; i < allMetadata.length; i++) {
    const existing = allMetadata[i];
    const score = computeFeatureSimilarity(
      featureVector,
      existing.featureVector
    );

    const verdict =
      score >= 0.92
        ? "IDENTICAL"
        : score >= 0.80
        ? "VERY_SIMILAR"
        : score >= 0.65
        ? "SIMILAR"
        : "DIFFERENT";

    console.log(
      `  [${i + 1}/${allMetadata.length}] ${existing.projectTitle}: ${
        score.toFixed(3)
      } → ${verdict}`
    );

    results.push({
      comparedSubmissionId: existing.submissionId,
      projectTitle: existing.projectTitle,
      similarityScore: score,
      techStack: existing.techStack,
      verdict,
    });
  }

  // Filter and sort by similarity
  const filtered = results
    .filter((r) => r.verdict !== "DIFFERENT")
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 5);

  console.log(`\n✓ Comparison complete. Found ${filtered.length} similar projects.\n`);
  return filtered;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENRICH SIMILARITY REPORT WITH STUDENT NAMES
// ─────────────────────────────────────────────────────────────────────────────

async function enrichSimilarityReport(report) {
  const User = (await import("../models/User.js")).default;

  const enriched = await Promise.all(
    report.map(async (item) => {
      try {
        const submission = await Submission.findById(
          item.comparedSubmissionId
        ).select("studentId");
        if (submission) {
          const student = await User.findById(submission.studentId).select(
            "name email"
          );
          item.studentName = student?.name || student?.email || "Unknown";
        }
      } catch {
        item.studentName = "Unknown";
      }
      return item;
    })
  );

  return enriched;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR - PLAGIARISM DETECTION PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

async function analyzeProjectSubmission(
  submissionId,
  postId,
  classroomId,
  studentId,
  githubUrl
) {
  try {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    // ── Step 1: Create/update metadata record ─────────────────────────────
    console.log(`\n📝 === PLAGIARISM DETECTION PIPELINE ===`);
    console.log(`📝 Starting analysis for submission ${submissionId}`);
    let metadata = await ProjectMetadata.findOne({ submissionId });
    if (!metadata) {
      metadata = new ProjectMetadata({
        submissionId,
        postId,
        classroomId,
        status: "PROCESSING",
      });
    } else {
      metadata.status = "PROCESSING";
    }
    await metadata.save();

    // ── Step 2: Prepare project summary ───────────────────────────────────
    const projectSummary = `
Title: ${submission.text?.substring(0, 200) || "Project"}
GitHub: ${githubUrl}
PDF Report: ${submission.files?.length > 0 ? "Provided" : "None"}
    `.trim();

    // ── Step 3: Extract metadata with AI fallback (Groq → Gemini) ────────
    console.log("\n🤖 [STEP 1] Extracting metadata...");
    console.log("    Trying Groq first, fallback to Gemini 2.5");
    const extractedMetadata = await extractMetadataWithFallback(
      projectSummary,
      githubUrl
    );

    if (extractedMetadata) {
      metadata.projectTitle = extractedMetadata.projectTitle;
      metadata.oneLiner = extractedMetadata.oneLiner;
      metadata.summary = extractedMetadata.summary;
      metadata.techStack = extractedMetadata.techStack;
      metadata.architecture = extractedMetadata.architecture;
      metadata.codeComplexitySignals = {
        primaryLanguage: extractedMetadata.primaryLanguage,
        hasTests: extractedMetadata.hasTests,
        hasDockerfile: extractedMetadata.hasDockerfile,
        hasCI: extractedMetadata.hasCI,
        hasReadme: extractedMetadata.hasReadme,
        estimatedComplexity: extractedMetadata.estimatedComplexity,
      };
      console.log(`✓ Metadata extracted: "${metadata.projectTitle}"`);
    } else {
      console.warn("⚠️  Metadata extraction failed, continuing with vector analysis");
    }

    // ── Step 4: Store metadata in database ────────────────────────────────
    console.log("\n💾 [STEP 2] Storing metadata...");
    await metadata.save();
    console.log("✓ Metadata stored in database");

    // ── Step 5: Generate feature vector with AI fallback ──────────────────
    console.log("\n🧠 [STEP 3] Generating feature vector...");
    console.log("    Trying Groq first, fallback to Gemini 2.5");
    const featureVector = await extractFeatureVectorWithFallback(
      projectSummary,
      githubUrl
    );
    metadata.featureVector = featureVector;
    await metadata.save();
    console.log("✓ Feature vector generated and stored");

    // ── Step 6: SEQUENTIAL comparison with all existing projects ──────────
    let similarityReport = [];
    if (featureVector) {
      console.log(`\n🔎 [STEP 4] PLAGIARISM DETECTION - Comparing with all existing projects...`);
      const similarities = await findSimilarProjectsSequential(
        featureVector,
        postId,
        submissionId
      );
      similarityReport = await enrichSimilarityReport(similarities);
      metadata.similarityReport = similarityReport;
      await metadata.save();
      console.log(`✓ Similarity comparison complete`);
    }

    // ── Step 7: Calculate plagiarism risk assessment ──────────────────────
    console.log(`\n📊 [STEP 5] Risk Assessment...`);
    const maxSimilarity =
      similarityReport.length > 0
        ? Math.max(...similarityReport.map((r) => r.similarityScore))
        : 0;

    if (maxSimilarity >= 0.92) {
      metadata.riskLevel = "HIGH";
      metadata.riskFactors = [
        `🚨 ALERT: Project appears nearly identical to another (${Math.round(
          maxSimilarity * 100
        )}% match)`,
      ];
      console.log(`   🚨 HIGH PLAGIARISM RISK DETECTED`);
      console.log(`   Recommendation: PROFESSOR MUST REVIEW MANUALLY`);
    } else if (maxSimilarity >= 0.80 || similarityReport.length >= 2) {
      metadata.riskLevel = "MEDIUM";
      metadata.riskFactors = [
        `Multiple similar projects detected`,
        `Highest similarity: ${Math.round(maxSimilarity * 100)}%`,
      ];
      console.log(`   ⚠️  MEDIUM PLAGIARISM RISK DETECTED`);
      console.log(`   Recommendation: PROFESSOR SHOULD VERIFY`);
    } else {
      metadata.riskLevel = "LOW";
      metadata.riskFactors = [];
      console.log(`   ✓ Low plagiarism risk`);
      console.log(`   Recommendation: Likely original work`);
    }

    // ── Step 8: Save final analysis ──────────────────────────────────────
    metadata.status = "READY";
    metadata.analyzedAt = new Date();
    await metadata.save();
    console.log(`\n✅ Analysis complete for submission ${submissionId}`);
    console.log(`🔐 Result stored. Waiting for PROFESSOR MANUAL REVIEW.`);
    console.log(`========================================\n`);

    return metadata;
  } catch (error) {
    console.error(
      `\n❌ Project analysis failed for ${submissionId}:`,
      error.message
    );

    // Mark as failed but let submission go to UNDER_REVIEW
    await ProjectMetadata.findOneAndUpdate(
      { submissionId },
      { status: "FAILED", analyzedAt: new Date() }
    );

    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export {
  analyzeProjectSubmission,
  computeFeatureSimilarity,
  findSimilarProjectsSequential,
  enrichSimilarityReport,
};
