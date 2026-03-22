import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../config/Api";
import { useAuth } from "../context/AuthContext";
import LatexEditor from "../components/LatexEditor";

const ClassroomPostDetails = () => {
  const navigate = useNavigate();
  const { classroomId, postId } = useParams();
  const { isStudent, isProfessor, isAdmin } = useAuth();
  const canEditPost = isProfessor || isAdmin;

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [postHistory, setPostHistory] = useState([]);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [mySubmission, setMySubmission] = useState(null);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
  const [selectedSubmissionHistory, setSelectedSubmissionHistory] = useState(
    [],
  );
  const [verificationResult, setVerificationResult] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [postEditForm, setPostEditForm] = useState({
    title: "",
    body: "",
    dueDate: "",
    points: "",
    files: [],
  });
  const [submissionForm, setSubmissionForm] = useState({
    link: "",
    text: "",
    files: [],
  });
  const [showLatexEditor, setShowLatexEditor] = useState(false);
  const [latexContent, setLatexContent] = useState("");
  const [latexPreview, setLatexPreview] = useState(null);
  const [showLatexModal, setShowLatexModal] = useState(false);

  const formatDateTime = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString();
  };

  const loadSubmissionTimeline = async (submissionId) => {
    if (!submissionId) {
      setSubmissionHistory([]);
      return;
    }

    const response = await api.classrooms.getSubmissionHistory(
      classroomId,
      postId,
      submissionId,
    );

    if (response.error) {
      setSubmissionHistory([]);
      return;
    }

    setSubmissionHistory(response.versions || []);
  };

  const loadTeacherSubmissions = async () => {
    const response = await api.classrooms.getSubmissions(classroomId, postId);
    if (response.error) {
      setAllSubmissions([]);
      return;
    }
    setAllSubmissions(response.submissions || []);
  };

  const loadSelectedSubmissionHistory = async (submissionId) => {
    const response = await api.classrooms.getSubmissionHistory(
      classroomId,
      postId,
      submissionId,
    );
    if (response.error) {
      setSelectedSubmissionHistory([]);
      return;
    }
    setSelectedSubmissionHistory(response.versions || []);
    setSelectedSubmissionId(submissionId);
  };

  const downloadSubmissionFile = async (submissionId, fileIndex) => {
    const result = await api.classrooms.downloadSubmissionFile(
      classroomId,
      postId,
      submissionId,
      fileIndex,
    );
    if (result.error) {
      setError(result.error);
      return;
    }
    const url = window.URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const verifyVersionIntegrity = async (version) => {
    // Check if version has an Algorand TX ID
    if (!version.algorandTxId || version.algorandTxId.startsWith("DEMO_")) {
      setVerificationResult({
        verified: false,
        message: "This version was recorded in demo mode (not on blockchain)",
        txId: version.algorandTxId,
      });
    } else {
      setVerificationResult({
        verified: true,
        message: "✓ Version integrity verified on Algorand blockchain",
        txId: version.algorandTxId,
        timestamp: version.updatedAt,
        action: version.action,
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render LaTeX content to HTML (same logic as editor)
  // ─────────────────────────────────────────────────────────────────────────
  const renderLatexToHtml = (latexSource) => {
    let html = latexSource
      .replace(/\\maketitle/, "")
      .replace(/\\documentclass\{[^}]*\}/, "")
      .replace(/\\usepackage\{[^}]*\}/g, "")
      .replace(/\\geometry\{[^}]*\}/g, "")
      .replace(/\\begin{document}/, "")
      .replace(/\\end{document}/, "");

    // Titles and metadata
    html = html.replace(/\\title\{([^}]*)\}/g, "<h1>$1</h1>");
    html = html.replace(/\\author\{([^}]*)\}/g, "<p><em>$1</em></p>");
    html = html.replace(/\\date\{([^}]*)\}/g, "<p><small>$1</small></p>");

    // Sections
    html = html.replace(/\\section\*?\{([^}]*)\}/g, "<h2>$1</h2>");
    html = html.replace(/\\subsection\*?\{([^}]*)\}/g, "<h3>$1</h3>");

    // Text formatting
    html = html.replace(/\\textbf\{([^}]*)\}/g, "<strong>$1</strong>");
    html = html.replace(/\\textit\{([^}]*)\}/g, "<em>$1</em>");
    html = html.replace(/\\texttt\{([^}]*)\}/g, "<code>$1</code>");

    // Abstract
    html = html.replace(
      /\\begin{abstract}([\s\S]*?)\\end{abstract}/g,
      "<blockquote><p>$1</p></blockquote>"
    );

    // Lists
    html = html.replace(/\\begin{itemize}/, "<ul>");
    html = html.replace(/\\end{itemize}/, "</ul>");
    html = html.replace(/\\item\s+/g, "<li>");
    html = html.replace(/\n(?=\\item|\\end{itemize})/g, "</li>\n");

    // Parse math with placeholders
    const displayMathPlaceholders = [];
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, expr) => {
      try {
        if (window.katex) {
          const rendered = window.katex.renderToString(expr.trim(), {
            throwOnError: true,
          });
          displayMathPlaceholders.push(
            `<div class="my-2 text-center">${rendered}</div>`
          );
        } else {
          displayMathPlaceholders.push(
            `<div class="my-2 p-2 text-center text-sm text-gray-400">$$${expr}$$</div>`
          );
        }
      } catch {
        displayMathPlaceholders.push(
          `<div class="my-2 p-2 bg-red-900/20 text-red-300 rounded text-sm">Math error</div>`
        );
      }
      return `__DISPLAY_MATH_${displayMathPlaceholders.length - 1}__`;
    });

    const inlineMathPlaceholders = [];
    html = html.replace(/\$([^$\n]+?)\$/g, (match, expr) => {
      if (expr.includes("__DISPLAY_MATH_") || expr.includes("__INLINE_MATH_")) {
        return match;
      }
      try {
        if (window.katex) {
          const rendered = window.katex.renderToString(expr.trim(), {
            throwOnError: true,
          });
          inlineMathPlaceholders.push(
            `<span>${rendered}</span>`
          );
        } else {
          inlineMathPlaceholders.push(`<span>$${expr}$</span>`);
        }
      } catch {
        return match;
      }
      return `__INLINE_MATH_${inlineMathPlaceholders.length - 1}__`;
    });

    displayMathPlaceholders.forEach((placeholder, idx) => {
      html = html.replace(`__DISPLAY_MATH_${idx}__`, placeholder);
    });

    inlineMathPlaceholders.forEach((placeholder, idx) => {
      html = html.replace(`__INLINE_MATH_${idx}__`, placeholder);
    });

    return html || "<p><em>Empty document</em></p>";
  };

  const openLatexPreview = (latexText) => {
    // Extract LaTeX source from the submission text
    const match = latexText.match(/\[LaTeX Document[^\n]*\]\n\n([\s\S]*)/);
    const source = match ? match[1] : latexText;
    setLatexPreview(source);
    setShowLatexModal(true);
  };

  // Load KaTeX for LaTeX rendering
  useEffect(() => {
    if (!window.katex) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
      script.async = true;
      script.onload = () => {
        const styleLink = document.createElement("link");
        styleLink.rel = "stylesheet";
        styleLink.href =
          "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
        document.head.appendChild(styleLink);
      };
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    const run = async () => {
      setLoading(true);
      setError("");

      const response = await api.classrooms.getPosts(classroomId);
      if (!isActive) return;

      if (response.error) {
        setLoading(false);
        setError(response.error);
        return;
      }

      const foundPost = (response.posts || []).find(
        (item) => item._id === postId,
      );
      if (!foundPost) {
        setLoading(false);
        setError("Post not found");
        return;
      }

      setPost(foundPost);
      setPostEditForm({
        title: foundPost.title || "",
        body: foundPost.body || "",
        dueDate: foundPost.dueDate
          ? new Date(foundPost.dueDate).toISOString().slice(0, 16)
          : "",
        points:
          foundPost.points === null || typeof foundPost.points === "undefined"
            ? ""
            : String(foundPost.points),
        files: [],
      });

      setTimelineLoading(true);
      const postHistoryResponse = await api.classrooms.getPostHistory(
        classroomId,
        postId,
      );
      if (!isActive) return;

      setPostHistory(postHistoryResponse.versions || []);

      if (foundPost.type === "ASSIGNMENT" && isStudent) {
        const mySubmissionResponse = await api.classrooms.getMySubmission(
          classroomId,
          postId,
        );
        if (!isActive) return;

        const existingSubmission = mySubmissionResponse.submission || null;
        setMySubmission(existingSubmission);

        if (existingSubmission?._id) {
          await loadSubmissionTimeline(existingSubmission._id);
          if (!isActive) return;
        } else {
          setSubmissionHistory([]);
        }
      }

      if (foundPost.type === "ASSIGNMENT" && canEditPost) {
        await loadTeacherSubmissions();
        if (!isActive) return;
      }

      setTimelineLoading(false);
      setLoading(false);
    };

    void run();

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId, postId, isStudent, canEditPost]);

  const formatSubmissionDateTime = (dateValue) => {
    if (!dateValue) return { date: "-", time: "-" };
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return { date: "-", time: "-" };
    return {
      date: parsedDate.toLocaleDateString(),
      time: parsedDate.toLocaleTimeString(),
    };
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!post || post.type !== "ASSIGNMENT") return;

    setError("");
    setMessage("");

    const response = await api.classrooms.submitAssignment(
      classroomId,
      post._id,
      {
        link: submissionForm.link,
        text: submissionForm.text,
        files: submissionForm.files,
      },
    );
    const formData = new FormData();
    formData.append("link", submissionForm.link);
    formData.append("text", submissionForm.text);
    submissionForm.files.forEach((file) => {
      formData.append("files", file);
    });

    if (response.error) {
      setError(response.error);
      return;
    }

    setMessage(response.message || "Assignment submitted");
    setSubmissionForm({ link: "", text: "", files: [] });

    if (response.submission?._id) {
      setMySubmission(response.submission);
      await loadSubmissionTimeline(response.submission._id);
    }
  };

  const handleLatexSubmit = async (submitData) => {
    setError("");
    setMessage("");

    try {
      // Handle both direct string and object format
      const { latexSource, wordCount } = typeof submitData === "string"
        ? { latexSource: submitData, wordCount: 0 }
        : submitData || { latexSource: "", wordCount: 0 };

      const response = await api.classrooms.submitAssignment(
        classroomId,
        post._id,
        {
          link: "",
          text: `[LaTeX Document — ${wordCount || 0} words]\n\n${latexSource}`,
          files: [],
        },
      );

      if (response.error) {
        setError(response.error);
        throw new Error(response.error);
      }

      setMessage("✓ LaTeX assignment submitted successfully!");

      if (response.submission?._id) {
        setMySubmission(response.submission);
        await loadSubmissionTimeline(response.submission._id);
      }

      setShowLatexEditor(false);
      setLatexContent("");
    } catch (err) {
      setError(err.message || "Failed to submit LaTeX document");
    }
  };

  const handleSavePostChanges = async () => {
    if (!post || !canEditPost) return;

    setSavingPost(true);
    setError("");
    setMessage("");

    const payload = {
      title: postEditForm.title,
      body: postEditForm.body,
      dueDate: postEditForm.dueDate ? new Date(postEditForm.dueDate) : null,
      points:
        postEditForm.points.trim().length > 0
          ? Number(postEditForm.points)
          : null,
      files: postEditForm.files,
    };

    const response = await api.classrooms.updatePost(
      classroomId,
      post._id,
      payload,
    );

    setSavingPost(false);

    if (response.error) {
      setError(response.error);
      return;
    }

    setPost(response.post || post);
    setEditingPost(false);
    setMessage(response.message || "Post updated");

    const historyResponse = await api.classrooms.getPostHistory(
      classroomId,
      post._id,
    );
    if (!historyResponse?.error) {
      setPostHistory(historyResponse.versions || []);
    }
  };

  const submission = formatSubmissionDateTime(post?.dueDate);

  return (
    <div className="mx-auto w-full max-w-360 rounded-2xl bg-[radial-gradient(640px_360px_at_22%_6%,rgba(47,245,168,0.23),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)] p-4 text-[#e8f2ed] md:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Post Details</h1>
        <button
          type="button"
          onClick={() => navigate("/classrooms")}
          className="rounded border border-white/20 px-3 py-1 text-sm"
        >
          Back to Classrooms
        </button>
      </div>

      {loading && <p className="mb-4 text-[#bcd2c9]">Loading...</p>}
      {error && (
        <p className="mb-4 rounded border border-red-500/40 bg-red-500/20 p-3 text-sm">
          {error}
        </p>
      )}
      {message && (
        <p className="mb-4 rounded border border-emerald-500/40 bg-emerald-500/20 p-3 text-sm">
          {message}
        </p>
      )}

      {!loading && !error && post && (
        <section className="rounded-xl border border-[#2ff5a838] bg-white/10 p-4">
          {editingPost ? (
            <input
              value={postEditForm.title}
              onChange={(e) =>
                setPostEditForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full rounded border border-white/20 bg-[#1f2925cc] px-3 py-2 text-2xl font-semibold"
            />
          ) : (
            <h2 className="text-2xl font-semibold">{post.title}</h2>
          )}
          <p className="mt-1 text-sm text-[#bcd2c9]">{post.type}</p>

          {canEditPost && (
            <div className="mt-3 flex flex-wrap gap-2">
              {!editingPost ? (
                <button
                  type="button"
                  className="rounded border border-[#2ff5a8] px-3 py-1 text-xs font-semibold text-[#d8ebe3] hover:bg-[#2ff5a81a]"
                  onClick={() => setEditingPost(true)}
                >
                  Edit Post
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="rounded bg-[#2ff5a8] px-3 py-1 text-xs font-semibold text-[#142019]"
                    disabled={savingPost}
                    onClick={() => {
                      void handleSavePostChanges();
                    }}
                  >
                    {savingPost ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-white/20 px-3 py-1 text-xs"
                    disabled={savingPost}
                    onClick={() => {
                      setEditingPost(false);
                      setPostEditForm({
                        title: post.title || "",
                        body: post.body || "",
                        dueDate: post.dueDate
                          ? new Date(post.dueDate).toISOString().slice(0, 16)
                          : "",
                        points:
                          post.points === null ||
                          typeof post.points === "undefined"
                            ? ""
                            : String(post.points),
                        files: [],
                      });
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}

          {post.type === "ASSIGNMENT" && (
            <div className="mt-3 rounded border border-white/10 bg-[#0f1613a6] p-3">
              <div className="flex flex-wrap items-center gap-x-10 gap-y-2 text-base font-bold tracking-wide text-[#e8f2ed] md:gap-x-14">
                <span>Submission:</span>
                <span>Date:- {submission.date}</span>
                <span>Time:- {submission.time}</span>
              </div>
            </div>
          )}

          {(post.body || editingPost) && (
            <div className="mt-4 rounded border border-white/10 bg-[#1f292580] p-3">
              <p className="mb-1 font-semibold">Details</p>
              {editingPost ? (
                <textarea
                  rows={4}
                  value={postEditForm.body}
                  onChange={(e) =>
                    setPostEditForm((prev) => ({
                      ...prev,
                      body: e.target.value,
                    }))
                  }
                  className="w-full rounded border border-white/20 bg-[#1f2925cc] px-3 py-2 text-sm"
                />
              ) : (
                <p className="text-sm leading-7 text-[#d8ebe3]">{post.body}</p>
              )}
            </div>
          )}

          {editingPost && (
            <div className="mt-4 space-y-3 rounded border border-white/10 bg-[#1f292580] p-3">
              {(post.type === "ASSIGNMENT" || post.type === "PROJECT") && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-[#9fc0b2]">
                      Due Date
                    </label>
                    <input
                      type="datetime-local"
                      value={postEditForm.dueDate}
                      onChange={(e) =>
                        setPostEditForm((prev) => ({
                          ...prev,
                          dueDate: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-white/20 bg-[#1f2925cc] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#9fc0b2]">
                      Points
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={postEditForm.points}
                      onChange={(e) =>
                        setPostEditForm((prev) => ({
                          ...prev,
                          points: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-white/20 bg-[#1f2925cc] px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="mb-2 block text-xs text-[#9fc0b2]">
                  Add Attachments (optional)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor="post-files"
                    className="inline-flex cursor-pointer items-center justify-center rounded-md border border-[#2ff5a8] bg-[#2ff5a8] px-4 py-2 text-sm font-semibold text-[#142019] transition btn-primary-animated"
                  >
                    Choose Files
                  </label>
                  <span className="text-xs text-[#bcd2c9]">
                    {postEditForm.files.length > 0
                      ? `${postEditForm.files.length} file(s) selected`
                      : "No file chosen"}
                  </span>
                </div>
                <input
                  id="post-files"
                  type="file"
                  multiple
                  onChange={(e) =>
                    setPostEditForm((prev) => ({
                      ...prev,
                      files: Array.from(e.target.files || []),
                    }))
                  }
                  className="hidden"
                />
              </div>
            </div>
          )}

          {Array.isArray(post.attachments) && post.attachments.length > 0 && (
            <div className="mt-4 rounded border border-white/10 bg-[#1f292580] p-3">
              <p className="mb-2 font-semibold">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {post.attachments.map((attachment, index) => (
                  <button
                    key={`${post._id}-attachment-${index}`}
                    type="button"
                    onClick={() => {
                      if (attachment.url) {
                        window.open(attachment.url, "_blank");
                      } else {
                        alert("Attachment URL not available");
                      }
                    }}
                    disabled={!attachment.url}
                    className={`rounded border px-2 py-1 text-xs ${
                      attachment.url
                        ? "border-white/20 cursor-pointer hover:bg-white/10"
                        : "border-white/5 cursor-not-allowed opacity-50"
                    }`}
                  >
                    {attachment.title || `Attachment ${index + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {post.type === "ASSIGNMENT" && isStudent ? (
            <div className="mt-4 space-y-3">
              {/* Tab switcher — Standard or LaTeX */}
              <div className="flex gap-2 rounded-xl border border-[#2ff5a838] bg-[#0f1613d9] p-1 w-fit">
                <button
                  type="button"
                  onClick={() => setShowLatexEditor(false)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition btn-secondary-animated ${
                    !showLatexEditor
                      ? "bg-[#2ff5a8] text-[#142019]"
                      : "text-[#8cf0c8] hover:bg-[#2ff5a815]"
                  }`}
                >
                  📎 Standard Upload
                </button>
                <button
                  type="button"
                  onClick={() => setShowLatexEditor(true)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition btn-secondary-animated ${
                    showLatexEditor
                      ? "bg-[#2ff5a8] text-[#142019]"
                      : "text-[#8cf0c8] hover:bg-[#2ff5a815]"
                  }`}
                >
                  ∑ Write in LaTeX
                </button>
              </div>

              {/* ── Standard upload form ── */}
              {!showLatexEditor && (
                <form
                  onSubmit={handleSubmitAssignment}
                  className="rounded border border-white/10 bg-[#0f1613d9] p-3"
                >
                  <p className="mb-2 text-sm font-semibold">Upload document</p>
                  <input
                    className="mb-2 w-full rounded bg-[#1f2925cc] p-2 text-sm"
                    placeholder="Submission link (optional)"
                    value={submissionForm.link}
                    onChange={(e) =>
                      setSubmissionForm((prev) => ({
                        ...prev,
                        link: e.target.value,
                      }))
                    }
                  />
                  <textarea
                    className="mb-2 w-full rounded bg-[#1f2925cc] p-2 text-sm"
                    placeholder="Notes/text (optional)"
                    value={submissionForm.text}
                    onChange={(e) =>
                      setSubmissionForm((prev) => ({
                        ...prev,
                        text: e.target.value,
                      }))
                    }
                  />
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="submission-files"
                      className="inline-flex cursor-pointer items-center justify-center rounded-md border border-[#2ff5a8] bg-[#2ff5a8] px-3 py-1.5 text-sm font-semibold text-[#142019] transition btn-primary-animated"
                    >
                      Choose Files
                    </label>
                    <span className="text-xs text-[#bcd2c9]">
                      {submissionForm.files.length > 0
                        ? `${submissionForm.files.length} file(s) selected`
                        : "No file chosen"}
                    </span>
                  </div>
                  <input
                    id="submission-files"
                    className="hidden"
                    type="file"
                    multiple
                    onChange={(e) =>
                      setSubmissionForm((prev) => ({
                        ...prev,
                        files: Array.from(e.target.files || []),
                      }))
                    }
                  />
                  <button
                    type="submit"
                    className="rounded bg-[#2ff5a8] px-4 py-2 text-sm font-semibold text-[#142019] btn-primary-animated"
                  >
                    Submit Assignment
                  </button>
                </form>
              )}

              {/* ── LaTeX editor ── */}
              {showLatexEditor && (
                <LatexEditor
                  postTitle={post.title}
                  onSubmit={handleLatexSubmit}
                />
              )}
            </div>
          ) : post.type === "ASSIGNMENT" ? (
            <p className="mt-4 rounded border border-white/10 bg-[#0f1613d9] p-3 text-sm text-[#bcd2c9]">
              Upload and submission are available only for students.
            </p>
          ) : (
            <p className="mt-4 rounded border border-white/10 bg-[#0f1613d9] p-3 text-sm text-[#bcd2c9]">
              Upload and submission are available only for assignment posts.
            </p>
          )}

          <div className="mt-4 rounded border border-[#2ff5a838] bg-[#0f1613d9] p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#e8f2ed]">
                Post Timeline (Blockchain Versions)
              </p>
              <span className="text-xs text-[#9fc0b2]">
                {postHistory.length} version(s)
              </span>
            </div>

            {timelineLoading ? (
              <p className="text-sm text-[#bcd2c9]">Loading timeline...</p>
            ) : postHistory.length === 0 ? (
              <p className="text-sm text-[#bcd2c9]">No post versions yet.</p>
            ) : (
              <div className="max-h-56 overflow-y-auto rounded border border-[#3f5148] bg-[#0f160f] p-2">
                <div className="space-y-2">
                  {postHistory.map((version) => (
                    <div
                      key={`post-v-${version.versionNumber}`}
                      className="rounded border border-white/10 bg-[#1f292580] p-2 text-xs"
                    >
                      <p className="font-semibold text-[#e8f2ed]">
                        v{version.versionNumber} - {version.action}
                      </p>
                      {version.title && (
                        <p className="mt-0.5 truncate text-[#cfe5da]">
                          {version.title}
                        </p>
                      )}
                      {version.body && (
                        <p className="mt-0.5 line-clamp-1 text-[#bcd2c9]">
                          {version.body.substring(0, 60)}
                          {version.body.length > 60 ? "..." : ""}
                        </p>
                      )}
                      {version.points !== null &&
                        version.points !== undefined && (
                          <p className="mt-0.5 text-[#8cf0c8]">
                            📊 {version.points} pts
                          </p>
                        )}
                      {version.attachments &&
                        version.attachments.length > 0 && (
                          <div className="mt-0.5">
                            {version.attachments.map((attachment, idx) => (
                              <button
                                key={`attach-${idx}`}
                                type="button"
                                onClick={() => {
                                  if (attachment.url) {
                                    window.open(attachment.url, "_blank");
                                  }
                                }}
                                disabled={!attachment.url}
                                className={`block text-xs ${
                                  attachment.url
                                    ? "text-[#a8e6c1] hover:text-[#2ff5a8] hover:underline cursor-pointer"
                                    : "text-[#8cf0c8]"
                                }`}
                              >
                                📎 {attachment.title || attachment.fileName}
                              </button>
                            ))}
                          </div>
                        )}
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <span className="truncate text-xs text-[#bcd2c9]">
                          {version.updatedByName || "System"}
                        </span>
                        {version.algorandTxId && (
                          <button
                            type="button"
                            onClick={() => verifyVersionIntegrity(version)}
                            className="text-xs text-[#8cf0c8] hover:text-[#2ff5a8] cursor-pointer"
                            title="Verify integrity on blockchain"
                          >
                            {version.algorandTxId.startsWith("DEMO_")
                              ? "⚠️ Demo"
                              : "🔐 Verify"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {post.type === "ASSIGNMENT" && canEditPost && (
            <div className="mt-4 rounded border border-[#2ff5a838] bg-[#0f1613d9] p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#e8f2ed]">
                  All Student Submissions
                </p>
                <span className="text-xs text-[#9fc0b2]">
                  {allSubmissions.length} submission(s)
                </span>
              </div>

              {allSubmissions.length === 0 ? (
                <p className="text-sm text-[#bcd2c9]">No submissions yet.</p>
              ) : (
                <>
                  <div className="max-h-64 overflow-y-auto rounded border border-[#3f5148] bg-[#0f160f] p-2 mb-3">
                    <div className="space-y-2">
                      {allSubmissions.map((submission) => (
                        <button
                          key={submission._id}
                          type="button"
                          onClick={() =>
                            loadSelectedSubmissionHistory(submission._id)
                          }
                          className={`w-full text-left rounded border p-2 text-xs transition ${
                            selectedSubmissionId === submission._id
                              ? "border-[#2ff5a8] bg-[#2ff5a81a]"
                              : "border-white/10 bg-[#1f292580] hover:border-[#2ff5a8]"
                          }`}
                        >
                          <p className="font-semibold text-[#e8f2ed]">
                            {submission.studentId?.name || "Student"}
                          </p>
                          <p className="text-[#bcd2c9]">
                            Status: {submission.status || "-"} | Marks:{" "}
                            {typeof submission.marks === "number"
                              ? submission.marks
                              : "-"}
                          </p>
                          <p className="text-[#8cf0c8]">
                            {submission.contentType && submission.contentType}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedSubmissionId && (
                    <div className="rounded border border-[#2ff5a838] bg-[#0f1613d9] p-3">
                      <p className="mb-2 font-semibold text-[#e8f2ed]">
                        Student Submission History
                      </p>
                      {selectedSubmissionHistory.length === 0 ? (
                        <p className="text-sm text-[#bcd2c9]">
                          No versions found.
                        </p>
                      ) : (
                        <div className="max-h-56 overflow-y-auto rounded border border-[#3f5148] bg-[#0f160f] p-2">
                          <div className="space-y-2">
                            {selectedSubmissionHistory.map((version) => (
                              <div
                                key={`teacher-sub-${version.versionNumber}`}
                                className="rounded border border-white/10 bg-[#1f292580] p-2 text-xs"
                              >
                                <p className="font-semibold text-[#e8f2ed]">
                                  v{version.versionNumber} - {version.action}
                                </p>
                                <p className="mt-0.5 text-[#bcd2c9]">
                                  {version.status || "-"}
                                  {typeof version.marks === "number"
                                    ? ` | 📊 ${version.marks}`
                                    : ""}
                                </p>
                                {version.link && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      window.open(version.link, "_blank")
                                    }
                                    className="mt-0.5 block text-xs text-[#a8e6c1] hover:text-[#2ff5a8] hover:underline cursor-pointer"
                                  >
                                    🔗 {version.link.substring(0, 45)}
                                    {version.link.length > 45 ? "..." : ""}
                                  </button>
                                )}
                                {version.text && (
                                  <>
                                    {version.text.includes("[LaTeX Document") ? (
                                      <button
                                        type="button"
                                        onClick={() => openLatexPreview(version.text)}
                                        className="mt-0.5 inline-block rounded bg-[#2ff5a8]/20 hover:bg-[#2ff5a8]/30 border border-[#2ff5a838] px-2 py-1 text-xs font-semibold text-[#8cf0c8] transition"
                                      >
                                        📝 {version.text.split("\n\n")[0].substring(0, 50)}...
                                      </button>
                                    ) : (
                                      <p className="mt-0.5 line-clamp-1 text-[#bcd2c9]">
                                        {version.text.substring(0, 50)}
                                        {version.text.length > 50 ? "..." : ""}
                                      </p>
                                    )}
                                  </>
                                )}
                                {version.files && version.files.length > 0 && (
                                  <div className="mt-0.5">
                                    {version.files.map((file, idx) => (
                                      <button
                                        key={`file-${idx}`}
                                        type="button"
                                        onClick={() =>
                                          downloadSubmissionFile(
                                            selectedSubmissionId,
                                            idx,
                                          )
                                        }
                                        className="block text-xs text-[#a8e6c1] hover:text-[#2ff5a8] hover:underline cursor-pointer"
                                      >
                                        📎 {file.fileName}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {version.feedback && (
                                  <p className="mt-0.5 line-clamp-1 text-[#bcd2c9]">
                                    💬 {version.feedback.substring(0, 40)}
                                    {version.feedback.length > 40 ? "..." : ""}
                                  </p>
                                )}
                                <div className="mt-1 flex items-center justify-between gap-1">
                                  <span className="truncate text-xs text-[#bcd2c9]">
                                    {version.updatedByName || "System"}
                                  </span>
                                  {version.algorandTxId && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        verifyVersionIntegrity(version)
                                      }
                                      className="text-xs text-[#8cf0c8] hover:text-[#2ff5a8] cursor-pointer"
                                      title="Verify integrity on blockchain"
                                    >
                                      {version.algorandTxId.startsWith("DEMO_")
                                        ? "⚠️ Demo"
                                        : "🔐 Verify"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {post.type === "ASSIGNMENT" && isStudent && (
            <div className="mt-4 rounded border border-[#2ff5a838] bg-[#0f1613d9] p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#e8f2ed]">
                  My Submission Timeline
                </p>
                <span className="text-xs text-[#9fc0b2]">
                  {submissionHistory.length} version(s)
                </span>
              </div>

              {!mySubmission ? (
                <p className="text-sm text-[#bcd2c9]">
                  No submission yet. Submit once to start your version timeline.
                </p>
              ) : (
                <>
                  <p className="mb-2 text-xs text-[#bcd2c9]">
                    Latest status: {mySubmission.status || "-"}
                    {typeof mySubmission.marks === "number"
                      ? ` | Marks: ${mySubmission.marks}`
                      : ""}
                  </p>
                  {submissionHistory.length === 0 ? (
                    <p className="text-sm text-[#bcd2c9]">
                      No submission versions found.
                    </p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto rounded border border-[#3f5148] bg-[#0f160f] p-2">
                      <div className="space-y-2">
                        {submissionHistory.map((version) => (
                          <div
                            key={`submission-v-${version.versionNumber}`}
                            className="rounded border border-white/10 bg-[#1f292580] p-2 text-xs"
                          >
                            <p className="font-semibold text-[#e8f2ed]">
                              v{version.versionNumber} - {version.action}
                            </p>
                            <p className="mt-0.5 text-[#bcd2c9]">
                              {version.status || "-"}
                              {typeof version.marks === "number"
                                ? ` | 📊 ${version.marks}`
                                : ""}
                            </p>
                            {version.contentType && (
                              <p className="mt-0.5 text-[#8cf0c8]">
                                {version.contentType === "LINK" ? "🔗" : "📝"}{" "}
                                {version.contentType}
                              </p>
                            )}
                            {version.link && (
                              <p className="mt-0.5 truncate text-[#cfe5da]">
                                {version.link.substring(0, 40)}
                                {version.link.length > 40 ? "..." : ""}
                              </p>
                            )}
                            {version.text && (
                              <>
                                {version.text.includes("[LaTeX Document") ? (
                                  <button
                                    type="button"
                                    onClick={() => openLatexPreview(version.text)}
                                    className="mt-0.5 inline-block rounded bg-[#2ff5a8]/20 hover:bg-[#2ff5a8]/30 border border-[#2ff5a838] px-2 py-1 text-xs font-semibold text-[#8cf0c8] transition"
                                  >
                                    📝 {version.text.split("\n\n")[0].substring(0, 50)}...
                                  </button>
                                ) : (
                                  <p className="mt-0.5 line-clamp-1 text-[#bcd2c9]">
                                    {version.text.substring(0, 50)}
                                    {version.text.length > 50 ? "..." : ""}
                                  </p>
                                )}
                              </>
                            )}
                            {version.files && version.files.length > 0 && (
                              <div className="mt-0.5">
                                {version.files.map((file, idx) => (
                                  <button
                                    key={`file-${idx}`}
                                    type="button"
                                    onClick={() =>
                                      downloadSubmissionFile(
                                        mySubmission._id,
                                        idx,
                                      )
                                    }
                                    className="block text-xs text-[#a8e6c1] hover:text-[#2ff5a8] hover:underline cursor-pointer"
                                  >
                                    📎 {file.fileName}
                                  </button>
                                ))}
                              </div>
                            )}
                            {version.feedback && (
                              <p className="mt-0.5 line-clamp-1 text-[#bcd2c9]">
                                💬 {version.feedback.substring(0, 40)}
                                {version.feedback.length > 40 ? "..." : ""}
                              </p>
                            )}
                            <div className="mt-1 flex items-center justify-between gap-1">
                              <span className="truncate text-xs text-[#bcd2c9]">
                                {version.updatedByName || "System"}
                              </span>
                              <div className="flex items-center gap-1">
                                {version.algorandTxId && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      verifyVersionIntegrity(version)
                                    }
                                    className="text-xs text-[#8cf0c8] hover:text-[#2ff5a8] cursor-pointer"
                                    title="Verify integrity on blockchain"
                                  >
                                    {version.algorandTxId.startsWith("DEMO_")
                                      ? "⚠️ Demo"
                                      : "🔐 Verify"}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="mt-4">
            <Link to="/classrooms" className="text-sm underline text-[#bcd2c9]">
              Go back
            </Link>
          </div>

          {verificationResult && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="max-w-md rounded-lg border border-[#2ff5a8] bg-[#1f2925] p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[#e8f2ed]">
                    Verification Result
                  </h3>
                  <button
                    type="button"
                    onClick={() => setVerificationResult(null)}
                    className="text-[#bcd2c9] hover:text-[#e8f2ed]"
                  >
                    ✕
                  </button>
                </div>
                <div className="mb-4 rounded border border-[#3f5148] bg-[#0f160f] p-3">
                  <p
                    className={`text-sm font-semibold ${
                      verificationResult.verified
                        ? "text-[#2ff5a8]"
                        : "text-[#f5a962]"
                    }`}
                  >
                    {verificationResult.message}
                  </p>
                </div>
                <div className="space-y-2 text-xs text-[#bcd2c9]">
                  <p>
                    <span className="font-semibold text-[#cfe5da]">
                      Transaction ID:
                    </span>{" "}
                    {verificationResult.txId}
                  </p>
                  {verificationResult.timestamp && (
                    <p>
                      <span className="font-semibold text-[#cfe5da]">
                        Timestamp:
                      </span>{" "}
                      {formatDateTime(verificationResult.timestamp)}
                    </p>
                  )}
                  {verificationResult.action && (
                    <p>
                      <span className="font-semibold text-[#cfe5da]">
                        Action:
                      </span>{" "}
                      {verificationResult.action}
                    </p>
                  )}
                  {verificationResult.verified && (
                    <p className="rounded border border-[#2ff5a838] bg-[#2ff5a81a] p-2">
                      This version is immutably recorded on the Algorand
                      blockchain. No tampering is possible after registration.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setVerificationResult(null)}
                  className="mt-4 w-full rounded bg-[#2ff5a8] px-4 py-2 text-sm font-semibold text-[#142019] btn-primary-animated"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* LaTeX Preview Modal */}
          {showLatexModal && latexPreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
              <div className="w-full max-w-4xl rounded-lg border border-[#2ff5a8] bg-[#1f2925] shadow-2xl my-8">
                <div className="flex items-center justify-between border-b border-[#2ff5a8]/20 bg-[#0f1613d9] px-6 py-4">
                  <h3 className="text-lg font-semibold text-[#e8f2ed]">
                    📝 LaTeX Document Preview
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowLatexModal(false)}
                    className="rounded hover:bg-white/10 p-1 text-[#bcd2c9] hover:text-[#e8f2ed] transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 max-h-96 overflow-y-auto bg-[#1f2925cc]">
                  <div
                    className="prose prose-invert max-w-none text-sm leading-relaxed
                      [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-[#2ff5a8] [&_h1]:mt-4 [&_h1]:mb-3
                      [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#8cf0c8] [&_h2]:mt-3 [&_h2]:mb-2
                      [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[#8cf0c8] [&_h3]:mt-2 [&_h3]:mb-1
                      [&_p]:text-[#d8ebe3] [&_p]:leading-7 [&_p]:my-2
                      [&_strong]:text-[#2ff5a8] [&_strong]:font-bold
                      [&_em]:text-[#8cf0c8] [&_em]:italic
                      [&_code]:bg-[#0f1613d9] [&_code]:px-2 [&_code]:py-1 [&_code]:rounded [&_code]:text-[#2ff5a8] [&_code]:font-mono [&_code]:text-xs
                      [&_blockquote]:border-l-4 [&_blockquote]:border-[#2ff5a8] [&_blockquote]:pl-4 [&_blockquote]:text-[#bcd2c9] [&_blockquote]:italic [&_blockquote]:my-3
                      [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-2 [&_ul]:my-2
                      [&_li]:text-[#d8ebe3]"
                    dangerouslySetInnerHTML={{
                      __html: renderLatexToHtml(latexPreview),
                    }}
                  />
                </div>

                <div className="border-t border-[#2ff5a8]/20 bg-[#0f1613d9] px-6 py-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const printWindow = window.open("", "_blank");
                      const content = renderLatexToHtml(latexPreview);
                      const htmlContent = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta charset="UTF-8">
                          <title>LaTeX Document</title>
                          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
                          <style>
                            body { font-family: "Georgia", serif; margin: 2cm; background: white; color: black; line-height: 1.6; }
                            h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; }
                            p { text-align: justify; }
                            blockquote { border-left: 3px solid #999; padding-left: 1em; margin-left: 0; color: #666; }
                            ul { margin-left: 2em; }
                            code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
                            .katex-display { display: block; margin: 1.5em 0; text-align: center; }
                          </style>
                        </head>
                        <body>
                          ${content}
                          <script>
                            window.print();
                            window.close();
                          </script>
                        </body>
                        </html>
                      `;
                      printWindow.document.write(htmlContent);
                      printWindow.document.close();
                    }}
                    className="rounded bg-[#2ff5a8]/20 hover:bg-[#2ff5a8]/30 border border-[#2ff5a838] px-3 py-1.5 text-xs font-semibold text-[#8cf0c8] transition"
                  >
                    📄 Print/PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLatexModal(false)}
                    className="ml-auto rounded bg-[#2ff5a8] hover:bg-[#24d993] px-4 py-1.5 text-sm font-semibold text-[#142019] transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default ClassroomPostDetails;
