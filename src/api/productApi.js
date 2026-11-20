const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const request = async (path, options = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.message || 'Request failed');
  }
  return res.json();
};

export const getProducts = (q = '') => request(`/api/products${q ? `?q=${encodeURIComponent(q)}` : ''}`);
export const createProduct = (data) => request('/api/products', { method: 'POST', body: JSON.stringify(data) });
export const updateProduct = (id, data) => request(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteProduct = (id) => request(`/api/products/${id}`, { method: 'DELETE' });
export const bulkImportProducts = (rows) => request('/api/products/bulk-import', { method: 'POST', body: JSON.stringify(rows) });
