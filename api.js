const API_BASE_URL = localStorage.getItem('apiBaseUrl') || 'https://waveit-smartlink-api.onrender.com';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Request failed with status ${response.status}`);
  }
  return payload;
};

const registerUser = async ({ artist_name, email, password }) =>
  apiRequest('/api/register', {
    method: 'POST',
    body: JSON.stringify({ artist_name, email, password }),
  });

const loginUser = async ({ email, password }) =>
  apiRequest('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

const getUserLinks = async () => apiRequest('/api/links/user');

const createLink = async ({ title, cover_image, platforms }) =>
  apiRequest('/api/links', {
    method: 'POST',
    body: JSON.stringify({ title, cover_image, platforms }),
  });

const deleteLink = async (linkId) =>
  apiRequest(`/api/links/${encodeURIComponent(linkId)}`, {
    method: 'DELETE',
  });

const getAnalytics = async (linkId) => apiRequest(`/api/analytics/${encodeURIComponent(linkId)}`);

window.apiService = {
  registerUser,
  loginUser,
  getUserLinks,
  createLink,
  deleteLink,
  getAnalytics,
};


