import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../config/Api";

const ClassroomPostDetails = () => {
  const navigate = useNavigate();
  const { classroomId, postId } = useParams();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submissionForm, setSubmissionForm] = useState({
    link: "",
    text: "",
    files: [],
  });

  useEffect(() => {
    let isActive = true;

    const run = async () => {
      setLoading(true);
      setError("");

      const response = await api.classrooms.getPosts(classroomId);
      if (!isActive) return;

      setLoading(false);
      if (response.error) {
        setError(response.error);
        return;
      }

      const foundPost = (response.posts || []).find((item) => item._id === postId);
      if (!foundPost) {
        setError("Post not found");
        return;
      }

      setPost(foundPost);
    };

    void run();

    return () => {
      isActive = false;
    };
  }, [classroomId, postId]);

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

    const formData = new FormData();
    formData.append("link", submissionForm.link);
    formData.append("text", submissionForm.text);
    submissionForm.files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await api.classrooms.submitAssignment(classroomId, post._id, formData);

    if (response.error) {
      setError(response.error);
      return;
    }

    setMessage(response.message || "Assignment submitted");
    setSubmissionForm({ link: "", text: "", files: [] });
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
      {error && <p className="mb-4 rounded border border-red-500/40 bg-red-500/20 p-3 text-sm">{error}</p>}
      {message && (
        <p className="mb-4 rounded border border-emerald-500/40 bg-emerald-500/20 p-3 text-sm">
          {message}
        </p>
      )}

      {!loading && !error && post && (
        <section className="rounded-xl border border-[#2ff5a838] bg-white/10 p-4">
          <h2 className="text-2xl font-semibold">{post.title}</h2>
          <p className="mt-1 text-sm text-[#bcd2c9]">{post.type}</p>

          {post.type === "ASSIGNMENT" && (
            <div className="mt-3 rounded border border-white/10 bg-[#0f1613a6] p-3">
              <div className="flex flex-wrap items-center gap-x-10 gap-y-2 text-base font-bold tracking-wide text-[#e8f2ed] md:gap-x-14">
                <span>Submission:</span>
                <span>Date:- {submission.date}</span>
                <span>Time:- {submission.time}</span>
              </div>
            </div>
          )}

          {post.body && (
            <div className="mt-4 rounded border border-white/10 bg-[#1f292580] p-3">
              <p className="mb-1 font-semibold">Details</p>
              <p className="text-sm leading-7 text-[#d8ebe3]">{post.body}</p>
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
