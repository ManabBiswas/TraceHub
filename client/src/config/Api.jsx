const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper function to get token from localStorage
const getToken = () => localStorage.getItem('token');

// Helper function to set auth headers
const getHeaders = (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};

export const api = {
  // ========== AUTH ENDPOINTS ==========
  auth: {
    register: async (email, password, name) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: getHeaders(false),
        body: JSON.stringify({ email, password, name }),
      });
      return response.json();
    },

    login: async (email, password) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: getHeaders(false),
        body: JSON.stringify({ email, password }),
      });
      return response.json();
    },

    forgotPassword: async (email, newPassword) => {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: getHeaders(false),
        body: JSON.stringify({ email, newPassword }),
      });
      return response.json();
    },

    getMe: async () => {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: getHeaders(true),
      });
      return response.json();
    },

    updateProfilePicture: async (profilePicture) => {
      const response = await fetch(`${API_BASE_URL}/auth/profile-picture`, {
        method: 'PATCH',
        headers: getHeaders(true),
        body: JSON.stringify({ profilePicture }),
      });
      return response.json();
    },

    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },

  // ========== RESOURCES ENDPOINTS ==========
  resources: {
    getAll: async (userId = null) => {
      const url = userId
        ? `${API_BASE_URL}/resources?userId=${userId}`
        : `${API_BASE_URL}/resources`;
      const response = await fetch(url, {
        headers: getHeaders(false),
      });
      return response.json();
    },

    getById: async (id) => {
      const response = await fetch(`${API_BASE_URL}/resources/${id}`, {
        headers: getHeaders(false),
      });
      return response.json();
    },
  },

  // ========== UPLOAD ENDPOINTS ==========
  upload: {
    uploadFile: async (file, title) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
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
      const response = await fetch(`${API_BASE_URL}/pending/approve/${resourceId}`, {
        method: 'POST',
        headers: getHeaders(false),
        body: JSON.stringify({ passcode }),
      });
      return response.json();
    },

    reject: async (resourceId, passcode) => {
      const response = await fetch(`${API_BASE_URL}/pending/reject/${resourceId}`, {
        method: 'POST',
        headers: getHeaders(false),
        body: JSON.stringify({ passcode }),
      });
      return response.json();
    },
  },
};

export default api;