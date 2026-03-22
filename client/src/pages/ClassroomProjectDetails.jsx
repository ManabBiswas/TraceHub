import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../config/Api";
import { useAuth } from "../context/AuthContext";

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
  const [submissions, setSubmissions] = useState([]);
  const [gradeForm, setGradeForm] = useState({
    submissionId: "",
    marks: "",
    status: "SUBMITTED",
    feedback: "",
  });

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

    setMessage(response.message || "Project submitted successfully");
    setSubmissionForm({ githubUrl: "", files: [] });

    if (response.submission?._id) {
      setMySubmission(response.submission);
      await loadSubmissionTimeline(response.submission._id);
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
      }
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
    const subResponse = await api.classrooms.getSubmissions(classroomId, postId);
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
                        const url = URL.createObjectURL(
                          new Blob([attachment.data] || []),
                        );
                        window.open(url, "_blank");
                        setTimeout(() => URL.revokeObjectURL(url), 30000);
                      }}
                      className="rounded border border-[#2ff5a8] bg-[#2ff5a811] px-3 py-1.5 text-xs font-medium text-[#2ff5a8] transition hover:bg-[#2ff5a822]"
                    >
                      {attachment.title || `Attachment ${index + 1}`}
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
                    Submissions are currently closed for this project. Contact your instructor for more information.
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
                    className="flex-1 rounded-lg border border-white/20 bg-[#1f2925cc] px-4 py-3 text-[#e8f2ed] placeholder-[#8b9d95] transition focus:border-[#2ff5a8] focus:outline-none"
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
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-[#2ff5a8] bg-[#2ff5a8] px-3 py-1.5 text-xs font-semibold text-[#142019] transition hover:bg-[#24d993]"
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
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
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
              <button
                type="submit"
                disabled={submitting || !post.allowStudentSubmissions}
                className="rounded-lg bg-[#2ff5a8] px-4 py-2 text-sm font-semibold text-[#142019] transition hover:bg-[#24d993] hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
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
            </div>
          )}

          {/* Teacher Submissions Management */}
          {(isProfessor || isAdmin) && submissions.length > 0 && (
            <section className="rounded-xl border border-[#2ff5a838] bg-white/10 p-6">
              <h2 className="mb-4 text-xl font-semibold">
                Student Submissions ({submissions.length})
              </h2>
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div
                    key={submission._id}
                    className="rounded-lg border border-white/10 bg-[#1f292580] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{submission.studentName}</p>
                        <p className="text-xs text-[#bcd2c9]">
                          Submitted: {new Date(submission.submittedAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${
                        submission.status === "GRADED"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : submission.status === "RETURNED"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}>
                        {submission.status || "SUBMITTED"}
                      </span>
                    </div>

                    {submission.githubUrl && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-[#2ff5a8]">GitHub URL:</p>
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

                    {Array.isArray(submission.files) && submission.files.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-2 text-xs font-semibold text-[#2ff5a8]">Files:</p>
                        <div className="flex flex-wrap gap-2">
                          {submission.files.map((file, index) => (
                            <button
                              key={`${submission._id}-file-${index}`}
                              type="button"
                              onClick={() => downloadSubmissionFile(submission._id, index)}
                              className="cursor-pointer rounded border border-[#2ff5a8] px-2 py-1 text-xs text-[#2ff5a8] hover:bg-[#2ff5a822]"
                            >
                              {file.fileName || `File ${index + 1}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {(isProfessor || isAdmin) && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          setGradeForm((prev) => ({
                            ...prev,
                            submissionId: submission._id,
                          }));
                          handleGradeSubmission(e);
                        }}
                        className="space-y-2 border-t border-white/10 pt-3"
                      >
                        <div className="flex gap-2">
                          <input
                            className="flex-1 rounded bg-[#1f2925cc] p-2 text-sm hover:cursor-pointer"
                            type="number"
                            placeholder="Marks"
                            value={gradeForm.marks}
                            onChange={(e) =>
                              setGradeForm((prev) => ({
                                ...prev,
                                marks: e.target.value,
                              }))
                            }
                          />
                          <select
                            className="rounded bg-[#1f2925cc] p-2 text-sm hover:cursor-pointer"
                            value={gradeForm.status}
                            onChange={(e) =>
                              setGradeForm((prev) => ({
                                ...prev,
                                status: e.target.value,
                              }))
                            }
                          >
                            <option value="SUBMITTED">Submitted</option>
                            <option value="RETURNED">Returned</option>
                            <option value="GRADED">Graded</option>
                          </select>
                        </div>
                        <textarea
                          className="w-full rounded bg-[#1f2925cc] p-2 text-sm"
                          placeholder="Feedback"
                          value={gradeForm.feedback}
                          onChange={(e) =>
                            setGradeForm((prev) => ({
                              ...prev,
                              feedback: e.target.value,
                            }))
                          }
                        />
                        <button
                          type="submit"
                          onClick={() =>
                            setGradeForm((prev) => ({
                              ...prev,
                              submissionId: submission._id,
                            }))
                          }
                          className="w-full rounded bg-[#2ff5a8] px-3 py-1 text-sm font-semibold text-[#142019] hover:cursor-pointer hover:bg-[#24d993]"
                        >
                          Submit Grade
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>
      )}
    </div>
  );
};

export default ClassroomProjectDetails;
