import axios from "axios";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Clean JSON from markdown wrappers
// ─────────────────────────────────────────────────────────────────────────────

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
// PROMPTS — anti-hallucination, strictly grounded in provided text
// ─────────────────────────────────────────────────────────────────────────────

const PROFESSOR_PROMPT = (text) => `
You are an academic assistant. Analyze this syllabus/lecture notes and return ONLY a JSON object
with no markdown, no preamble.

RULES:
- Base your answer ONLY on the text provided below.
- Do not add information that is not present in the text.

Format:
{
  "summary": "3-sentence summary of the document based strictly on its content",
  "tags": ["tag1", "tag2", "tag3"],
  "flashcards": [
    { "q": "Question directly from content", "a": "Answer directly from content" }
  ]
}

Limit to 5 flashcards. Document text:
---
${text.substring(0, 4000)}
`;

const STUDENT_PROMPT = (text) => `
You are a technical evaluator. Analyze this project README/abstract and return ONLY a JSON object
with no markdown, no preamble.

CRITICAL RULES:
1. Only include technologies in "techStack" that are EXPLICITLY named in the text below.
2. Do NOT guess or infer technologies. If React is not mentioned, do not include it.
3. originalityScore should reflect architectural complexity described, not assumed.

Format:
{
  "summary": "2-sentence architecture summary based only on what is written below",
  "techStack": ["only techs EXPLICITLY named in the text below"],
  "tags": ["tag1", "tag2"],
  "originalityScore": 70
}

originalityScore is 0-100 based on complexity actually described (not assumed).

Document:
---
${text.substring(0, 4000)}
`;

const MOCK_PROFESSOR = {
  summary: "Document uploaded successfully. AI analysis unavailable. The document contains academic content relevant to the uploaded material.",
  tags: ["uploaded"],
  flashcards: [],
};

const MOCK_STUDENT = {
  summary: "Project uploaded successfully. Technical analysis unavailable at this moment.",
  techStack: [], // Honest empty array, not a hallucinated list
  tags: ["uploaded"],
  originalityScore: 50,
};

// ─────────────────────────────────────────────────────────────────────────────
// Call Groq (primary) → Gemini (fallback)
// ─────────────────────────────────────────────────────────────────────────────

async function callGroq(prompt, maxTokens = 1000) {
  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "mixtral-8x7b-32768",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.1, // Low temperature for factual extraction
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );
  return response.data.choices[0].message.content;
}

async function callGemini(prompt, maxTokens = 1000) {
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.1, // Low temperature for factual extraction
      },
    },
    { timeout: 15000 }
  );
  return response.data.candidates[0].content.parts[0].text;
}

async function analyzeDocument(text, role) {
  try {
    const prompt = role === "Professor" ? PROFESSOR_PROMPT(text) : STUDENT_PROMPT(text);

    let raw;
    try {
      console.log(`  • Trying Groq...`);
      raw = await callGroq(prompt, 1000);
      console.log(`  ✓ Groq success`);
    } catch (groqError) {
      console.warn(`  ✗ Groq failed: ${groqError.message}`);
      console.log(`  • Falling back to Gemini 2.5...`);
      raw = await callGemini(prompt, 1000);
      console.log(`  ✓ Gemini success`);
    }

    const parsed = JSON.parse(cleanJSON(raw));

    return role === "Professor"
      ? {
          summary: parsed.summary,
          tags: parsed.tags || [],
          flashcards: parsed.flashcards || [],
        }
      : {
          summary: parsed.summary,
          techStack: parsed.techStack || [],
          tags: parsed.tags || [],
          originalityScore: parsed.originalityScore || null,
        };
  } catch (error) {
    console.error("Document analysis failed:", error.message);
    return role === "Professor" ? MOCK_PROFESSOR : MOCK_STUDENT;
  }
}

export { analyzeDocument };