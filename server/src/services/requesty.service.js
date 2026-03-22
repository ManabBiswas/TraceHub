import axios from "axios";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Clean JSON from markdown wrappers
// ─────────────────────────────────────────────────────────────────────────────

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
// MOVED TO: Use aiRouting.service.js instead for Groq + Gemini fallback
// ─────────────────────────────────────────────────────────────────────────────
// This file is DEPRECATED. Use the new dual-provider system in aiRouting.service.js

const PROFESSOR_PROMPT = (text) => `
You are an academic assistant. Analyze this syllabus/lecture notes and return ONLY a JSON object 
with no markdown, no preamble. Format:
{
  "summary": "3-sentence summary of the document",
  "tags": ["tag1", "tag2", "tag3"],
  "flashcards": [
    { "q": "Question", "a": "Answer" }
  ]
}
Limit to 5 flashcards. Document text:
---
${text.substring(0, 4000)}
`;

const STUDENT_PROMPT = (text) => `
You are a technical evaluator. Analyze this project README/abstract and return ONLY a JSON object 
with no markdown, no preamble. Format:
{
  "summary": "2-sentence architecture summary",
  "techStack": ["Tech1", "Tech2"],
  "tags": ["tag1", "tag2"],
  "originalityScore": 75
}
originalityScore is 0-100 based on architectural complexity and novelty described. Document:
---
${text.substring(0, 4000)}
`;

const MOCK_PROFESSOR = {
  summary:
    "Document uploaded successfully. AI analysis unavailable. The document contains academic content relevant to the uploaded material.",
  tags: ["uploaded"],
  flashcards: []
};

const MOCK_STUDENT = {
  summary:
    "Project uploaded successfully. Technical analysis unavailable at this moment.",
  techStack: ["Backend", "Frontend"],
  tags: ["uploaded"],
  originalityScore: 70
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
      temperature: 0.3,
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
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.3,
      },
    },
    {
      timeout: 15000,
    }
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
          flashcards: parsed.flashcards || []
        }
      : {
          summary: parsed.summary,
          techStack: parsed.techStack || [],
          tags: parsed.tags || [],
          originalityScore: parsed.originalityScore || null
        };
  } catch (error) {
    console.error("Document analysis failed:", error.message);
    return role === "Professor" ? MOCK_PROFESSOR : MOCK_STUDENT;
  }
}

export { analyzeDocument };
