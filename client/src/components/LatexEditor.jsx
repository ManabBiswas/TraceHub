import React, { useState, useEffect, useRef } from "react";

/**
 * LaTeX Editor Component with Tailwind CSS
 * Split-pane editor + live preview with KaTeX rendering
 * 
 * Features:
 * - Live LaTeX source editor (left pane)
 * - Live KaTeX preview (right pane)
 * - 4 document templates
 * - Snippet toolbar (fractions, integrals, matrices, etc.)
 * - Tab key support for indentation
 * - PDF export (print-ready)
 * - Save .tex file
 * - Submit LaTeX source to parent
 */

const TEMPLATES = {
  blank: "",
  
  assignment: `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}

\\title{Assignment Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section*{Problem 1}
Write your solution here.

\\section*{Problem 2}
Write your solution here.

\\end{document}`,

  projectReport: `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}

\\title{Project Report Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
Provide a brief summary of your project.
\\end{abstract}

\\section{Introduction}
Introduce your project and its objectives.

\\section{Methodology}
Describe your approach and methods.

\\section{Results}
Present your findings.

\\section{Conclusion}
Summarize your conclusions and future work.

\\end{document}`,

  mathSheet: `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{geometry}
\\geometry{margin=1in}

\\title{Math Problem Set}
\\author{}
\\date{}

\\begin{document}

\\maketitle

\\section*{Problem 1}

Solve the following:

$$\\int_0^\\pi \\sin(x) \\, dx$$

\\textbf{Solution:}

$$\\left[ -\\cos(x) \\right]_0^\\pi = -\\cos(\\pi) + \\cos(0) = 1 + 1 = 2$$

\\section*{Problem 2}

Find the derivative:

$$\\frac{d}{dx}\\left( x^3 + 2x^2 - 5x + 3 \\right)$$

\\textbf{Solution:}

$$3x^2 + 4x - 5$$

\\end{document}`,
};

const SNIPPETS = [
  { label: "Fraction", insert: "\\frac{}{}" },
  { label: "Integral", insert: "\\int_{a}^{b} f(x) \\, dx" },
  { label: "Sum", insert: "\\sum_{i=1}^{n}" },
  { label: "Matrix", insert: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
  { label: "Bold", insert: "\\textbf{}" },
  { label: "Italic", insert: "\\textit{}" },
  { label: "Section", insert: "\\section{Title}" },
  { label: "Subsection", insert: "\\subsection{Title}" },
  { label: "Bullet List", insert: "\\begin{itemize}\n\\item First\n\\end{itemize}" },
  { label: "Equation", insert: "\\begin{equation*}\n\n\\end{equation*}" },
];

export default function LatexEditor({ onSubmit, initialContent = "" }) {
  const [content, setContent] = useState(initialContent);
  const [preview, setPreview] = useState("");
  const [layout, setLayout] = useState("split"); // "split" | "editor" | "preview"
  const [katexLoaded, setKatexLoaded] = useState(false);
  const [renderError, setRenderError] = useState("");
  const editorRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Load KaTeX from CDN
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!window.katex) {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
      script.async = true;
      script.onload = () => {
        const styleLink = document.createElement("link");
        styleLink.rel = "stylesheet";
        styleLink.href =
          "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
        document.head.appendChild(styleLink);
        setKatexLoaded(true);
      };
      document.head.appendChild(script);
    } else {
      setKatexLoaded(true);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Live preview with KaTeX rendering
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!katexLoaded) return;

    try {
      setRenderError("");
      const rendered = renderLatexPreview(content);
      setPreview(rendered);
    } catch (error) {
      setRenderError(error.message);
      setPreview("<p style='color: red;'>Rendering error</p>");
    }
  }, [content, katexLoaded]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render LaTeX to HTML with KaTeX
  // ─────────────────────────────────────────────────────────────────────────
  function renderLatexPreview(latexSource) {
    let html = latexSource
      .replace(/\\maketitle/, "") // Skip maketitle in preview
      .replace(/\\documentclass\{[^}]*\}/, "")
      .replace(/\\usepackage\{[^}]*\}/g, "")
      .replace(/\\geometry\{[^}]*\}/g, "")
      .replace(/\\begin{document}/, "")
      .replace(/\\end{document}/, "");

    // Handle titles
    html = html.replace(/\\title\{([^}]*)\}/g, "<h1>$1</h1>");
    html = html.replace(/\\author\{([^}]*)\}/g, "<p><em>$1</em></p>");
    html = html.replace(/\\date\{([^}]*)\}/g, "<p><small>$1</small></p>");

    // Handle sections
    html = html.replace(/\\section\*?\{([^}]*)\}/g, "<h2>$1</h2>");
    html = html.replace(/\\subsection\*?\{([^}]*)\}/g, "<h3>$1</h3>");

    // Handle text formatting
    html = html.replace(/\\textbf\{([^}]*)\}/g, "<strong>$1</strong>");
    html = html.replace(/\\textit\{([^}]*)\}/g, "<em>$1</em>");
    html = html.replace(/\\texttt\{([^}]*)\}/g, "<code>$1</code>");

    // Handle abstract
    html = html.replace(
      /\\begin{abstract}([\s\S]*?)\\end{abstract}/g,
      "<blockquote><p>$1</p></blockquote>"
    );

    // Handle itemize lists
    html = html.replace(/\\begin{itemize}/, "<ul>");
    html = html.replace(/\\end{itemize}/, "</ul>");
    html = html.replace(/\\item\s+/g, "<li>");
    html = html.replace(/\n(?=\\item|\\end{itemize})/g, "</li>\n");

    // Parse math: both display ($$) and inline ($)
    html = parseKatexMath(html);

    return html || "<p><em>Start typing...</em></p>";
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Parse and render math expressions with KaTeX - FIXED
  // ─────────────────────────────────────────────────────────────────────────
  function parseKatexMath(html) {
    if (!window.katex) return html;

    // First, protect display math $$ ... $$ by replacing with placeholders
    const displayMathPlaceholders = [];
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, expr) => {
      try {
        const rendered = window.katex.renderToString(expr.trim(), {
          throwOnError: true,
        });
        displayMathPlaceholders.push(
          `<div class="my-2 text-center katex-display">${rendered}</div>`
        );
        return `__DISPLAY_MATH_${displayMathPlaceholders.length - 1}__`;
      } catch (err) {
        displayMathPlaceholders.push(
          `<div class="my-2 p-2 bg-red-900/20 text-red-300 rounded text-sm">Math error in: ${expr.substring(0, 30)}</div>`
        );
        return `__DISPLAY_MATH_${displayMathPlaceholders.length - 1}__`;
      }
    });

    // Now handle inline math $ ... $
    const inlineMathPlaceholders = [];
    html = html.replace(/\$([^$\n]+?)\$/g, (match, expr) => {
      // Skip if it's a placeholder
      if (expr.includes("__DISPLAY_MATH_") || expr.includes("__INLINE_MATH_")) {
        return match;
      }
      try {
        const rendered = window.katex.renderToString(expr.trim(), {
          throwOnError: true,
        });
        inlineMathPlaceholders.push(
          `<span class="katex-inline px-1">${rendered}</span>`
        );
        return `__INLINE_MATH_${inlineMathPlaceholders.length - 1}__`;
      } catch (err) {
        // Just return the original $...$ if it fails
        return match;
      }
    });

    // Restore placeholders
    displayMathPlaceholders.forEach((placeholder, idx) => {
      html = html.replace(`__DISPLAY_MATH_${idx}__`, placeholder);
    });

    inlineMathPlaceholders.forEach((placeholder, idx) => {
      html = html.replace(`__INLINE_MATH_${idx}__`, placeholder);
    });

    return html;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Handle Tab key in editor (2-space indent)
  // ─────────────────────────────────────────────────────────────────────────
  function handleKeyDown(e) {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = editorRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent =
        content.substring(0, start) + "  " + content.substring(end);
      setContent(newContent);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Insert snippet at cursor position
  // ─────────────────────────────────────────────────────────────────────────
  function insertSnippet(snippet) {
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent =
      content.substring(0, start) + snippet + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + snippet.length;
    }, 0);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Load template
  // ─────────────────────────────────────────────────────────────────────────
  function loadTemplate(templateName) {
    setContent(TEMPLATES[templateName] || "");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Export PDF (print-ready preview)
  // ─────────────────────────────────────────────────────────────────────────
  function exportPDF() {
    const printWindow = window.open("", "_blank");
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>LaTeX Export</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        <style>
          body { font-family: "Computer Modern", serif; margin: 2cm; }
          h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; }
          p { line-height: 1.6; }
          blockquote { border-left: 3px solid #ccc; padding-left: 1em; margin-left: 0; }
          ul { margin-left: 2em; }
          .katex-display { display: block; margin: 1em 0; text-align: center; }
          .katex-inline { display: inline; }
        </style>
      </head>
      <body>
        ${preview}
        <script>
          window.print();
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Save as .tex file
  // ─────────────────────────────────────────────────────────────────────────
  function saveTex() {
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(content)
    );
    element.setAttribute("download", "document.tex");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Submit LaTeX source
  // ─────────────────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (onSubmit) {
      onSubmit(content);
    }
  }

  return (
    <div className="rounded border border-white/10 bg-[#0f1613d9] p-4 space-y-3">
      {/* ──── Header: Templates ──── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        <span className="text-xs font-semibold text-[#8cf0c8]">📋 Templates:</span>
        <button
          onClick={() => loadTemplate("blank")}
          className="rounded bg-white/10 hover:bg-white/20 px-2 py-1 text-xs text-[#d8ebe3] transition"
          title="Start blank"
        >
          Blank
        </button>
        <button
          onClick={() => loadTemplate("assignment")}
          className="rounded bg-white/10 hover:bg-white/20 px-2 py-1 text-xs text-[#d8ebe3] transition"
          title="Assignment"
        >
          Assignment
        </button>
        <button
          onClick={() => loadTemplate("projectReport")}
          className="rounded bg-white/10 hover:bg-white/20 px-2 py-1 text-xs text-[#d8ebe3] transition"
          title="Project Report"
        >
          Report
        </button>
        <button
          onClick={() => loadTemplate("mathSheet")}
          className="rounded bg-white/10 hover:bg-white/20 px-2 py-1 text-xs text-[#d8ebe3] transition"
          title="Math Sheet"
        >
          Math
        </button>
      </div>

      {/* ──── Snippets Toolbar ──── */}
      <div className="space-y-1">
        <span className="text-xs font-semibold text-[#8cf0c8]">⚡ Quick Insert:</span>
        <div className="flex flex-wrap gap-1 overflow-x-auto pb-2">
          {SNIPPETS.map((snippet) => (
            <button
              key={snippet.label}
              onClick={() => insertSnippet(snippet.insert)}
              className="rounded bg-[#2ff5a8]/15 hover:bg-[#2ff5a8]/25 border border-[#2ff5a838] px-2 py-1 text-xs text-[#8cf0c8] font-medium transition whitespace-nowrap"
              title={`Insert: ${snippet.insert}`}
            >
              {snippet.label}
            </button>
          ))}
        </div>
      </div>

      {/* ──── Layout Toggle ──── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <span className="text-xs font-semibold text-[#8cf0c8]">👁️ View:</span>
        <button
          onClick={() => setLayout("split")}
          className={`rounded px-2 py-1 text-xs font-medium transition ${
            layout === "split"
              ? "bg-[#2ff5a8] text-[#142019]"
              : "bg-white/10 text-[#d8ebe3] hover:bg-white/20"
          }`}
        >
          Split
        </button>
        <button
          onClick={() => setLayout("editor")}
          className={`rounded px-2 py-1 text-xs font-medium transition ${
            layout === "editor"
              ? "bg-[#2ff5a8] text-[#142019]"
              : "bg-white/10 text-[#d8ebe3] hover:bg-white/20"
          }`}
        >
          Editor
        </button>
        <button
          onClick={() => setLayout("preview")}
          className={`rounded px-2 py-1 text-xs font-medium transition ${
            layout === "preview"
              ? "bg-[#2ff5a8] text-[#142019]"
              : "bg-white/10 text-[#d8ebe3] hover:bg-white/20"
          }`}
        >
          Preview
        </button>
      </div>

      {/* ──── Main Editor & Preview Area ──── */}
      <div className={`flex gap-1 min-h-96 rounded border border-white/10 overflow-hidden ${
        layout === "split" ? "flex-row" : ""
      } ${layout === "editor" ? "flex-row" : ""} ${layout === "preview" ? "flex-row" : ""}`}>
        {/* Editor Pane */}
        {(layout === "split" || layout === "editor") && (
          <div className={`flex flex-col bg-[#1f292580] overflow-hidden ${
            layout === "split" ? "flex-1 border-r border-white/10" : "flex-1"
          }`}>
            <div className="px-3 py-2 border-b border-white/10 bg-[#0f1613d9]">
              <p className="text-xs font-semibold text-[#8cf0c8]">📝 LaTeX Source</p>
            </div>
            <textarea
              ref={editorRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter LaTeX code here... Tab key adds indentation"
              className="flex-1 p-3 bg-[#1f2925cc] text-[#d8ebe3] font-mono text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#2ff5a8]/50 resize-none scrollbar-custom"
            />
            <div className="px-3 py-1 text-xs text-[#8cf0c8] bg-[#0f1613d9] border-t border-white/10">
              💡 {content.length} chars
            </div>
          </div>
        )}

        {/* Preview Pane */}
        {(layout === "split" || layout === "preview") && (
          <div className={`flex flex-col bg-[#1f292580] overflow-hidden ${
            layout === "split" ? "flex-1" : "flex-1"
          }`}>
            <div className="px-3 py-2 border-b border-white/10 bg-[#0f1613d9]">
              <p className="text-xs font-semibold text-[#8cf0c8]">
                {katexLoaded ? "✓ Live Preview" : "📡 Loading KaTeX..."}
              </p>
            </div>
            <div className="flex-1 overflow-auto p-3 bg-[#1f2925cc] text-[#d8ebe3]">
              {!katexLoaded ? (
                <p className="text-sm text-[#8cf0c8]">Loading KaTeX renderer...</p>
              ) : renderError ? (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded text-sm text-red-300">
                  ⚠️ Error: {renderError}
                </div>
              ) : preview ? (
                <div
                  className="prose prose-invert max-w-none text-sm leading-relaxed
                    [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-[#2ff5a8] [&_h1]:mt-3 [&_h1]:mb-2
                    [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[#8cf0c8] [&_h2]:mt-3 [&_h2]:mb-2
                    [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-[#8cf0c8] [&_h3]:mt-2 [&_h3]:mb-1
                    [&_p]:text-[#d8ebe3] [&_p]:leading-6
                    [&_strong]:text-[#2ff5a8] [&_strong]:font-bold
                    [&_em]:text-[#8cf0c8] [&_em]:italic
                    [&_code]:bg-[#0f1613d9] [&_code]:px-1 [&_code]:rounded [&_code]:text-[#2ff5a8]
                    [&_blockquote]:border-l-2 [&_blockquote]:border-[#2ff5a8] [&_blockquote]:pl-3 [&_blockquote]:text-[#bcd2c9]
                    [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1
                    [&_li]:text-[#d8ebe3]"
                  dangerouslySetInnerHTML={{ __html: preview }}
                />
              ) : (
                <p className="text-[#8cf0c8]">Start typing to see preview...</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ──── Action Buttons ──── */}
      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
        <button
          onClick={exportPDF}
          className="rounded bg-[#2ff5a8]/20 hover:bg-[#2ff5a8]/30 border border-[#2ff5a838] px-3 py-1.5 text-xs font-semibold text-[#8cf0c8] transition"
          title="Export as PDF"
        >
          📄 PDF
        </button>
        <button
          onClick={saveTex}
          className="rounded bg-[#2ff5a8]/20 hover:bg-[#2ff5a8]/30 border border-[#2ff5a838] px-3 py-1.5 text-xs font-semibold text-[#8cf0c8] transition"
          title="Download .tex file"
        >
          💾 .tex
        </button>
        {onSubmit && (
          <button
            onClick={handleSubmit}
            className="ml-auto rounded bg-[#2ff5a8] hover:bg-[#24d993] px-4 py-1.5 text-sm font-semibold text-[#142019] transition"
            title="Submit LaTeX document"
          >
            ✓ Submit Document
          </button>
        )}
      </div>
    </div>
  );
}
