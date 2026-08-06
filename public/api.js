const API_URL = "/api";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  register: (email, password) => apiRequest("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email, password) => apiRequest("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  getConnectToken: (itemId) => apiRequest("/pluggy/connect-token", { method: "POST", body: JSON.stringify({ itemId }) }),
  linkItem: (itemId) => apiRequest("/pluggy/items", { method: "POST", body: JSON.stringify({ itemId }) }),
  listItems: () => apiRequest("/pluggy/items"),
  removeItem: (itemId) => apiRequest(`/pluggy/items/${itemId}`, { method: "DELETE" }),
  listAccounts: (itemId) => apiRequest(`/pluggy/items/${itemId}/accounts`),
};
