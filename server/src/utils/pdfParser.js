import { createRequire } from "module";

// Use createRequire for CommonJS packages in ESM environment
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

async function extractText(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error("PDF parsing error:", error.message);
    throw new Error("Failed to extract text from PDF");
  }
}

export { extractText };