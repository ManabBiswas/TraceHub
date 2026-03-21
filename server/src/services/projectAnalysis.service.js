import axios from "axios";
import ProjectMetadata from "../models/ProjectMetadata.js";
import Submission from "../models/Submission.js";

/**
 * Hackathon-optimized project analysis service
 * Uses Requesty for ALL AI operations (feature vectors, not embeddings)
 * Avoids Atlas Vector Search dependency — feature vectors computed locally
 */

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACT PROJECT FEATURE VECTOR using Requesty
// This replaces traditional embeddings with a structured feature set
// ─────────────────────────────────────────────────────────────────────────────

async function extractProjectFeatureVector(githubUrl, projectSummary) {
  const prompt = `
Analyze this GitHub project and return ONLY a JSON object with no markdown, no preamble, no code blocks.
These features will be used for similarity comparison between student projects.
Be precise and consistent — similar projects should receive similar scores.

GitHub URL: ${githubUrl}
Project Summary:
${projectSummary.substring(0, 5000)}

Return this exact JSON structure:
{
  "domainScores": {
    "webDevelopment": 0.0,
    "machineLearning": 0.0,
    "dataScience": 0.0,
    "mobileApp": 0.0,
    "devops": 0.0,
    "gameDev": 0.0,
    "embedded": 0.0,
    "blockchain": 0.0
  },
  "techStackFingerprint": {
    "usesReact": false,
    "usesVue": false,
    "usesAngular": false,
    "usesNodeJs": false,
    "usesPython": false,
    "usesJava": false,
    "usesGo": false,
    "usesMongoDB": false,
    "usesPostgres": false,
    "usesMySQL": false,
    "usesRedis": false,
    "usesDocker": false,
    "usesKubernetes": false,
    "usesTensorflow": false,
    "usesPytorch": false,
    "usesOpenCV": false,
    "usesFirebase": false,
    "usesAWS": false,
    "usesExpress": false,
    "usesDjango": false,
    "usesFlask": false
  },
  "architectureType": {
    "isMVC": false,
    "isMicroservices": false,
    "isMonolith": false,
    "isServerless": false,
    "isEventDriven": false,
    "isPipeline": false
  },
  "problemDomain": {
    "isAttendanceSystem": false,
    "isEcommerce": false,
    "isChatApp": false,
    "isRecommendation": false,
    "isObjectDetection": false,
    "isFaceRecognition": false,
    "isNaturalLanguage": false,
    "isGameProject": false,
    "isPortfolio": false,
    "isInventoryManagement": false,
    "isHealthcare": false,
    "isEducation": false,
    "isFinance": false,
    "isSocialNetwork": false,
    "isAnalytics": false
  },
  "complexitySignals": {
    "hasAuthentication": false,
    "hasPaymentIntegration": false,
    "hasRealTimeFeatures": false,
    "hasMLModel": false,
    "hasAPIIntegration": false,
    "hasDatabaseDesign": false,
    "hasDeployment": false,
    "hasTests": false,
    "estimatedComplexity": 0.5
  }
}

ALL numeric values between 0.0 and 1.0.
domainScores should sum to approximately 1.0.
estimatedComplexity: 0.0 = trivial, 1.0 = very complex.
Boolean values must be true or false (no null).
`;

  try {
    const response = await axios.post(
      "https://router.requesty.ai/v1/chat/completions",
      {
        model: "claude-3-5-sonnet",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.REQUESTY_API_KEY}`,
        },
      }
    );

    const raw = response.data.choices[0].message.content;
    const featureVector = JSON.parse(raw);
    
    return featureVector;
  } catch (error) {
    console.error(
      "Feature vector extraction failed:",
      error.response?.status,
      error.message
    );
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACT PROJECT METADATA using Requesty
// ─────────────────────────────────────────────────────────────────────────────

async function extractProjectMetadata(projectSummary, githubUrl) {
  const prompt = `
Analyze this student project and extract metadata. Return ONLY a JSON object with no markdown, no code blocks.

Project Summary:
${projectSummary.substring(0, 4000)}

GitHub URL: ${githubUrl}

Return this exact JSON (all fields required):
{
  "projectTitle": "Clear project name",
  "oneLiner": "One sentence description",
  "summary": "2-3 sentence technical summary",
  "techStack": ["Tech1", "Tech2", "Tech3"],
  "architecture": "Brief architecture description",
  "primaryLanguage": "Python|JavaScript|Java|Go|Rust|etc",
  "hasTests": true,
  "hasDockerfile": true,
  "hasCI": true,
  "hasReadme": true,
  "estimatedComplexity": 0.65
}

All fields required. estimatedComplexity: 0.0-1.0.
`;

  try {
    const response = await axios.post(
      "https://router.requesty.ai/v1/chat/completions",
      {
        model: "claude-3-5-sonnet",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.REQUESTY_API_KEY}`,
        },
      }
    );

    const raw = response.data.choices[0].message.content;
    return JSON.parse(raw);
  } catch (error) {
    console.error("Metadata extraction failed:", error.message);
    return null;
  }
}

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
// FIND SIMILAR PROJECTS (find all with meaningful similarity without API calls)
// ─────────────────────────────────────────────────────────────────────────────

async function findSimilarProjects(
  featureVector,
  postId,
  excludeSubmissionId
) {
  const ProjectMetadata = (await import("../models/ProjectMetadata.js"))
    .default;

  // Get all projects for this assignment that have been analyzed
  const allMetadata = await ProjectMetadata.find({
    postId,
    submissionId: { $ne: excludeSubmissionId },
    status: "READY",
  }).select(
    "submissionId projectTitle techStack featureVector codeComplexitySignals"
  );

  const results = allMetadata
    .map((existing) => {
      const score = computeFeatureSimilarity(
        featureVector,
        existing.featureVector
      );
      return {
        comparedSubmissionId: existing.submissionId,
        projectTitle: existing.projectTitle,
        similarityScore: score,
        techStack: existing.techStack,
        verdict:
          score >= 0.92
            ? "IDENTICAL"
            : score >= 0.80
            ? "VERY_SIMILAR"
            : score >= 0.65
            ? "SIMILAR"
            : "DIFFERENT",
      };
    })
    .filter((r) => r.verdict !== "DIFFERENT") // only report meaningful matches
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 5);

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET STUDENT NAMES FOR SIMILARITY REPORT
// ─────────────────────────────────────────────────────────────────────────────

async function enrichSimilarityReport(report) {
  const Submission = (await import("../models/Submission.js")).default;
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
// MAIN ANALYSIS ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

async function analyzeProjectSubmission(
  submissionId,
  postId,
  classroomId,
  studentId,
  githubUrl
) {
  try {
    const Submission = (await import("../models/Submission.js")).default;

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    // Create or update metadata record
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

    // ── Step 1: Extract metadata from project ────────────────────────────
    const projectSummary = `
Title: ${submission.text?.substring(0, 200) || "Project"}
GitHub: ${githubUrl}
PDF Report: ${submission.files?.length > 0 ? "Provided" : "None"}
    `.trim();

    const extractedMetadata = await extractProjectMetadata(
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
    }

    // ── Step 2: Generate feature vector for similarity analysis ──────────
    const featureVector = await extractProjectFeatureVector(
      githubUrl,
      projectSummary
    );
    metadata.featureVector = featureVector;

    // ── Step 3: Find similar projects ──────────────────────────────────
    let similarityReport = [];
    if (featureVector) {
      const similarities = await findSimilarProjects(
        featureVector,
        postId,
        submissionId
      );
      similarityReport = await enrichSimilarityReport(similarities);
    }

    metadata.similarityReport = similarityReport;

    // ── Assess risk based on similarities ──────────────────────────────
    const maxSimilarity =
      similarityReport.length > 0
        ? Math.max(...similarityReport.map((r) => r.similarityScore))
        : 0;

    if (maxSimilarity >= 0.92) {
      metadata.riskLevel = "HIGH";
      metadata.riskFactors = ["Project appears nearly identical to another"];
    } else if (maxSimilarity >= 0.80 || similarityReport.length >= 2) {
      metadata.riskLevel = "MEDIUM";
      metadata.riskFactors = [
        "Multiple similar projects detected",
        `Highest similarity: ${Math.round(maxSimilarity * 100)}%`,
      ];
    } else {
      metadata.riskLevel = "LOW";
      metadata.riskFactors = [];
    }

    // ── Save and return ────────────────────────────────────────────────
    metadata.status = "READY";
    metadata.analyzedAt = new Date();
    await metadata.save();

    return metadata;
  } catch (error) {
    console.error("Project analysis failed:", error.message);

    // Mark as failed but let submission go to UNDER_REVIEW
    // Professor can still review manually
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
  extractProjectFeatureVector,
  extractProjectMetadata,
  computeFeatureSimilarity,
  findSimilarProjects,
  enrichSimilarityReport,
};
