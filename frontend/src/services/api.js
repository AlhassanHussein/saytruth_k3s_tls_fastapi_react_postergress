// API base URL from environment variable
// In production, use Caddy proxy on same host; in dev, use localhost port 80 (Caddy)
const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost';

// Normalize base URL to avoid accidental '/api' duplication and trailing slashes
const normalizeBaseUrl = (base) => {
  let b = (base || '').trim();
  // Remove trailing slash
  if (b.endsWith('/')) {
    b = b.slice(0, -1);
  }
  // Strip trailing '/api' if present (case-insensitive)
  const lower = b.toLowerCase();
  if (lower.endsWith('/api')) {
    b = b.slice(0, -4);
  }
  return b;
};

const API_BASE_URL = normalizeBaseUrl(RAW_API_BASE_URL);

// Helper function to get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Helper function to set auth token in localStorage
export const setAuthToken = (token) => {
  localStorage.setItem('authToken', token);
};

// Helper function to clear auth token
export const clearAuthToken = () => {
  localStorage.removeItem('authToken');
};

// Helper function to make API requests
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Ensure endpoint starts with a single leading slash
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  console.log(`API Request: ${options.method || 'GET'} ${API_BASE_URL}${normalizedEndpoint}`, { token: token ? 'present' : 'missing' });

  const response = await fetch(`${API_BASE_URL}${normalizedEndpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Include cookies for session management
  });

  console.log(`API Response: ${response.status}`, response.statusText);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    console.error('API Error:', error);
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
};

// ============ Auth API ============

export const authAPI = {
  signup: async (username, name, secretPhrase, secretAnswer) => {
    const data = await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        username,
        name,
        secret_phrase: secretPhrase,
        secret_answer: secretAnswer,
      }),
      skipAuth: true,
    });
    if (data.access_token) {
      setAuthToken(data.access_token);
    }
    return data;
  },

  login: async (username, secretAnswer) => {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, secret_answer: secretAnswer }),
      skipAuth: true,
    });
    if (data.access_token) {
      setAuthToken(data.access_token);
    }
    return data;
  },

  recoverPassword: async (username) => {
    return apiRequest('/api/auth/recover', {
      method: 'POST',
      body: JSON.stringify({ username }),
      skipAuth: true,
    });
  },

  verifyRecovery: async (username, secretAnswer) => {
    const data = await apiRequest('/api/auth/recover/verify', {
      method: 'POST',
      body: JSON.stringify({ username, secret_answer: secretAnswer }),
      skipAuth: true,
    });
    if (data.access_token) {
      setAuthToken(data.access_token);
    }
    return data;
  },

  updateSettings: async (settings) => {
    return apiRequest('/api/auth/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  },

  logout: () => {
    clearAuthToken();
  },

  getCurrentUser: async () => {
    return apiRequest('/api/auth/me');
  },
};

// ============ Messages API ============

export const messagesAPI = {
  getMessages: async () => {
    return apiRequest('/api/messages/');
  },

  getInbox: async () => {
    // Fetch all messages grouped by status: inbox, public, favorite
    return apiRequest('/api/messages/inbox');
  },

  sendMessage: async (receiverUsername, content) => {
    return apiRequest('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify({ receiver_username: receiverUsername, content }),
      skipAuth: true, // Allow anonymous messages
    });
  },

  updateMessageStatus: async (messageId, status) => {
    return apiRequest(`/api/messages/${messageId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  makeMessagePublic: async (messageId) => {
    return apiRequest(`/api/messages/${messageId}/make-public`, {
      method: 'PATCH',
    });
  },

  makeMessagePrivate: async (messageId) => {
    return apiRequest(`/api/messages/${messageId}/make-private`, {
      method: 'PATCH',
    });
  },

  addToFavorite: async (messageId) => {
    return apiRequest(`/api/messages/${messageId}/add-favorite`, {
      method: 'PATCH',
    });
  },

  removeFromFavorite: async (messageId) => {
    return apiRequest(`/api/messages/${messageId}/remove-favorite`, {
      method: 'PATCH',
    });
  },

  deleteMessage: async (messageId) => {
    return apiRequest(`/api/messages/${messageId}`, {
      method: 'DELETE',
    });
  },

  deleteAllInSection: async (section) => {
    return apiRequest(`/api/messages/section/${section}/all`, {
      method: 'DELETE',
    });
  },
};

// ============ Links API ============

export const linksAPI = {
  // Create a temporary anonymous messaging link
  createLink: async (linkData) => {
    // Do NOT skip auth: if user is logged in, include token so backend associates owner
    return apiRequest('/api/links/create', {
      method: 'POST',
      body: JSON.stringify(linkData),
    });
  },

  // Get user's created links (requires auth)
  getUserLinks: async () => {
    return apiRequest('/api/links/my-links');
  },

  // Get public info about a link
  getLinkInfo: async (publicId) => {
    return apiRequest(`/api/links/${publicId}/info`, {
      skipAuth: true,
    });
  },

  // Send message to a public link
  sendLinkMessage: async (publicId, content) => {
    return apiRequest(`/api/links/${publicId}/send`, {
      method: 'POST',
      body: JSON.stringify({ content }),
      skipAuth: true, // Allow anonymous message sending
    });
  },

  // Get messages from a private link
  getLinkMessages: async (privateId) => {
    return apiRequest(`/api/links/${privateId}/messages`, {
      skipAuth: true, // Private ID acts as access token
    });
  },

  // Make a link message public
  makeLinkMessagePublic: async (privateId, messageId) => {
    return apiRequest(`/api/links/${privateId}/messages/${messageId}/make-public`, {
      method: 'PATCH',
    });
  },

  // Make a link message private
  makeLinkMessagePrivate: async (privateId, messageId) => {
    return apiRequest(`/api/links/${privateId}/messages/${messageId}/make-private`, {
      method: 'PATCH',
    });
  },

  // Delete a link message
  deleteLinkMessage: async (privateId, messageId) => {
    return apiRequest(`/api/links/${privateId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  },

  // Delete a link (requires auth)
  deleteLink: async (linkId) => {
    return apiRequest(`/api/links/${linkId}/delete`, {
      method: 'DELETE',
    });
  },
};

// ============ Users API ============

export const userAPI = {
  searchUsers: async (username) => {
    return apiRequest('/api/users/search', {
      method: 'POST',
      body: JSON.stringify({ username }),
      skipAuth: true,
    });
  },

  getUserByUsername: async (username) => {
    return apiRequest(`/api/users/username/${username}`, {
      skipAuth: true,
    });
  },

  getUserProfile: async (userId) => {
    return apiRequest(`/api/users/${userId}`, {
      skipAuth: true, // Public profile accessible by anyone
    });
  },

  followUser: async (userId) => {
    return apiRequest(`/api/users/follow/${userId}`, {
      method: 'POST',
    });
  },

  unfollowUser: async (userId) => {
    return apiRequest(`/api/users/unfollow/${userId}`, {
      method: 'DELETE',
    });
  },

  checkFollowStatus: async (userId) => {
    // Must send auth token to check if the logged-in user follows this user
    // If not authenticated, backend will return 401 or handle as guest
    return apiRequest(`/api/users/${userId}/follow-status`);
  },

  getMyFollowing: async () => {
    return apiRequest('/api/users/me/following');
  },

  getFollowing: async () => {
    return apiRequest('/api/users/following');
  },

  getFollowers: async () => {
    return apiRequest('/api/users/followers');
  },

  sendAnonymousMessage: async (userId, content) => {
    // Helper to send anonymous message to a user by ID
    // First fetch user to get username, then send message
    try {
      const profile = await userAPI.getUserProfile(userId);
      return await messagesAPI.sendMessage(profile.username, content);
    } catch (err) {
      throw new Error('Failed to send message');
    }
  },

  sendAnonymousMessageByUsername: async (username, content) => {
    try {
      return await messagesAPI.sendMessage(username, content);
    } catch (err) {
      throw new Error('Failed to send message');
    }
  },
};

// Keep old usersAPI for backward compatibility
export const usersAPI = userAPI;
