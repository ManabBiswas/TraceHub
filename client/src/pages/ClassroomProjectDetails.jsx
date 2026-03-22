import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../config/Api";
import { useAuth } from "../context/AuthContext";
import { VersionHistory } from "../components/VersionHistory";

const ClassroomProjectDetails = () => {
  const navigate = useNavigate();
  const { classroomId, postId } = useParams();
  const { isStudent, isProfessor, isAdmin } = useAuth();
  const canEditPost = isProfessor || isAdmin;

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [mySubmission, setMySubmission] = useState(null);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [submissionForm, setSubmissionForm] = useState({
    githubUrl: "",
    files: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [turningIn, setTurningIn] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [gradeForm, setGradeForm] = useState({
    submissionId: "",
    marks: "",
    status: "SUBMITTED",
    feedback: "",
  });
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    submissionId: "",
    action: null, // "accept" or "return"
    note: "",
  });
  const [expandedSubmissionVersions, setExpandedSubmissionVersions] = useState(
    {},
  );
  const [submissionVersionHistory, setSubmissionVersionHistory] = useState({});

  const formatDateTime = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString();
  };

  const formatSubmissionDateTime = (dateValue) => {
    if (!dateValue) return { date: "-", time: "-" };
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return { date: "-", time: "-" };
    return {
      date: parsedDate.toLocaleDateString(),
      time: parsedDate.toLocaleTimeString(),
    };
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

  const toggleSubmissionVersions = async (submissionId) => {
    const isOpen = Boolean(expandedSubmissionVersions[submissionId]);
    setExpandedSubmissionVersions((prev) => ({
      ...prev,
      [submissionId]: !isOpen,
    }));

    if (isOpen || submissionVersionHistory[submissionId]) return;

    const response = await api.classrooms.getSubmissionHistory(
      classroomId,
      postId,
      submissionId,
    );

    if (!response?.error) {
      setSubmissionVersionHistory((prev) => ({
        ...prev,
        [submissionId]: response.versions || [],
      }));
    }
  };

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

      // Load student's submission
      if (isStudent) {
        const subResponse = await api.classrooms.getMySubmission(
          classroomId,
          postId,
        );

        if (!subResponse?.error && subResponse.submission) {
          setMySubmission(subResponse.submission);
          setSubmissionForm({
            githubUrl: subResponse.submission.githubUrl || "",
            files: [],
          });
          await loadSubmissionTimeline(subResponse.submission._id);
        }
      }

      // Load all submissions for teachers
      if (isProfessor || isAdmin) {
        const subResponse = await api.classrooms.getSubmissions(
          classroomId,
          postId,
        );
        if (!subResponse?.error) {
          setSubmissions(subResponse.submissions || []);
        }
      }

      setLoading(false);
    };

    void run();

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId, postId, isStudent]);

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    if (!post || post.type !== "PROJECT") return;
    if (!submissionForm.githubUrl && submissionForm.files.length === 0) {
      setError("Please provide either a GitHub URL or upload PDF files");
      return;
    }

    setError("");
    setMessage("");
    setSubmitting(true);

    const formData = new FormData();
    formData.append("githubUrl", submissionForm.githubUrl);
    formData.append("notes", "");
    submissionForm.files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await api.classrooms.submitProject(
      classroomId,
      postId,
      formData,
    );

    setSubmitting(false);

    if (response.error) {
      setError(response.error);
      return;
    }

    setMessage(
      response.message ||
        "Draft saved successfully. You can continue editing or finalize when ready.",
    );
    setSubmissionForm({ githubUrl: "", files: [] });

    if (response.submission?._id) {
      setMySubmission(response.submission);
      await loadSubmissionTimeline(response.submission._id);
    }
  };

  const handleFinalizeProject = async () => {
    if (
      !window.confirm(
        "Are you sure you want to finalize your submission? After this, you can still save more drafts, but you'll need to turn in the project when you're fully ready.",
      )
    ) {
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    const response = await api.classrooms.finalizeProject(classroomId, postId);

    setSubmitting(false);

    if (response.error) {
      setError(response.error);
      return;
    }

    setMessage(
      response.message ||
        "Submission finalized! You can now review and turn in.",
    );

    if (response.submissionStatus) {
      const updatedSubmission = {
        ...mySubmission,
        submissionStatus: response.submissionStatus,
        versionNumber: response.versionNumber,
      };
      setMySubmission(updatedSubmission);
      await loadSubmissionTimeline(mySubmission._id);
    }
  };

  const handleTurnInProject = async () => {
    if (
      !window.confirm(
        "Are you sure you want to turn in your project? This will lock your submission and you won't be able to make further changes.",
      )
    ) {
      return;
    }

    setTurningIn(true);
    setError("");
    setMessage("");

    const response = await api.classrooms.turnInProject(classroomId, postId);

    setTurningIn(false);

    if (response.error) {
      setError(response.error);
      return;
    }

    setMessage(response.message || "Project turned in successfully!");

    if (response.submissionStatus) {
      const updatedSubmission = {
        ...mySubmission,
        submissionStatus: response.submissionStatus,
        versionNumber: response.versionNumber,
      };
      setMySubmission(updatedSubmission);
      await loadSubmissionTimeline(mySubmission._id);
    }
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

  const handleGradeSubmission = async (e) => {
    e.preventDefault();

    if (!gradeForm.submissionId || !gradeForm.marks) {
      setError("Please fill in all required fields");
      return;
    }

    const response = await api.classrooms.gradeSubmission(
      classroomId,
      postId,
      gradeForm.submissionId,
      {
        marks: gradeForm.marks,
        status: gradeForm.status,
        feedback: gradeForm.feedback,
      },
    );

    if (response.error) {
      setError(response.error);
      return;
    }

    setMessage("Grade submitted successfully");
    setGradeForm({
      submissionId: "",
      marks: "",
      status: "SUBMITTED",
      feedback: "",
    });

    // Reload submissions
    const subResponse = await api.classrooms.getSubmissions(
      classroomId,
      postId,
    );
    if (!subResponse.error) {
      setSubmissions(subResponse.submissions || []);
    }
  };

  const handleAcceptSubmission = async (submissionId, note) => {
    setError("");
    setMessage("");

    const response = await api.classrooms.acceptProjectSubmission(
      classroomId,
      postId,
      submissionId,
      { professorNote: note },
    );

    if (response.error) {
      setError(response.error);
      return;
    }

    setMessage("Project accepted and verified!");

    // Reload submissions
    const subResponse = await api.classrooms.getSubmissions(
      classroomId,
      postId,
    );
    if (!subResponse.error) {
      setSubmissions(subResponse.submissions || []);
    }
  };

  const handleReturnForRevision = async (submissionId, note) => {
    setError("");
    setMessage("");

    const response = await api.classrooms.returnProjectForRevision(
      classroomId,
      postId,
      submissionId,
      { professorNote: note },
    );

    if (response.error) {
      setError(response.error);
      return;
    }

    setMessage("Project returned for revision. Student will be notified.");

    // Reload submissions
    const subResponse = await api.classrooms.getSubmissions(
      classroomId,
      postId,
    );
    if (!subResponse.error) {
      setSubmissions(subResponse.submissions || []);
    }
  };

  const submission = formatSubmissionDateTime(post?.dueDate);

  return (
    <div className="mx-auto w-full max-w-360 rounded-2xl bg-[radial-gradient(640px_360px_at_22%_6%,rgba(47,245,168,0.23),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)] p-4 text-[#e8f2ed] md:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Project Details</h1>
        <button
          type="button"
          onClick={() => navigate(`/classrooms`)}
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
        <section className="space-y-6">
          {/* Project Details Section */}
          <div className="rounded-xl border border-[#2ff5a838] bg-white/10 p-6">
            <h2 className="mb-1 text-3xl font-bold">{post.title}</h2>
            <p className="mb-4 inline-block rounded bg-[#2ff5a822] px-3 py-1 text-sm font-semibold text-[#2ff5a8]">
              {post.type}
            </p>

            <div className="mt-4 space-y-3 text-sm">
              <p className="text-[#d8ebe3] leading-relaxed">{post.body}</p>
            </div>

            {/* Due Date */}
            {post.dueDate && (
              <div className="mt-4 rounded-lg border-l-4 border-amber-400 bg-amber-500/10 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-300">
                  Due Date
                </p>
                <p className="mt-1 text-lg font-semibold text-amber-100">
                  {submission.date} at {submission.time}
                </p>
              </div>
            )}

            {/* Points and Info */}
            <div className="mt-4 flex flex-wrap gap-4">
              {post.points && (
                <div className="rounded-lg bg-[#1f292580] p-3">
                  <p className="text-xs font-medium uppercase text-[#bcd2c9]">
                    Points
                  </p>
                  <p className="mt-1 text-xl font-bold text-[#2ff5a8]">
                    {post.points}
                  </p>
                </div>
              )}
            </div>

            {/* Attachments */}
            {Array.isArray(post.attachments) && post.attachments.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#bcd2c9]">
                  Attachments
                </h3>
                <div className="flex flex-wrap gap-2">
                  {post.attachments.map((attachment, index) => (
                    <button
                      key={`${post._id}-attachment-${index}`}
                      type="button"
                      onClick={() => {
                        // If attachment has a URL (Pinata), open it directly
                        if (attachment.url) {
                          window.open(attachment.url, "_blank");
                        } else if (attachment.data) {
                          // Fallback: try to create blob from data
                          const url = URL.createObjectURL(
                            new Blob([attachment.data], {
                              type:
                                attachment.mimeType ||
                                "application/octet-stream",
                            }),
                          );
                          window.open(url, "_blank");
                          setTimeout(() => URL.revokeObjectURL(url), 30000);
                        } else {
                          alert("File data not available");
                        }
                      }}
                      className="rounded border border-[#2ff5a8] bg-[#2ff5a811] px-3 py-1.5 text-xs font-medium text-[#2ff5a8] transition hover:bg-[#2ff5a822]"
                    >
                      📎{" "}
                      {attachment.title ||
                        attachment.fileName ||
                        `Attachment ${index + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submission Form */}
          {isStudent && (
            <form
              onSubmit={handleSubmitProject}
              className="rounded-xl border border-[#2ff5a838] bg-white/10 p-6"
            >
              <h3 className="mb-6 flex items-center gap-2 text-2xl font-bold">
                Submit Your Project
              </h3>

              {!post.allowStudentSubmissions && (
                <div className="mb-6 rounded-lg border-l-4 border-red-400 bg-red-500/10 p-4">
                  <p className="text-sm text-red-200">
                    Submissions are currently closed for this project. Contact
                    your instructor for more information.
                  </p>
                </div>
              )}

              {mySubmission &&
                ["TURNED_IN", "UNDER_REVIEW", "VERIFIED"].includes(
                  mySubmission.submissionStatus,
                ) && (
                  <div className="mb-6 rounded-lg border-l-4 border-red-400 bg-red-500/10 p-4">
                    <p className="text-sm text-red-200">
                      {mySubmission.submissionStatus === "TURNED_IN" &&
                        "Your project has been turned in and is locked. You cannot make further changes."}
                      {mySubmission.submissionStatus === "UNDER_REVIEW" &&
                        "Your project is under review. You cannot make changes at this time."}
                      {mySubmission.submissionStatus === "VERIFIED" &&
                        "Your project has been verified. You cannot make changes."}
                    </p>
                  </div>
                )}

              {/* GitHub URL Section */}
              <div className="mb-6">
                <label className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#bcd2c9]">
                  GitHub Repository URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://github.com/username/repo"
                    value={submissionForm.githubUrl}
                    onChange={(e) =>
                      setSubmissionForm((prev) => ({
                        ...prev,
                        githubUrl: e.target.value,
                      }))
                    }
                    disabled={
                      mySubmission &&
                      ["TURNED_IN", "UNDER_REVIEW", "VERIFIED"].includes(
                        mySubmission.submissionStatus,
                      )
                    }
                    className="flex-1 rounded-lg border border-white/20 bg-[#1f2925cc] px-4 py-3 text-[#e8f2ed] placeholder-[#8b9d95] transition focus:border-[#2ff5a8] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {submissionForm.githubUrl && (
                    <a
                      href={submissionForm.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-[#2ff5a8] bg-[#2ff5a811] px-3 py-3 text-[#2ff5a8] transition hover:bg-[#2ff5a822]"
                      title="Open GitHub repository"
                    >
                      Open
                    </a>
                  )}
                </div>
                <p className="mt-1 text-xs text-[#8b9d95]">
                  Optional: Share your GitHub repository link
                </p>
              </div>

              {/* File Upload Section */}
              <div className="mb-6">
                <label className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#bcd2c9]">
                  Upload PDF Files
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="project-files"
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-[#2ff5a8] bg-[#2ff5a8] px-3 py-1.5 text-xs font-semibold text-[#142019] transition hover:bg-[#24d993] ${mySubmission && ["TURNED_IN", "UNDER_REVIEW", "VERIFIED"].includes(mySubmission.submissionStatus) ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      Choose Files
                    </label>
                    <span className="text-xs font-medium text-[#bcd2c9]">
                      {submissionForm.files.length > 0
                        ? `${submissionForm.files.length} file(s) selected`
                        : "No files selected"}
                    </span>
                  </div>
                  <input
                    id="project-files"
                    className="hidden"
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    disabled={
                      mySubmission &&
                      ["TURNED_IN", "UNDER_REVIEW", "VERIFIED"].includes(
                        mySubmission.submissionStatus,
                      )
                    }
                    onChange={(e) =>
                      setSubmissionForm((prev) => ({
                        ...prev,
                        files: Array.from(e.target.files || []),
                      }))
                    }
                  />
                  {submissionForm.files.length > 0 && (
                    <div className="rounded-lg bg-[#1f292580] p-3">
                      <p className="mb-2 text-xs font-medium text-[#8b9d95]">
                        Selected files:
                      </p>
                      <ul className="space-y-1 text-xs text-[#d8ebe3]">
                        {submissionForm.files.map((file, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)}{" "}
                            MB)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-[#8b9d95]">
                    Max 5 files, 5MB each. PDF format only.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !post.allowStudentSubmissions ||
                    (mySubmission &&
                      ["TURNED_IN", "UNDER_REVIEW", "VERIFIED"].includes(
                        mySubmission.submissionStatus,
                      ))
                  }
                  className="rounded-lg bg-[#2ff5a8] px-4 py-2 text-sm font-semibold text-[#142019] transition hover:bg-[#24d993] hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "💾 Save Draft"}
                </button>

                {mySubmission &&
                  ["DRAFT", "REJECTED_FOR_REVISION"].includes(
                    mySubmission.submissionStatus,
                  ) && (
                    <button
                      type="button"
                      disabled={submitting || !post.allowStudentSubmissions}
                      onClick={handleFinalizeProject}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? "Finalizing..." : "✅ Finalize Submission"}
                    </button>
                  )}
              </div>
            </form>
          )}

          {/* My Submission Display */}
          {mySubmission && isStudent && (
            <div className="rounded-xl border border-[#2ff5a838] bg-white/10 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
                Your Submission
              </h3>

              {/* Status Badge */}
              <div className="mb-4 inline-block rounded-lg bg-[#2ff5a822] px-4 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-[#bcd2c9]">
                  Status
                </p>
                <p className="mt-1 text-lg font-bold text-[#2ff5a8]">
                  {mySubmission.submissionStatus}
                </p>
              </div>

              {/* Version Number */}
              <div className="mt-2 inline-block ml-4 rounded-lg bg-[#8b9d9522] px-4 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-[#bcd2c9]">
                  Current Version
                </p>
                <p className="mt-1 text-lg font-bold text-[#bcd2c9]">
                  v{mySubmission.versionNumber}
                </p>
              </div>

              {/* Status Messages */}
              {mySubmission.submissionStatus === "DRAFT" && (
                <div className="mt-4 rounded-lg border-l-4 border-blue-400 bg-blue-500/10 p-4">
                  <p className="text-sm text-blue-300">
                    💾 You are working on a draft. Save your work regularly,
                    then finalize and turn in when ready.
                  </p>
                </div>
              )}

              {mySubmission.submissionStatus === "FINAL_SUBMITTED" && (
                <div className="mt-4 rounded-lg border-l-4 border-amber-400 bg-amber-500/10 p-4">
                  <p className="text-sm text-amber-300">
                    ⏳ Your submission has been finalized. Please review and
                    then <strong>Turn In</strong> to lock it for grading.
                  </p>
                </div>
              )}

              {mySubmission.submissionStatus === "TURNED_IN" && (
                <div className="mt-4 rounded-lg border-l-4 border-purple-400 bg-purple-500/10 p-4">
                  <p className="text-sm text-purple-300">
                    🔒 Your project has been turned in and locked. It is now
                    ready for professor review. You cannot make further changes.
                  </p>
                </div>
              )}

              {mySubmission.submissionStatus === "UNDER_REVIEW" && (
                <div className="mt-4 rounded-lg border-l-4 border-amber-400 bg-amber-500/10 p-4">
                  <p className="text-sm text-amber-300">
                    👀 Your project is under review. Check back soon for
                    feedback.
                  </p>
                </div>
              )}

              {mySubmission.submissionStatus === "REJECTED_FOR_REVISION" && (
                <div className="mt-4 rounded-lg border-l-4 border-red-400 bg-red-500/10 p-4">
                  <p className="text-sm text-red-300">
                    ⚠️ Your project needs revision. The professor has provided
                    feedback below. You can edit and resubmit.
                  </p>
                </div>
              )}

              {mySubmission.submissionStatus === "VERIFIED" && (
                <div className="mt-4 rounded-lg border-l-4 border-emerald-400 bg-emerald-500/10 p-4">
                  <p className="text-sm text-emerald-300">
                    ✅ Your project has been verified and accepted! It is
                    published in the gallery.
                  </p>
                </div>
              )}

              {/* GitHub Link */}
              {mySubmission.githubUrl && (
                <div className="mt-4 rounded-lg bg-[#1f292580] p-4">
                  <p className="mb-2 text-xs font-medium uppercase text-[#8b9d95]">
                    GitHub Repository
                  </p>
                  <a
                    href={mySubmission.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#2ff5a8] hover:underline"
                  >
                    {mySubmission.githubUrl}
                  </a>
                </div>
              )}

              {/* Files */}
              {Array.isArray(mySubmission.files) &&
                mySubmission.files.length > 0 && (
                  <div className="mt-4 rounded-lg bg-[#1f292580] p-4">
                    <p className="mb-3 text-xs font-medium uppercase text-[#8b9d95]">
                      Submitted Files
                    </p>
                    <div className="space-y-2">
                      {mySubmission.files.map((file, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() =>
                            downloadSubmissionFile(mySubmission._id, index)
                          }
                          className="flex w-full items-center justify-between rounded border border-white/20 bg-[#1f2925cc] p-3 text-left text-sm hover:border-[#2ff5a8]"
                        >
                          <span className="flex items-center gap-2 text-[#d8ebe3]">
                            {file.fileName}
                          </span>
                          <span className="text-xs text-[#8b9d95]">
                            Download
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* Marks and Feedback */}
              {mySubmission.marks !== null && (
                <div className="mt-4 rounded-lg border-l-4 border-emerald-400 bg-emerald-500/10 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-300">
                    Grade
                  </p>
                  <p className="mt-2 text-2xl font-bold text-emerald-100">
                    {mySubmission.marks} / {post.points || "N/A"}
                  </p>
                  {mySubmission.feedback && (
                    <div className="mt-3 rounded bg-[#1f2925cc] p-3">
                      <p className="text-xs font-medium text-[#8b9d95]">
                        Feedback:
                      </p>
                      <p className="mt-1 text-sm text-[#d8ebe3]">
                        {mySubmission.feedback}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Turn In Button */}
              {mySubmission.submissionStatus === "FINAL_SUBMITTED" && (
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={handleTurnInProject}
                    disabled={turningIn}
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {turningIn ? "Turning in..." : "🔒 Turn In Project"}
                  </button>
                  <p className="flex items-center text-xs text-[#8b9d95]">
                    This will lock your submission and send it to the professor
                    for grading
                  </p>
                </div>
              )}

              {/* Version History */}
              {mySubmission.versionHistory &&
                mySubmission.versionHistory.length > 0 && (
                  <VersionHistory
                    versionHistory={mySubmission.versionHistory}
                    studentName={mySubmission.studentName || "Student"}
                    submissionId={mySubmission._id}
                    isProfessor={isProfessor || isAdmin}
                    onVerify={handleAcceptSubmission}
                  />
                )}
            </div>
          )}

          {/* Teacher Submissions Management */}
          {(isProfessor || isAdmin) && submissions.length > 0 && (
            <section className="rounded-xl border border-[#2ff5a838] bg-white/10 p-6">
              <h2 className="mb-4 text-xl font-semibold">
                Student Submissions ({submissions.length})
              </h2>
              <div className="space-y-4">
                {submissions
                  .filter(
                    (submission) =>
                      submission.submissionStatus !== "REJECTED_FOR_REVISION",
                  )
                  .map((submission) => (
                    <div
                      key={submission._id}
                      className="rounded-lg border border-white/10 bg-[#1f292580] p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="font-semibold">
                            {submission.studentName}
                          </p>
                          <p className="text-xs text-[#bcd2c9]">
                            Submitted:{" "}
                            {new Date(
                              submission.createdAt || submission.submittedAt,
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <span
                            className={`rounded px-2 py-1 text-xs font-semibold ${
                              submission.submissionStatus === "TURNED_IN"
                                ? "bg-purple-500/20 text-purple-300"
                                : submission.submissionStatus === "VERIFIED"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : submission.submissionStatus ===
                                      "REJECTED_FOR_REVISION"
                                    ? "bg-red-500/20 text-red-300"
                                    : submission.submissionStatus ===
                                        "UNDER_REVIEW"
                                      ? "bg-amber-500/20 text-amber-300"
                                      : "bg-gray-500/20 text-gray-300"
                            }`}
                          >
                            {submission.submissionStatus || "DRAFT"}
                          </span>
                          {submission.versionNumber && (
                            <span className="rounded px-2 py-1 text-xs font-semibold bg-blue-500/20 text-blue-300">
                              v{submission.versionNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      {submission.githubUrl && (
                        <div className="mb-2">
                          <p className="text-xs font-semibold text-[#2ff5a8]">
                            GitHub URL:
                          </p>
                          <a
                            href={submission.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cursor-pointer text-xs text-blue-400 underline"
                          >
                            {submission.githubUrl}
                          </a>
                        </div>
                      )}

                      {Array.isArray(submission.files) &&
                        submission.files.length > 0 && (
                          <div className="mb-3">
                            <p className="mb-2 text-xs font-semibold text-[#2ff5a8]">
                              Files:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {submission.files.map((file, index) => (
                                <button
                                  key={`${submission._id}-file-${index}`}
                                  type="button"
                                  onClick={() =>
                                    downloadSubmissionFile(
                                      submission._id,
                                      index,
                                    )
                                  }
                                  className="cursor-pointer rounded border border-[#2ff5a8] px-2 py-1 text-xs text-[#2ff5a8] hover:bg-[#2ff5a822]"
                                >
                                  {file.fileName || `File ${index + 1}`}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* View All Versions Button */}
                      <button
                        type="button"
                        onClick={() => toggleSubmissionVersions(submission._id)}
                        className="mb-3 w-full rounded border border-[#2ff5a8] px-3 py-2 text-xs font-semibold text-[#2ff5a8] hover:bg-[#2ff5a822] transition"
                      >
                        {expandedSubmissionVersions[submission._id]
                          ? "▼ Hide All Versions"
                          : "▶ View All Versions"}
                      </button>

                      {(isProfessor || isAdmin) && (
                        <div className="space-y-3 border-t border-white/10 pt-3">
                          {/* For TURNED_IN submissions: Accept or Return */}
                          {submission.submissionStatus === "TURNED_IN" && (
                            <>
                              <div className="rounded-lg border-l-4 border-purple-400 bg-purple-500/10 p-3">
                                <p className="text-sm text-purple-300 font-semibold">
                                  This project has been turned in and is ready
                                  for grading.
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewModal({
                                      isOpen: true,
                                      submissionId: submission._id,
                                      action: "accept",
                                      note: "",
                                    });
                                  }}
                                  className="flex-1 rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                                >
                                  ✅ Accept & Verify
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewModal({
                                      isOpen: true,
                                      submissionId: submission._id,
                                      action: "return",
                                      note: "",
                                    });
                                  }}
                                  className="flex-1 rounded bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 cursor-pointer"
                                >
                                  🔄 Return for Revision
                                </button>
                              </div>
                            </>
                          )}

                          {/* For UNDER_REVIEW submissions: Also allow Accept or Return */}
                          {submission.submissionStatus === "UNDER_REVIEW" && (
                            <>
                              <div className="rounded-lg border-l-4 border-amber-400 bg-amber-500/10 p-3">
                                <p className="text-sm text-amber-300 font-semibold">
                                  This project is under review. Complete your
                                  evaluation:
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewModal({
                                      isOpen: true,
                                      submissionId: submission._id,
                                      action: "accept",
                                      note: "",
                                    });
                                  }}
                                  className="flex-1 rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                                >
                                  ✅ Accept & Verify
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewModal({
                                      isOpen: true,
                                      submissionId: submission._id,
                                      action: "return",
                                      note: "",
                                    });
                                  }}
                                  className="flex-1 rounded bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 cursor-pointer"
                                >
                                  🔄 Return for Revision
                                </button>
                              </div>
                            </>
                          )}

                          {/* Grading workflow info for verified submissions */}
                          {submission.submissionStatus === "VERIFIED" && (
                            <div className="rounded-lg border-l-4 border-emerald-400 bg-emerald-500/10 p-3">
                              <p className="text-sm text-emerald-300">
                                ✅ This project has been verified and accepted.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Version History Display */}
                      {expandedSubmissionVersions[submission._id] &&
                        submissionVersionHistory[submission._id] && (
                          <VersionHistory
                            versionHistory={
                              submissionVersionHistory[submission._id]
                            }
                            submissionId={submission._id}
                            isProfessor={isProfessor || isAdmin}
                            onVerify={() => {
                              toggleSubmissionVersions(submission._id);
                            }}
                          />
                        )}
                    </div>
                  ))}
              </div>
            </section>
          )}
        </section>
      )}

      {/* Review Modal Form */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1f2925] rounded-lg p-6 max-w-md w-full border border-[#2ff5a8]/30">
            <h2 className="text-xl font-bold text-[#e8f2ed] mb-4">
              {reviewModal.action === "accept"
                ? "✅ Accept & Verify Submission"
                : "🔄 Return for Revision"}
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (reviewModal.action === "accept") {
                  handleAcceptSubmission(
                    reviewModal.submissionId,
                    reviewModal.note,
                  );
                } else if (reviewModal.action === "return") {
                  if (reviewModal.note.length < 10) {
                    alert("Feedback must be at least 10 characters");
                    return;
                  }
                  handleReturnForRevision(
                    reviewModal.submissionId,
                    reviewModal.note,
                  );
                }
                setReviewModal({
                  isOpen: false,
                  submissionId: "",
                  action: null,
                  note: "",
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-[#8b9d95] mb-2">
                  {reviewModal.action === "accept"
                    ? "Acceptance Note (optional)"
                    : "Feedback for Revision (required - minimum 10 characters)"}
                </label>
                <textarea
                  required={reviewModal.action === "return"}
                  minLength={reviewModal.action === "return" ? 10 : 0}
                  value={reviewModal.note}
                  onChange={(e) =>
                    setReviewModal((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  placeholder={
                    reviewModal.action === "accept"
                      ? "Enter optional note..."
                      : "Enter feedback for improvements..."
                  }
                  className="w-full rounded bg-[#0f1419] text-[#e8f2ed] p-3 text-sm border border-[#2ff5a8]/30 focus:border-[#2ff5a8] focus:outline-none"
                  rows={5}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setReviewModal({
                      isOpen: false,
                      submissionId: "",
                      action: null,
                      note: "",
                    })
                  }
                  className="flex-1 rounded border border-[#8b9d95] px-4 py-2 text-sm font-semibold text-[#8b9d95] hover:bg-[#0f1419] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 rounded px-4 py-2 text-sm font-semibold text-white transition ${
                    reviewModal.action === "accept"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-orange-600 hover:bg-orange-700"
                  }`}
                >
                  {reviewModal.action === "accept" ? "Accept" : "Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomProjectDetails;
