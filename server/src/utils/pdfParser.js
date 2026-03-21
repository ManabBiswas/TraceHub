import { createRequire } from "module";

// Use createRequire for CommonJS packages in ESM environment
const require = createRequire(import.meta.url);
const pdfParseModule = require("pdf-parse");

// pdf-parse v2 may export as module.exports = fn  OR  module.exports.default = fn
const pdfParse =
  typeof pdfParseModule === "function"
    ? pdfParseModule
    : pdfParseModule.default || pdfParseModule;

async function extractText(buffer) {
  try {
    if (typeof pdfParse !== "function") {
      throw new Error("pdf-parse did not load as a callable function");
    }
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (error) {
    console.error("PDF parsing error:", error.message);
    throw new Error("Failed to extract text from PDF");
  }
}

export { extractText };