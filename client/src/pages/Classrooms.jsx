import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check } from "lucide-react";
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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState("");
  const [expandedPostId, setExpandedPostId] = useState("");
  const [gradeForm, setGradeForm] = useState({
    submissionId: "",
    marks: "",
    feedback: "",
    status: "RETURNED",
  });

  const [studentSubmissionForm, setStudentSubmissionForm] = useState({
    submissionLink: "",
    submissionFiles: [],
  });

  const [studentSubmission, setStudentSubmission] = useState(null);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

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



  const _selectedPost = useMemo(
    () => posts.find((post) => post._id === selectedPostId),
    [posts, selectedPostId],
  );

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

    setMessage(response.message || "Submission graded successfully");
    setGradeForm({
      submissionId: "",
      marks: "",
      feedback: "",
      status: "RETURNED",
    });
    
    // Refresh submissions
    const refreshResponse = await api.classrooms.getSubmissions(
      selectedClassroomId,
      selectedPostId,
    );
    if (!refreshResponse.error) {
      setSubmissions(refreshResponse.submissions || []);
    }
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

  const handleStudentSubmission = async (e) => {
    e.preventDefault();
    if (!selectedClassroomId || !selectedPostId) return;

    const post = posts.find((p) => p._id === selectedPostId);
    if (!post || (post.type !== "ASSIGNMENT" && post.type !== "PROJECT")) return;

    setIsSubmittingAssignment(true);
    setError("");
    setMessage("");

    try {
      if (studentSubmissionForm.submissionFiles.length > 5) {
        setError("You can submit up to 5 files");
        return;
      }

      const oversizedFile = studentSubmissionForm.submissionFiles.find(
        (file) => file.size > 5 * 1024 * 1024,
      );
      if (oversizedFile) {
        setError(`File too large: ${oversizedFile.name}. Max size is 5MB each.`);
        return;
      }

      const nonPdfFile = studentSubmissionForm.submissionFiles.find(
        (file) => file.type !== "application/pdf",
      );
      if (nonPdfFile) {
        setError(
          `Unsupported file type: ${nonPdfFile.name}. Only PDF files are allowed.`,
        );
        return;
      }

      if (!studentSubmissionForm.submissionLink && studentSubmissionForm.submissionFiles.length === 0) {
        setError("Please provide either a link or upload files");
        return;
      }

      const payload = {
        submissionLink: studentSubmissionForm.submissionLink || null,
        files: studentSubmissionForm.submissionFiles,
      };

      const response = await api.classrooms.submitAssignment(
        selectedClassroomId,
        selectedPostId,
        payload,
      );

      if (response.error) {
        setError(response.error);
        return;
      }

      setMessage(response.message || "Assignment submitted successfully");
      setStudentSubmissionForm({
        submissionLink: "",
        submissionFiles: [],
      });

      // Refresh student submission
      const refreshResponse = await api.classrooms.getMySubmission(
        selectedClassroomId,
        selectedPostId,
      );
      if (!refreshResponse.error) {
        setStudentSubmission(refreshResponse.submission || null);
      }
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const handleCopyCode = (code, classroomId) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(classroomId);
    setTimeout(() => setCopiedCodeId(""), 2000);
  };

  const isTeacher = isProfessor || isAdmin;

  const getPostStatus = (dueDate) => {
    if (!dueDate) return "OPEN";
    const deadline = new Date(dueDate);
    const now = new Date();
    return now > deadline ? "CLOSED" : "OPEN";
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

  // Fetch student's own submission
  useEffect(() => {
    let isActive = true;

    const run = async () => {
      if (!selectedClassroomId || !selectedPostId || isTeacher) {
        if (!isActive) return;
        setStudentSubmission(null);
        return;
      }

      const response = await api.classrooms.getMySubmission(
        selectedClassroomId,
        selectedPostId,
      );

      if (!isActive) return;

      if (response.error) {
        setStudentSubmission(null);
        return;
      }

      setStudentSubmission(response.submission || null);
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
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!selectedClassroomId) return;

    setIsCreatingPost(true);
    setError("");
    setMessage("");

    try {
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
          createPostForm.type === "PROJECT" || createPostForm.type === "ASSIGNMENT"
            ? true
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
    } finally {
      setIsCreatingPost(false);
    }
  };



  return (
    <div className="mx-auto w-full max-w-360 rounded-2xl bg-[radial-gradient(640px_360px_at_22%_6%,rgba(47,245,168,0.23),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)] p-4 md:p-8 text-[#e8f2ed]">
      <h1 className="mb-6 text-3xl font-bold">Classrooms</h1>

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
              className="rounded bg-[#2ff5a8] px-4 py-2 font-semibold text-[#142019] btn-primary-animated"
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
            className="rounded bg-[#2ff5a8] px-4 py-2 font-semibold text-[#142019] btn-primary-animated"
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
                className={`w-full rounded border p-3 text-left transition btn-secondary-animated ${selectedClassroomId === room._id ? "border-[#2ff5a8] bg-[#2ff5a822]" : "border-white/10 bg-[#1f292580]"}`}
              >
                <p className="font-semibold">{room.name}</p>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <p className="text-xs text-[#bcd2c9]">Code: <span className="font-mono font-semibold">{room.joinCode}</span></p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyCode(room.joinCode, room._id);
                    }}
                    className="ml-auto shrink-0 p-1.5 rounded hover:bg-[#2ff5a8]/20 transition-colors"
                    title="Copy code"
                  >
                    {copiedCodeId === room._id ? (
                      <Check size={16} className="text-[#10b981]" />
                    ) : (
                      <Copy size={16} className="text-[#2ff5a8]" />
                    )}
                  </button>
                </div>
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
                  <option value="PROJECT">Project</option>
                </select>

                {(createPostForm.type === "ASSIGNMENT" || createPostForm.type === "PROJECT") && (
                  <>
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
                  </>
                )}

                <button
                  type="submit"
                  disabled={isCreatingPost}
                  className="rounded bg-[#2ff5a8] px-4 py-2 font-semibold text-[#142019] disabled:opacity-60 disabled:cursor-not-allowed transition btn-primary-animated flex items-center justify-center gap-2 min-w-24"
                >
                  {isCreatingPost ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#142019] border-t-transparent rounded-full animate-spin"></div>
                      <span>Posting...</span>
                    </>
                  ) : (
                    "Post"
                  )}
                </button>
              </div>

              {(createPostForm.type === "ASSIGNMENT" || createPostForm.type === "PROJECT") && (
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
              )}

              {createPostForm.type === "ANNOUNCEMENT" && (
                <div className="mt-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="announcement-files"
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
                    id="announcement-files"
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
              )}

              {(createPostForm.type === "ASSIGNMENT" || createPostForm.type === "PROJECT") && (
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
                  {createPostForm.type === "ASSIGNMENT" && (
                    <>
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
                    </>
                  )}
                </div>
              )}
            </form>
          )}

          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post._id} className="space-y-2">
                <button
                  onClick={() => {
                    navigate(
                      post.type === "PROJECT"
                        ? `/classrooms/${selectedClassroomId}/projects/${post._id}`
                        : `/classrooms/${selectedClassroomId}/posts/${post._id}`,
                    )
                  }}
                  className="w-full rounded border border-white/10 bg-[#1f292580] p-3 transition hover:bg-[#2ff5a822] hover:border-[#2ff5a8] cursor-pointer btn-secondary-animated"
                >
                  <div className="flex items-center justify-between gap-6 mb-2">
                    <span className="font-semibold text-[#e8f2ed] text-left flex-1">
                      {post.title}
                    </span>
                    <span className="text-base font-bold text-[#bcd2c9] flex-1 text-center">{post.type.toLowerCase()}</span>
                    <span className={`text-base font-bold flex-1 text-right ${
                      getPostStatus(post.dueDate) === "CLOSED"
                        ? "text-red-400"
                        : "text-white"
                    }`}>
                      {getPostStatus(post.dueDate).toLowerCase()}
                    </span>
                  </div>
                </button>
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
