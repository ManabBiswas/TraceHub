import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../config/Api";
import { useAuth } from "../context/AuthContext";

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

      setTimelineLoading(false);
      setLoading(false);
    };

    void run();

    return () => {
      isActive = false;
    };
  }, [classroomId, postId, isStudent]);

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
            <div className="mt-4 grid gap-3 rounded border border-white/10 bg-[#1f292580] p-3 md:grid-cols-2">
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
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-[#9fc0b2]">
                  Add Attachments (optional)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) =>
                    setPostEditForm((prev) => ({
                      ...prev,
                      files: Array.from(e.target.files || []),
                    }))
                  }
                  className="block w-full text-xs text-[#bcd2c9]"
                />
                {postEditForm.files.length > 0 && (
                  <p className="mt-1 text-xs text-[#bcd2c9]">
                    {postEditForm.files.length} file(s) will be added to this
                    post.
                  </p>
                )}
              </div>
            </div>
          )}

          {Array.isArray(post.attachments) && post.attachments.length > 0 && (
            <div className="mt-4 rounded border border-white/10 bg-[#1f292580] p-3">
              <p className="mb-2 font-semibold">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {post.attachments.map((attachment, index) => (
                  <a
                    key={`${post._id}-attachment-${index}`}
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded border border-white/20 px-2 py-1 text-xs underline"
                  >
                    {attachment.title || `Attachment ${index + 1}`}
                  </a>
                ))}
              </div>
            </div>
          )}

          {post.type === "ASSIGNMENT" ? (
            <form
              onSubmit={handleSubmitAssignment}
              className="mt-4 rounded border border-white/10 bg-[#0f1613d9] p-3"
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
                  className="inline-flex cursor-pointer items-center justify-center rounded-md border border-[#2ff5a8] bg-[#2ff5a8] px-3 py-1.5 text-sm font-semibold text-[#142019] transition hover:-translate-y-0.5 hover:bg-[#24d993]"
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
                className="rounded bg-[#2ff5a8] px-4 py-2 text-sm font-semibold text-[#142019]"
              >
                Submit Assignment
              </button>
            </form>
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
                      <div className="mt-1 flex items-center justify-between">
                        <span className="truncate text-xs text-[#bcd2c9]">
                          {version.updatedByName || "System"}
                        </span>
                        {version.algorandTxId && (
                          <span className="text-xs text-[#8cf0c8]">
                            ✓ {version.algorandTxId.substring(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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
                              <p className="mt-0.5 line-clamp-1 text-[#bcd2c9]">
                                {version.text.substring(0, 50)}
                                {version.text.length > 50 ? "..." : ""}
                              </p>
                            )}
                            {version.files && version.files.length > 0 && (
                              <div className="mt-0.5">
                                {version.files.map((file, idx) => (
                                  <p
                                    key={`file-${idx}`}
                                    className="text-xs text-[#a8e6c1]"
                                  >
                                    📎 {file.fileName}
                                  </p>
                                ))}
                              </div>
                            )}
                            {version.feedback && (
                              <p className="mt-0.5 line-clamp-1 text-[#bcd2c9]">
                                💬 {version.feedback.substring(0, 40)}
                                {version.feedback.length > 40 ? "..." : ""}
                              </p>
                            )}
                            <div className="mt-1 flex items-center justify-between">
                              <span className="truncate text-xs text-[#bcd2c9]">
                                {version.updatedByName || "System"}
                              </span>
                              {version.algorandTxId && (
                                <span className="text-xs text-[#8cf0c8]">
                                  ✓ {version.algorandTxId.substring(0, 8)}...
                                </span>
                              )}
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
        </section>
      )}
    </div>
  );
};

export default ClassroomPostDetails;
