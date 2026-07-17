// Frontend API Utilities

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('X-CSRF-TOKEN='))
    ?.split('=')[1] || '';
  if (csrfToken) {
    headers['X-CSRF-TOKEN'] = csrfToken;
  }
  return headers;
};

export const api = {
  // Authentication Actions
  getSetupStatus: async () => {
    const res = await fetch('/api/auth/status');
    return res.json();
  },

  setupAdmin: async (username, password) => {
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Setup failed');
    if (data.token) localStorage.setItem('token', data.token);
    return data;
  },

  login: async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    if (data.token) localStorage.setItem('token', data.token);
    return data;
  },

  register: async (username, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    if (data.token) localStorage.setItem('token', data.token);
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },

  getMe: async () => {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      localStorage.removeItem('token');
      throw new Error('Session expired');
    }
    return res.json();
  },

  // File Manager Actions
  listFiles: async (parentId = null, searchOrFilters = '', trash = false) => {
    let url = `/api/files?trash=${trash}`;
    if (typeof searchOrFilters === 'string') {
      if (searchOrFilters) {
        url += `&search=${encodeURIComponent(searchOrFilters)}`;
      } else if (parentId) {
        url += `&parent=${parentId}`;
      }
    } else {
      if (parentId) {
        url += `&parent=${parentId}`;
      }
      Object.keys(searchOrFilters).forEach(key => {
        if (searchOrFilters[key] !== undefined && searchOrFilters[key] !== null && searchOrFilters[key] !== '') {
          url += `&${key}=${encodeURIComponent(searchOrFilters[key])}`;
        }
      });
    }
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load files');
    return res.json();
  },

  createFolder: async (name, parentId = null) => {
    const res = await fetch('/api/files/folder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ name, parent: parentId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create folder');
    return data;
  },

  // Custom XMLHttpRequest to monitor upload progress
  uploadFiles: (files, parentId = null, onProgress, xhrRef = null) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      if (xhrRef) {
        xhrRef.current = xhr;
      }
      const formData = new FormData();

      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      if (parentId) {
        formData.append('parent', parentId);
      }

      xhr.open('POST', '/api/files/upload');

      // Set headers
      const headers = getAuthHeaders();
      Object.keys(headers).forEach(key => {
        xhr.setRequestHeader(key, headers[key]);
      });

      // Progress listener
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent, e.loaded, e.total);
        }
      });

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (err) {
            resolve(xhr.responseText);
          }
        } else {
          try {
            const errBody = JSON.parse(xhr.responseText);
            reject(new Error(errBody.message || 'Upload failed'));
          } catch (_) {
            reject(new Error('Upload failed'));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  },

  renameItem: async (id, newName) => {
    const res = await fetch(`/api/files/rename/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to rename item');
    return data;
  },

  moveToTrash: async (id) => {
    const res = await fetch(`/api/files/trash/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to move to trash');
    return data;
  },

  restoreFromTrash: async (id) => {
    const res = await fetch(`/api/files/restore/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to restore item');
    return data;
  },

  purgeItem: async (id) => {
    const res = await fetch(`/api/files/purge/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to permanently delete');
    return data;
  },

  // Helper URLs for direct element source binding (e.g. video src)
  getPreviewUrl: (id) => {
    const token = localStorage.getItem('token');
    return `/api/files/preview/${id}?token=${encodeURIComponent(token)}`;
  },

  getDownloadUrl: (id) => {
    const token = localStorage.getItem('token');
    return `/api/files/download/${id}?token=${encodeURIComponent(token)}`;
  },

  getVersionDownloadUrl: (id, index) => {
    const token = localStorage.getItem('token');
    return `/api/files/download/${id}/version/${index}?token=${encodeURIComponent(token)}`;
  },

  // Analytics & Logs
  getAnalytics: async () => {
    const res = await fetch('/api/files/analytics', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load analytics');
    return res.json();
  },

  getLogs: async () => {
    const res = await fetch('/api/logs', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load activity logs');
    return res.json();
  },

  moveItem: async (id, parentId = null) => {
    const res = await fetch(`/api/files/move/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ parent: parentId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to move item');
    return data;
  },

  copyItem: async (id, parentId = null) => {
    const res = await fetch(`/api/files/copy/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ parent: parentId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to copy item');
    return data;
  },

  toggleFavorite: async (id) => {
    const res = await fetch(`/api/files/${id}/favorite`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update favorite status');
    return data;
  },

  updateTags: async (id, tags) => {
    const res = await fetch(`/api/files/${id}/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ tags }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update tags');
    return data;
  },

  addComment: async (id, comment) => {
    const res = await fetch(`/api/files/${id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ comment }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to add comment');
    return data;
  },

  createShareLink: async (id, passcode = "", expiryDate = null) => {
    const res = await fetch(`/api/files/${id}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ passcode, expiryDate }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create share link');
    return data;
  },

  deleteShareLink: async (id, code) => {
    const res = await fetch(`/api/files/${id}/share/${code}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete share link');
    return data;
  },

  uploadNewVersion: async (id, file, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      xhr.open('POST', `/api/files/${id}/version`);
      const headers = getAuthHeaders();
      Object.keys(headers).forEach(key => {
        xhr.setRequestHeader(key, headers[key]);
      });

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent, e.loaded, e.total);
          }
        });
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error('Failed to upload new version'));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during version upload'));
      xhr.send(formData);
    });
  },

  getInsights: async () => {
    const res = await fetch('/api/files/stats/insights', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load insights statistics');
    return res.json();
  },

  getNotes: async () => {
    const res = await fetch('/api/auth/notes', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to retrieve personal notes');
    return res.json();
  },

  saveNotes: async (notes) => {
    const res = await fetch('/api/auth/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to save notes');
    return data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const res = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update password');
    return data;
  },

  logSettingsChange: async (details) => {
    const res = await fetch('/api/auth/log-settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ details }),
    });
    return res.json();
  },

  getHealth: async () => {
    const res = await fetch('/api/auth/health', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch server health indicators');
    return res.json();
  },

  updateProfile: async (profileData) => {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(profileData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update profile settings');
    return data;
  },

  forgotPassword: async (username, email) => {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Forgot password failed');
    return data;
  },

  resetPassword: async (token, newPassword) => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Password reset failed');
    return data;
  },

  // Admin Operations
  getAdminUsers: async () => {
    const res = await fetch('/api/admin/users', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch users list');
    return res.json();
  },

  updateUserRole: async (userId, role) => {
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update user role');
    return data;
  },

  updateUserPlan: async (userId, plan, storageLimit) => {
    const res = await fetch(`/api/admin/users/${userId}/plan`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ plan, storageLimit }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update user plan');
    return data;
  },

  getAdminStatus: async () => {
    const res = await fetch('/api/admin/status', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch platform status');
    return res.json();
  },

  generateAISummary: async (id) => {
    const res = await fetch(`/api/files/${id}/ai-summary`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to generate AI Summary');
    return data;
  },

  semanticAISearch: async (query) => {
    const res = await fetch(`/api/files/ai-search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to perform AI search');
    return data;
  },

  lockFile: async (id) => {
    const res = await fetch(`/api/files/${id}/lock`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to lock file');
    return data;
  },

  unlockFile: async (id) => {
    const res = await fetch(`/api/files/${id}/unlock`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to unlock file');
    return data;
  },

  resolveSyncConflict: async (id, resolution) => {
    const res = await fetch(`/api/files/${id}/sync-resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ resolution }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to resolve conflict');
    return data;
  }
};
