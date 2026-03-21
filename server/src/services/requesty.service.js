import axios from "axios";

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

async function analyzeDocument(text, role) {
  try {
    const prompt = role === "Professor" ? PROFESSOR_PROMPT(text) : STUDENT_PROMPT(text);

    const response = await axios.post(
      "https://router.requesty.ai/v1/chat/completions",
      {
        model: "claude-3-5-sonnet",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.REQUESTY_API_KEY}`
        }
      }
    );

    const raw = response.data.choices[0].message.content;
    const parsed = JSON.parse(raw);

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
    console.error("Requesty error:", error.message);
    return role === "Professor" ? MOCK_PROFESSOR : MOCK_STUDENT;
  }
}

export { analyzeDocument };
