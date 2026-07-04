// Frontend API Utilities

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
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
  listFiles: async (parentId = null, search = '', trash = false) => {
    let url = `/api/files?trash=${trash}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    } else if (parentId) {
      url += `&parent=${parentId}`;
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
  uploadFiles: (files, parentId = null, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
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
          onProgress(percent);
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
  }
};
