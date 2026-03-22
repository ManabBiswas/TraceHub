import axios from "axios";

function cleanJSON(raw) {
  let cleaned = raw
    .replace(/^```\w*\n?/, "")
    .replace(/\n?```$/, "");
  cleaned = cleaned.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE TO AI WITH GROQ → GEMINI FALLBACK
// ─────────────────────────────────────────────────────────────────────────────

export async function callAIWithFallback(prompt, mode = "metadata") {
  console.log(`🤖 AI Router: Attempting ${mode} extraction...`);

  try {
    console.log("  → Trying Groq...");
    const groqResponse = await callGroq(prompt);
    console.log("  ✓ Groq succeeded");
    return { result: groqResponse, provider: "Groq", success: true };
  } catch (groqError) {
    console.warn(`  ✗ Groq failed: ${groqError.message}`);
  }

  try {
    console.log("  → Falling back to Gemini 2.5...");
    const geminiResponse = await callGemini(prompt);
    console.log("  ✓ Gemini succeeded");
    return { result: geminiResponse, provider: "Gemini", success: true };
  } catch (geminiError) {
    console.error(`  ✗ Gemini also failed: ${geminiError.message}`);
    return { result: null, provider: "none", success: false, error: geminiError.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GROQ API CALL
// ─────────────────────────────────────────────────────────────────────────────

async function callGroq(prompt, maxTokens = 1000) {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) throw new Error("GROQ_API_KEY not configured.");

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1, // Very low temperature for factual extraction
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );

  if (!response.data.choices?.[0]?.message?.content) {
    throw new Error("Groq response format invalid");
  }
  return response.data.choices[0].message.content;
}

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI 2.5 API CALL
// ─────────────────────────────────────────────────────────────────────────────

async function callGemini(prompt, maxTokens = 1000) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) throw new Error("GEMINI_API_KEY not configured.");

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Very low temperature for factual extraction
        maxOutputTokens: maxTokens,
      },
    },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    }
  );

  if (!response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error("Gemini response format invalid");
  }
  return response.data.candidates[0].content.parts[0].text;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACT METADATA — GROUNDED IN ACTUAL README TEXT
// ─────────────────────────────────────────────────────────────────────────────

export async function extractMetadataWithFallback(readmeContent, githubUrl) {
  // If README is empty/unavailable, return minimal metadata honestly
  if (!readmeContent || readmeContent.trim().length < 50) {
    console.warn("⚠️  README content too short for reliable extraction");
    return buildFallbackMetadata(githubUrl);
  }

  const prompt = `You are a precise code analyst. Extract factual metadata from this GitHub README.

CRITICAL RULES — FOLLOW EXACTLY:
1. ONLY include technologies that are EXPLICITLY mentioned by name in the README text below.
2. Do NOT infer, guess, or assume any technology not directly stated.
3. If you are unsure whether something is used, do NOT include it.
4. "Explicitly mentioned" means the README contains words like: "uses React", "built with Node.js", "MongoDB database", "import pandas", etc.
5. If the README mentions NO specific technologies, return an empty techStack array [].
6. Set estimatedComplexity based only on the number of distinct technologies and features described — 0.3 for simple (1-3 techs), 0.6 for moderate (4-6 techs), 0.85 for complex (7+ techs/features).

README TEXT (this is your ONLY source of truth):
---
${readmeContent.substring(0, 5000)}
---

GitHub URL: ${githubUrl}

Return ONLY this JSON object, nothing else, no markdown:
{
  "projectTitle": "exact project name from README, or repo name from URL if not found",
  "oneLiner": "one sentence description based strictly on README",
  "summary": "2-3 sentence technical summary based strictly on README content",
  "techStack": ["only technologies EXPLICITLY named in README"],
  "architecture": "brief description ONLY if architecture is described in README, else empty string",
  "primaryLanguage": "primary language ONLY if explicitly stated or clearly implied by file extensions/imports mentioned",
  "hasTests": false,
  "hasDockerfile": false,
  "hasCI": false,
  "hasReadme": true,
  "estimatedComplexity": 0.5
}

REMINDER: techStack must ONLY contain items literally mentioned in the README text above.`;

  const response = await callAIWithFallback(prompt, "metadata");

  if (!response.success) {
    console.error("❌ Both AI providers failed for metadata extraction");
    return buildFallbackMetadata(githubUrl);
  }

  try {
    const parsed = JSON.parse(cleanJSON(response.result));
    console.log(`✓ Metadata extracted via ${response.provider}: [${parsed.techStack?.join(", ")}]`);
    return parsed;
  } catch (err) {
    console.error(`Failed to parse ${response.provider} response:`, err.message);
    return buildFallbackMetadata(githubUrl);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACT FEATURE VECTOR — GROUNDED IN ACTUAL README TEXT
// ─────────────────────────────────────────────────────────────────────────────

export async function extractFeatureVectorWithFallback(readmeContent, githubUrl) {
  if (!readmeContent || readmeContent.trim().length < 50) {
    console.warn("⚠️  README content too short for feature vector extraction");
    return buildFallbackFeatureVector();
  }

  const prompt = `You are a precise code analyst. Analyze this GitHub README and extract a feature vector for plagiarism detection.

CRITICAL RULES — FOLLOW EXACTLY:
1. Set boolean flags to TRUE only if the technology/framework is EXPLICITLY mentioned in the README.
2. Do NOT guess based on the project domain. A web project does NOT automatically use React/Vue/etc unless stated.
3. Set domainScores based on keywords actually present in the README description.
4. All values must reflect what is WRITTEN in the README, not what you think a project "should" use.

README TEXT (your ONLY source of truth):
---
${readmeContent.substring(0, 5000)}
---

Return ONLY this JSON, no markdown, no explanation:
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

Set each boolean to true ONLY if you see direct evidence in the README. When in doubt, leave it false.
domainScores should sum to approximately 1.0 and reflect the README content.`;

  const response = await callAIWithFallback(prompt, "feature vector");

  if (!response.success) {
    console.error("❌ Both AI providers failed for feature vector extraction");
    return buildFallbackFeatureVector();
  }

  try {
    const parsed = JSON.parse(cleanJSON(response.result));
    console.log(`✓ Feature vector extracted via ${response.provider}`);
    return parsed;
  } catch (err) {
    console.error(`Failed to parse ${response.provider} response:`, err.message);
    return buildFallbackFeatureVector();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK HELPERS — honest defaults when README is unavailable
// ─────────────────────────────────────────────────────────────────────────────

function buildFallbackMetadata(githubUrl) {
  const repoName = githubUrl?.split("/").pop() || "Unknown Project";
  return {
    projectTitle: repoName,
    oneLiner: "Project submitted via GitHub",
    summary: "README content unavailable. Manual review required.",
    techStack: [], // Honest empty array — no hallucination
    architecture: "",
    primaryLanguage: "",
    hasTests: false,
    hasDockerfile: false,
    hasCI: false,
    hasReadme: false,
    estimatedComplexity: 0.3,
  };
}

function buildFallbackFeatureVector() {
  return {
    domainScores: {
      webDevelopment: 0.1, machineLearning: 0.1, dataScience: 0.1,
      mobileApp: 0.1, devops: 0.1, gameDev: 0.1, embedded: 0.1, blockchain: 0.1,
    },
    techStackFingerprint: {
      usesReact: false, usesVue: false, usesAngular: false, usesNodeJs: false,
      usesPython: false, usesJava: false, usesGo: false, usesMongoDB: false,
      usesPostgres: false, usesMySQL: false, usesRedis: false, usesDocker: false,
      usesKubernetes: false, usesTensorflow: false, usesPytorch: false,
      usesOpenCV: false, usesFirebase: false, usesAWS: false,
      usesExpress: false, usesDjango: false, usesFlask: false,
    },
    architectureType: {
      isMVC: false, isMicroservices: false, isMonolith: false,
      isServerless: false, isEventDriven: false, isPipeline: false,
    },
    problemDomain: {
      isAttendanceSystem: false, isEcommerce: false, isChatApp: false,
      isRecommendation: false, isObjectDetection: false, isFaceRecognition: false,
      isNaturalLanguage: false, isGameProject: false, isPortfolio: false,
      isInventoryManagement: false, isHealthcare: false, isEducation: false,
      isFinance: false, isSocialNetwork: false, isAnalytics: false,
    },
    complexitySignals: {
      hasAuthentication: false, hasPaymentIntegration: false,
      hasRealTimeFeatures: false, hasMLModel: false, hasAPIIntegration: false,
      hasDatabaseDesign: false, hasDeployment: false, hasTests: false,
      estimatedComplexity: 0.3,
    },
  };
}