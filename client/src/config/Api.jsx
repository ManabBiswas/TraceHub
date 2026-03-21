const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Helper function to get token from localStorage
const getToken = () => localStorage.getItem("token");

const getAuthHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper function to set auth headers
const getHeaders = (includeAuth = true) => {
  const headers = {
    "Content-Type": "application/json",
  };
  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
};

export const api = {
  // ========== AUTH ENDPOINTS ==========
  auth: {
    register: async (email, password, name) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: getHeaders(false),
        body: JSON.stringify({ email, password, name }),
      });
      return response.json();
    },

    registerTeacher: async (
      email,
      password,
      name,
      department,
      monthlyFee = 99,
    ) => {
      const response = await fetch(`${API_BASE_URL}/auth/register-teacher`, {
        method: "POST",
        headers: getHeaders(false),
        body: JSON.stringify({ email, password, name, department, monthlyFee }),
      });
      return response.json();
    },

    login: async (email, password) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: getHeaders(false),
        body: JSON.stringify({ email, password }),
      });
      return response.json();
    },

    loginStudent: async (email, password) => {
      const response = await fetch(`${API_BASE_URL}/auth/login/student`, {
        method: "POST",
        headers: getHeaders(false),
        body: JSON.stringify({ email, password }),
      });
      return response.json();
    },

    loginTeacher: async (email, password) => {
      const response = await fetch(`${API_BASE_URL}/auth/login/teacher`, {
        method: "POST",
        headers: getHeaders(false),
        body: JSON.stringify({ email, password }),
      });
      return response.json();
    },

    getMe: async () => {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: getHeaders(true),
      });
      return response.json();
    },

    renewSubscription: async () => {
      const response = await fetch(`${API_BASE_URL}/auth/renew-subscription`, {
        method: "POST",
        headers: getHeaders(true),
      });
      return response.json();
    },

    logout: () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
  },

  // ========== RESOURCES ENDPOINTS ==========
  resources: {
    getAll: async ({ userId = null, classroomId = null } = {}) => {
      const query = new URLSearchParams();
      if (userId) query.set("userId", userId);
      if (classroomId) query.set("classroomId", classroomId);
      const queryString = query.toString();
      const url = queryString
        ? `${API_BASE_URL}/resources?${queryString}`
        : `${API_BASE_URL}/resources`;
      const response = await fetch(url, {
        headers: getHeaders(true),
      });
      return response.json();
    },

    getById: async (id) => {
      const response = await fetch(`${API_BASE_URL}/resources/${id}`, {
        headers: getHeaders(true),
      });
      return response.json();
    },
  },

  // ========== UPLOAD ENDPOINTS ==========
  upload: {
    uploadFile: async (file, title, classroomId) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("classroomId", classroomId);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });
      return response.json();
    },
  },

  // ========== PENDING ENDPOINTS ==========
  pending: {
    getAll: async () => {
      const response = await fetch(`${API_BASE_URL}/pending`, {
        headers: getHeaders(false),
      });
      return response.json();
    },

    approve: async (resourceId, passcode) => {
      const response = await fetch(
        `${API_BASE_URL}/pending/approve/${resourceId}`,
        {
          method: "POST",
          headers: getHeaders(false),
          body: JSON.stringify({ passcode }),
        },
      );
      return response.json();
    },

    reject: async (resourceId, passcode) => {
      const response = await fetch(`${API_BASE_URL}/pending/${resourceId}`, {
        method: "DELETE",
        headers: getHeaders(false),
        body: JSON.stringify({ passcode }),
      });
      return response.json();
    },
  },

  // ========== CLASSROOMS ENDPOINTS ==========
  classrooms: {
    getAll: async () => {
      const response = await fetch(`${API_BASE_URL}/classrooms`, {
        method: "GET",
        headers: getHeaders(true),
      });
      return response.json();
    },

    create: async (payload) => {
      const response = await fetch(`${API_BASE_URL}/classrooms`, {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify(payload),
      });
      return response.json();
    },

    join: async (joinCode) => {
      const response = await fetch(`${API_BASE_URL}/classrooms/join`, {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify({ joinCode }),
      });
      return response.json();
    },

    getPosts: async (classroomId) => {
      const response = await fetch(
        `${API_BASE_URL}/classrooms/${classroomId}/posts`,
        {
          method: "GET",
          headers: getHeaders(true),
        },
      );
      return response.json();
    },

    createPost: async (classroomId, payload) => {
      const hasFiles = Array.isArray(payload.files) && payload.files.length > 0;

      if (hasFiles) {
        const formData = new FormData();
        formData.append("title", payload.title || "");
        formData.append("body", payload.body || "");
        formData.append("type", payload.type || "ANNOUNCEMENT");

        if (payload.dueDate) formData.append("dueDate", payload.dueDate);
        if (payload.points !== null && typeof payload.points !== "undefined") {
          formData.append("points", String(payload.points));
        }

        formData.append(
          "allowStudentSubmissions",
          String(Boolean(payload.allowStudentSubmissions)),
        );
        formData.append(
          "allowedSubmissionTypes",
          JSON.stringify(payload.allowedSubmissionTypes || ["LINK", "FILE"]),
        );

        payload.files.forEach((file) => {
          formData.append("attachments", file);
        });

        const response = await fetch(
          `${API_BASE_URL}/classrooms/${classroomId}/posts`,
          {
            method: "POST",
            headers: {
              ...getAuthHeader(),
            },
            body: formData,
          },
        );

        return response.json();
      }

      const response = await fetch(
        `${API_BASE_URL}/classrooms/${classroomId}/posts`,
        {
          method: "POST",
          headers: getHeaders(true),
          body: JSON.stringify(payload),
        },
      );
      return response.json();
    },

    submitLink: async (classroomId, postId, link) => {
      const response = await fetch(
        `${API_BASE_URL}/classrooms/${classroomId}/posts/${postId}/submissions/link`,
        {
          method: "POST",
          headers: getHeaders(true),
          body: JSON.stringify({ link }),
        },
      );
      return response.json();
    },

    submitAssignment: async (
      classroomId,
      postId,
      { link = "", text = "", files = [] },
    ) => {
      const formData = new FormData();
      if (link) formData.append("link", link);
      if (text) formData.append("text", text);
      files.forEach((file) => formData.append("files", file));

      const response = await fetch(
        `${API_BASE_URL}/classrooms/${classroomId}/posts/${postId}/submissions`,
        {
          method: "POST",
          headers: {
            ...getAuthHeader(),
          },
          body: formData,
        },
      );
      return response.json();
    },

    getSubmissions: async (classroomId, postId) => {
      const response = await fetch(
        `${API_BASE_URL}/classrooms/${classroomId}/posts/${postId}/submissions`,
        {
          method: "GET",
          headers: getHeaders(true),
        },
      );
      return response.json();
    },

    gradeSubmission: async (classroomId, postId, submissionId, payload) => {
      const response = await fetch(
        `${API_BASE_URL}/classrooms/${classroomId}/posts/${postId}/submissions/${submissionId}`,
        {
          method: "PATCH",
          headers: getHeaders(true),
          body: JSON.stringify(payload),
        },
      );
      return response.json();
    },

    downloadSubmissionFile: async (
      classroomId,
      postId,
      submissionId,
      fileIndex,
    ) => {
      const response = await fetch(
        `${API_BASE_URL}/classrooms/${classroomId}/posts/${postId}/submissions/${submissionId}/files/${fileIndex}`,
        {
          method: "GET",
          headers: {
            ...getAuthHeader(),
          },
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        return { error: errorBody.error || "Failed to download file" };
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const fileNameMatch = disposition.match(/filename="?([^/"]+)"?/);
      return {
        blob,
        fileName: fileNameMatch
          ? decodeURIComponent(fileNameMatch[1])
          : "submission-file",
      };
    },

    downloadPostAttachment: async (classroomId, postId, attachmentIndex) => {
      const response = await fetch(
        `${API_BASE_URL}/classrooms/${classroomId}/posts/${postId}/attachments/${attachmentIndex}`,
        {
          method: "GET",
          headers: {
            ...getAuthHeader(),
          },
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        return { error: errorBody.error || "Failed to download attachment" };
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const fileNameMatch = disposition.match(/filename="?([^"]+)"?/);
      return {
        blob,
        fileName: fileNameMatch
          ? decodeURIComponent(fileNameMatch[1])
          : "post-attachment",
      };
    },
  },
};

export default api;
