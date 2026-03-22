import axios from "axios";


function cleanJSON(raw) {
  // Remove ```json, ```javascript, ``` wrappers and excess whitespace
  let cleaned = raw
    .replace(/^```\w*\n?/, "") // Remove opening code fence with optional language
    .replace(/\n?```$/, ""); // Remove closing code fence
  
  // Remove leading/trailing whitespace and try to find JSON object
  cleaned = cleaned.trim();
  
  // If wrapped in extra quotes, remove them
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

  // ── Try Groq first (faster, more cost-effective) ────────────────────────
  try {
    console.log("  → Trying Groq...");
    const groqResponse = await callGroq(prompt);
    console.log("  ✓ Groq succeeded");
    return { result: groqResponse, provider: "Groq", success: true };
  } catch (groqError) {
    console.warn(`  ✗ Groq failed: ${groqError.message}`);
  }

  // ── Fallback to Gemini 2.5 ────────────────────────────────────────────────
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

  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY not configured. Set it in .env to use Groq.");
  }

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "llama-3.3-70b-versatile", 
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3, // Lower for consistent extraction
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15000, // 15s timeout
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

  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY not configured. Set it in .env to use Gemini.");
  }

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: maxTokens,
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 15000, // 15s timeout
    }
  );

  if (!response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error("Gemini response format invalid");
  }

  return response.data.candidates[0].content.parts[0].text;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACT METADATA WITH AI FALLBACK
// ─────────────────────────────────────────────────────────────────────────────

export async function extractMetadataWithFallback(projectSummary, githubUrl) {
  const prompt = `
Analyze this student project and extract metadata. Return ONLY a JSON object with no markdown, no code blocks, no preamble.

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
Return ONLY the JSON object, nothing else.
`;

  const response = await callAIWithFallback(prompt, "metadata");

  if (!response.success) {
    console.error("❌ Both AI providers failed for metadata extraction");
    return null;
  }

  try {
    const parsed = JSON.parse(cleanJSON(response.result));
    console.log(`✓ Metadata extracted via ${response.provider}`);
    return parsed;
  } catch (err) {
    console.error(
      `Failed to parse ${response.provider} response:`,
      err.message
    );
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACT FEATURE VECTOR WITH AI FALLBACK
// ─────────────────────────────────────────────────────────────────────────────

export async function extractFeatureVectorWithFallback(projectSummary, githubUrl) {
  const prompt = `
Analyze this GitHub project and return ONLY a JSON object with no markdown, no preamble.
These features will be used for plagiarism detection similarity comparison.

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
Boolean values must be true or false (no null).
Return ONLY the JSON object, nothing else.
`;

  const response = await callAIWithFallback(prompt, "feature vector");

  if (!response.success) {
    console.error("❌ Both AI providers failed for feature vector extraction");
    return null;
  }

  try {
    const parsed = JSON.parse(cleanJSON(response.result));
    console.log(`✓ Feature vector extracted via ${response.provider}`);
    return parsed;
  } catch (err) {
    console.error(
      `Failed to parse ${response.provider} response:`,
      err.message
    );
    return null;
  }
}
