const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function authHeader() {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}), ...authHeader() };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.text();
    let error = body;
    try { error = JSON.parse(body); } catch(e) {}
    throw error;
  }
  // If no content
  if (res.status === 204) return null;
  // Try parse json
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch(e) { return text; }
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
  upload: async (path, formData) => {
    const headers = { ...authHeader() };
    const res = await fetch(`${BASE}${path}`, { method: 'POST', body: formData, headers });
    if (!res.ok) throw await res.json();
    return res.json();
  }
  ,
  uploadWithProgress: (path, formData, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${BASE}${path}`;
      xhr.open('POST', url);
      const token = localStorage.getItem('accessToken');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
      xhr.onload = () => {
        try {
          const status = xhr.status;
          const text = xhr.responseText;
          const data = text ? JSON.parse(text) : null;
          if (status >= 200 && status < 300) resolve(data);
          else reject(data || text);
        } catch (err) { reject(err); }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(formData);
    });
  }
};

export default api;
