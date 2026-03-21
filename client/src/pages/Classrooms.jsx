import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../config/Api";
import { useAuth } from "../context/AuthContext";

const Classrooms = () => {
  const navigate = useNavigate();
  const { user, isProfessor, isAdmin } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [posts, setPosts] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [createClassForm, setCreateClassForm] = useState({
    name: "",
    section: "",
    subject: "",
    room: "",
    description: "",
  });

  const [joinCode, setJoinCode] = useState("");

  const [createPostForm, setCreatePostForm] = useState({
    title: "",
    body: "",
    type: "ANNOUNCEMENT",
    dueDate: "",
    points: "",
    allowStudentSubmissions: true,
    allowLink: true,
    allowFile: true,
    files: [],
  });

  const [submissionForm, setSubmissionForm] = useState({
    link: "",
    text: "",
    files: [],
  });

  const [gradeForm, setGradeForm] = useState({
    submissionId: "",
    marks: "",
    feedback: "",
    status: "RETURNED",
  });

  const selectedPost = useMemo(
    () => posts.find((post) => post._id === selectedPostId),
    [posts, selectedPostId],
  );

  const isTeacher = isProfessor || isAdmin;

  const loadClassrooms = async () => {
    setLoading(true);
    setError("");

    const response = await api.classrooms.getAll();
    setLoading(false);

    if (response.error) {
      setError(response.error);
      return;
    }

    const nextClassrooms = response.classrooms || [];
    setClassrooms(nextClassrooms);

    if (nextClassrooms.length > 0 && !selectedClassroomId) {
      setSelectedClassroomId(nextClassrooms[0]._id);
    }
  };

  const loadPosts = async (classroomId) => {
    if (!classroomId) {
      setPosts([]);
      return;
    }

    setLoading(true);
    setError("");

    const response = await api.classrooms.getPosts(classroomId);
    setLoading(false);

    if (response.error) {
      setError(response.error);
      return;
    }

    const nextPosts = response.posts || [];
    setPosts(nextPosts);

    if (nextPosts.length > 0 && !selectedPostId) {
      setSelectedPostId(nextPosts[0]._id);
    }
  };

  const loadSubmissions = async (classroomId, postId) => {
    if (!classroomId || !postId || !isTeacher) {
      setSubmissions([]);
      return;
    }

    setLoading(true);
    setError("");

    const response = await api.classrooms.getSubmissions(classroomId, postId);
    setLoading(false);

    if (response.error) {
      setError(response.error);
      return;
    }

    setSubmissions(response.submissions || []);
  };

  useEffect(() => {
    let isActive = true;

    const run = async () => {
      const response = await api.classrooms.getAll();
      if (!isActive) return;

      if (response.error) {
        setError(response.error);
        return;
      }

      const nextClassrooms = response.classrooms || [];
      setClassrooms(nextClassrooms);
      if (nextClassrooms.length > 0) {
        setSelectedClassroomId((prev) => prev || nextClassrooms[0]._id);
      }
    };

    void run();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const run = async () => {
      if (!selectedClassroomId) {
        if (!isActive) return;
        setPosts([]);
        setSelectedPostId("");
        return;
      }

      const response = await api.classrooms.getPosts(selectedClassroomId);
      if (!isActive) return;

      if (response.error) {
        setError(response.error);
        return;
      }

      const nextPosts = response.posts || [];
      setPosts(nextPosts);
      setSelectedPostId((prev) => {
        if (!nextPosts.some((post) => post._id === prev)) {
          return nextPosts[0]?._id || "";
        }
        return prev;
      });
    };

    void run();

    return () => {
      isActive = false;
    };
  }, [selectedClassroomId]);

  useEffect(() => {
    let isActive = true;

    const run = async () => {
      if (!selectedClassroomId || !selectedPostId || !isTeacher) {
        if (!isActive) return;
        setSubmissions([]);
        return;
      }

      const response = await api.classrooms.getSubmissions(
        selectedClassroomId,
        selectedPostId,
      );

      if (!isActive) return;

      if (response.error) {
        setError(response.error);
        return;
      }

      setSubmissions(response.submissions || []);
    };

    void run();

    return () => {
      isActive = false;
    };
  }, [selectedClassroomId, selectedPostId, isTeacher]);

  const handleCreateClassroom = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const response = await api.classrooms.create(createClassForm);

    if (response.error) {
      setError(response.error);
      return;
    }

    setMessage(response.message || "Classroom created");
    setCreateClassForm({
      name: "",
      section: "",
      subject: "",
      room: "",
      description: "",
    });
    await loadClassrooms();
  };

  const handleJoinClassroom = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const response = await api.classrooms.join(joinCode);

    if (response.error) {
      setError(response.error);
      return;
    }

    setMessage(response.message || "Joined classroom");
    setJoinCode("");
    await loadClassrooms();
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!selectedClassroomId) return;

    setError("");
    setMessage("");

    const allowedSubmissionTypes = [];
    if (createPostForm.allowLink) allowedSubmissionTypes.push("LINK");
    if (createPostForm.allowFile) allowedSubmissionTypes.push("FILE");

    if (createPostForm.files.length > 5) {
      setError("You can attach up to 5 files per post");
      return;
    }

    const oversizedFile = createPostForm.files.find(
      (file) => file.size > 5 * 1024 * 1024,
    );
    if (oversizedFile) {
      setError(`File too large: ${oversizedFile.name}. Max size is 5MB each.`);
      return;
    }

    const nonPdfFile = createPostForm.files.find(
      (file) => file.type !== "application/pdf",
    );
    if (nonPdfFile) {
      setError(
        `Unsupported file type: ${nonPdfFile.name}. Only PDF files are allowed.`,
      );
      return;
    }

    const payload = {
      title: createPostForm.title,
      body: createPostForm.body,
      type: createPostForm.type,
      dueDate: createPostForm.dueDate || null,
      points: createPostForm.points ? Number(createPostForm.points) : null,
      allowStudentSubmissions:
        createPostForm.type === "ASSIGNMENT"
          ? createPostForm.allowStudentSubmissions
          : false,
      allowedSubmissionTypes,
      files: createPostForm.files,
    };

    const response = await api.classrooms.createPost(
      selectedClassroomId,
      payload,
    );

    if (response.error) {
      setError(response.error);
      return;
    }

    setMessage(response.message || "Post created");
    setCreatePostForm({
      title: "",
      body: "",
      type: "ANNOUNCEMENT",
      dueDate: "",
      points: "",
      allowStudentSubmissions: true,
      allowLink: true,
      allowFile: true,
      files: [],
    });
    await loadPosts(selectedClassroomId);
  };

  const handleSubmitAssignment = async (e, postId) => {
    e.preventDefault();
    if (!selectedClassroomId || !postId) return;

    setError("");
    setMessage("");

    const response = await api.classrooms.submitAssignment(
      selectedClassroomId,
      postId,
      {
        link: submissionForm.link,
        text: submissionForm.text,
        files: submissionForm.files,
      },
    );

    if (response.error) {
      setError(response.error);
      return;
    }

    setMessage(response.message || "Assignment submitted");
    setSubmissionForm({ link: "", text: "", files: [] });
  };

  const handleGradeSubmission = async (e) => {
    e.preventDefault();
    if (!selectedClassroomId || !selectedPostId || !gradeForm.submissionId)
      return;

    setError("");
    setMessage("");

    const response = await api.classrooms.gradeSubmission(
      selectedClassroomId,
      selectedPostId,
      gradeForm.submissionId,
      {
        marks: gradeForm.marks ? Number(gradeForm.marks) : null,
        feedback: gradeForm.feedback,
        status: gradeForm.status,
      },
    );

    if (response.error) {
      setError(response.error);
      return;
    }

    setMessage(response.message || "Submission graded");
    setGradeForm({
      submissionId: "",
      marks: "",
      feedback: "",
      status: "RETURNED",
    });
    await loadSubmissions(selectedClassroomId, selectedPostId);
  };

  const handleDownload = async (submissionId, fileIndex) => {
    if (!selectedClassroomId || !selectedPostId) return;

    const result = await api.classrooms.downloadSubmissionFile(
      selectedClassroomId,
      selectedPostId,
      submissionId,
      fileIndex,
    );

    if (result.error) {
      setError(result.error);
      return;
    }

    const url = URL.createObjectURL(result.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleOpenPostAttachment = async (postId, attachmentIndex) => {
    if (!selectedClassroomId || !postId) return;

    const result = await api.classrooms.downloadPostAttachment(
      selectedClassroomId,
      postId,
      attachmentIndex,
    );

    if (result.error) {
      setError(result.error);
      return;
    }

    const url = URL.createObjectURL(result.blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  return (
    <div className="mx-auto w-full max-w-360 rounded-2xl bg-[radial-gradient(640px_360px_at_22%_6%,rgba(47,245,168,0.23),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)] p-4 md:p-8 text-[#e8f2ed]">
      <h1 className="mb-6 text-3xl font-bold">Classrooms</h1>

      {loading && <p className="mb-4 text-[#bcd2c9]">Loading...</p>}
      {message && (
        <p className="mb-4 rounded border border-emerald-500/40 bg-emerald-500/20 p-3 text-sm">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded border border-red-500/40 bg-red-500/20 p-3 text-sm">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {isTeacher && (
          <form
            onSubmit={handleCreateClassroom}
            className="rounded-xl border border-[#2ff5a838] bg-white/10 p-4"
          >
            <h2 className="mb-3 text-xl font-semibold">Create Classroom</h2>
            <input
              className="mb-2 w-full rounded bg-[#1f2925cc] p-2"
              placeholder="Name"
              value={createClassForm.name}
              onChange={(e) =>
                setCreateClassForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              required
            />
            <input
              className="mb-2 w-full rounded bg-[#1f2925cc] p-2"
              placeholder="Section"
              value={createClassForm.section}
              onChange={(e) =>
                setCreateClassForm((prev) => ({
                  ...prev,
                  section: e.target.value,
                }))
              }
            />
            <input
              className="mb-2 w-full rounded bg-[#1f2925cc] p-2"
              placeholder="Subject"
              value={createClassForm.subject}
              onChange={(e) =>
                setCreateClassForm((prev) => ({
                  ...prev,
                  subject: e.target.value,
                }))
              }
            />
            <input
              className="mb-2 w-full rounded bg-[#1f2925cc] p-2"
              placeholder="Room"
              value={createClassForm.room}
              onChange={(e) =>
                setCreateClassForm((prev) => ({
                  ...prev,
                  room: e.target.value,
                }))
              }
            />
            <textarea
              className="mb-2 w-full rounded bg-[#1f2925cc] p-2"
              placeholder="Description"
              value={createClassForm.description}
              onChange={(e) =>
                setCreateClassForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
            <button
              type="submit"
              className="rounded bg-[#2ff5a8] px-4 py-2 font-semibold text-[#142019]"
            >
              Create
            </button>
          </form>
        )}

        <form
          onSubmit={handleJoinClassroom}
          className="rounded-xl border border-[#2ff5a838] bg-white/10 p-4"
        >
          <h2 className="mb-3 text-xl font-semibold">Join Classroom</h2>
          <input
            className="mb-2 w-full rounded bg-[#1f2925cc] p-2 uppercase"
            placeholder="Join Code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            required
          />
          <button
            type="submit"
            className="rounded bg-[#2ff5a8] px-4 py-2 font-semibold text-[#142019]"
          >
            Join
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-[#2ff5a838] bg-white/10 p-4">
          <h2 className="mb-3 text-xl font-semibold">Your Classrooms</h2>
          {classrooms.length === 0 && (
            <p className="text-sm text-[#bcd2c9]">No classrooms yet.</p>
          )}
          <div className="space-y-2">
            {classrooms.map((room) => (
              <button
                key={room._id}
                type="button"
                onClick={() => setSelectedClassroomId(room._id)}
                className={`w-full rounded border p-3 text-left transition ${selectedClassroomId === room._id ? "border-[#2ff5a8] bg-[#2ff5a822]" : "border-white/10 bg-[#1f292580]"}`}
              >
                <p className="font-semibold">{room.name}</p>
                <p className="text-xs text-[#bcd2c9]">Code: {room.joinCode}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[#2ff5a838] bg-white/10 p-4 lg:col-span-2">
          <h2 className="mb-3 text-xl font-semibold">Posts</h2>

          {isTeacher && selectedClassroomId && (
            <form
              onSubmit={handleCreatePost}
              className="mb-4 rounded-lg border border-white/10 bg-[#1f292580] p-3"
            >
              <h3 className="mb-2 font-semibold">Create Post</h3>
              <input
                className="mb-2 w-full rounded bg-[#1f2925cc] p-2"
                placeholder="Title"
                value={createPostForm.title}
                onChange={(e) =>
                  setCreatePostForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                required
              />
              <textarea
                className="mb-2 w-full rounded bg-[#1f2925cc] p-2"
                placeholder="Body"
                value={createPostForm.body}
                onChange={(e) =>
                  setCreatePostForm((prev) => ({
                    ...prev,
                    body: e.target.value,
                  }))
                }
              />
              <div className="grid gap-2 md:grid-cols-4">
                <select
                  className="rounded bg-[#1f2925cc] p-2"
                  value={createPostForm.type}
                  onChange={(e) =>
                    setCreatePostForm((prev) => ({
                      ...prev,
                      type: e.target.value,
                    }))
                  }
                >
                  <option value="ANNOUNCEMENT">Announcement</option>
                  <option value="ASSIGNMENT">Assignment</option>
                </select>
                <input
                  className="rounded bg-[#1f2925cc] p-2"
                  type="datetime-local"
                  value={createPostForm.dueDate}
                  onChange={(e) =>
                    setCreatePostForm((prev) => ({
                      ...prev,
                      dueDate: e.target.value,
                    }))
                  }
                />
                <input
                  className="rounded bg-[#1f2925cc] p-2"
                  type="number"
                  min="0"
                  placeholder="Points"
                  value={createPostForm.points}
                  onChange={(e) =>
                    setCreatePostForm((prev) => ({
                      ...prev,
                      points: e.target.value,
                    }))
                  }
                />
                <button
                  type="submit"
                  className="rounded bg-[#2ff5a8] px-4 py-2 font-semibold text-[#142019]"
                >
                  Post
                </button>
              </div>

              <div className="mt-2">
                <label className="mb-1 block text-sm">
                  Attach files to post (optional, max 5)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor="create-post-files"
                    className="inline-flex cursor-pointer items-center justify-center rounded-md border border-[#2ff5a8] bg-[#2ff5a8] px-3 py-1.5 text-sm font-semibold text-[#142019] transition hover:-translate-y-0.5 hover:bg-[#24d993]"
                  >
                    Choose Files
                  </label>
                  <span className="text-xs text-[#bcd2c9]">
                    {createPostForm.files.length > 0
                      ? `${createPostForm.files.length} file(s) selected`
                      : "No file chosen"}
                  </span>
                </div>
                <input
                  id="create-post-files"
                  className="hidden"
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  onChange={(e) =>
                    setCreatePostForm((prev) => ({
                      ...prev,
                      files: Array.from(e.target.files || []),
                    }))
                  }
                />
                {createPostForm.files.length > 0 && (
                  <p className="mt-1 text-xs text-[#bcd2c9]">
                    {createPostForm.files.length} PDF file(s) selected (max 5
                    files, 5MB each)
                  </p>
                )}
              </div>

              {createPostForm.type === "ASSIGNMENT" && (
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={createPostForm.allowStudentSubmissions}
                      onChange={(e) =>
                        setCreatePostForm((prev) => ({
                          ...prev,
                          allowStudentSubmissions: e.target.checked,
                        }))
                      }
                    />
                    Allow submissions
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={createPostForm.allowLink}
                      onChange={(e) =>
                        setCreatePostForm((prev) => ({
                          ...prev,
                          allowLink: e.target.checked,
                        }))
                      }
                    />
                    Link submissions
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={createPostForm.allowFile}
                      onChange={(e) =>
                        setCreatePostForm((prev) => ({
                          ...prev,
                          allowFile: e.target.checked,
                        }))
                      }
                    />
                    File submissions
                  </label>
                </div>
              )}
            </form>
          )}

          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post._id}
                className="rounded border border-white/10 bg-[#1f292580] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{post.title}</p>
                    <p className="text-xs text-[#bcd2c9]">{post.type}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded border border-[#2ff5a8] px-3 py-1 text-xs"
                      onClick={() =>
                        navigate(
                          `/classrooms/${selectedClassroomId}/posts/${post._id}`,
                        )
                      }
                    >
                      Open Details
                    </button>
                    {isTeacher && (
                      <button
                        className="rounded border border-white/20 px-3 py-1 text-xs"
                        onClick={() => setSelectedPostId(post._id)}
                      >
                        Manage Submissions
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-[#d8ebe3]">{post.body}</p>

                {Array.isArray(post.attachments) &&
                  post.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {post.attachments.map((attachment, index) => (
                        <button
                          key={`${post._id}-attachment-${index}`}
                          type="button"
                          onClick={() =>
                            handleOpenPostAttachment(post._id, index)
                          }
                          className="rounded border border-white/20 px-2 py-1 text-xs underline"
                        >
                          {attachment.title || `Attachment ${index + 1}`}
                        </button>
                      ))}
                    </div>
                  )}

                {!isTeacher && post.type === "ASSIGNMENT" && (
                  <form
                    onSubmit={(e) => handleSubmitAssignment(e, post._id)}
                    className="mt-3 rounded border border-white/10 bg-[#0f1613d9] p-3"
                  >
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
                    <input
                      className="mb-2 block w-full text-sm"
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
                )}
              </div>
            ))}

            {posts.length === 0 && (
              <p className="text-sm text-[#bcd2c9]">
                No posts in this classroom yet.
              </p>
            )}
          </div>
        </section>
      </div>

      {isTeacher && selectedPost && (
        <section className="mt-6 rounded-xl border border-[#2ff5a838] bg-white/10 p-4">
          <h2 className="mb-3 text-xl font-semibold">
            Submissions for: {selectedPost.title}
          </h2>

          <div className="space-y-2">
            {submissions.map((submission) => (
              <div
                key={submission._id}
                className="rounded border border-white/10 bg-[#1f292580] p-3 text-sm"
              >
                <p className="font-semibold">
                  {submission.studentId?.name || "Student"} (
                  {submission.studentId?.email || "-"})
                </p>
                <p>Status: {submission.status}</p>
                <p>Marks: {submission.marks ?? "-"}</p>
                {submission.link && (
                  <p>
                    Link:{" "}
                    <a
                      href={submission.link}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Open
                    </a>
                  </p>
                )}
                {Array.isArray(submission.files) &&
                  submission.files.length > 0 && (
                    <div className="mt-2">
                      <p className="mb-1">Files:</p>
                      <div className="flex flex-wrap gap-2">
                        {submission.files.map((file, index) => (
                          <button
                            key={`${submission._id}-${index}`}
                            type="button"
                            onClick={() =>
                              handleDownload(submission._id, index)
                            }
                            className="rounded border border-white/20 px-2 py-1 text-xs"
                          >
                            {file.fileName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                <button
                  type="button"
                  onClick={() =>
                    setGradeForm((prev) => ({
                      ...prev,
                      submissionId: submission._id,
                    }))
                  }
                  className="mt-2 rounded border border-[#2ff5a8] px-2 py-1 text-xs text-[#2ff5a8]"
                >
                  Select for grading
                </button>
              </div>
            ))}
            {submissions.length === 0 && (
              <p className="text-sm text-[#bcd2c9]">No submissions yet.</p>
            )}
          </div>

          <form
            onSubmit={handleGradeSubmission}
            className="mt-4 rounded border border-white/10 bg-[#0f1613d9] p-3"
          >
            <h3 className="mb-2 font-semibold">Grade Submission</h3>
            <select
              className="mb-2 w-full rounded bg-[#1f2925cc] p-2"
              value={gradeForm.submissionId}
              onChange={(e) =>
                setGradeForm((prev) => ({
                  ...prev,
                  submissionId: e.target.value,
                }))
              }
              required
            >
              <option value="">Select submission</option>
              {submissions.map((submission) => (
                <option key={submission._id} value={submission._id}>
                  {submission.studentId?.name || submission._id}
                </option>
              ))}
            </select>
            <input
              className="mb-2 w-full rounded bg-[#1f2925cc] p-2"
              type="number"
              min="0"
              placeholder="Marks"
              value={gradeForm.marks}
              onChange={(e) =>
                setGradeForm((prev) => ({ ...prev, marks: e.target.value }))
              }
            />
            <textarea
              className="mb-2 w-full rounded bg-[#1f2925cc] p-2"
              placeholder="Feedback"
              value={gradeForm.feedback}
              onChange={(e) =>
                setGradeForm((prev) => ({ ...prev, feedback: e.target.value }))
              }
            />
            <select
              className="mb-2 w-full rounded bg-[#1f2925cc] p-2"
              value={gradeForm.status}
              onChange={(e) =>
                setGradeForm((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              <option value="RETURNED">RETURNED</option>
              <option value="TURNED_IN">TURNED_IN</option>
            </select>
            <button
              type="submit"
              className="rounded bg-[#2ff5a8] px-4 py-2 text-sm font-semibold text-[#142019]"
            >
              Save Grade
            </button>
          </form>
        </section>
      )}

      {isTeacher &&
        user?.role === "PROFESSOR" &&
        user?.teacherSubscription?.status !== "ACTIVE" && (
          <p className="mt-6 rounded border border-amber-400/40 bg-amber-500/20 p-3 text-sm">
            Your subscription is not active. Renew subscription from
            profile/auth flow to keep creating classrooms and posts.
          </p>
        )}
    </div>
  );
};

export default Classrooms;
