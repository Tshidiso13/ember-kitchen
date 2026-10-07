const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
let accessToken = localStorage.getItem("ember_admin_access") || "";
let refreshToken = localStorage.getItem("ember_admin_refresh") || "";
export const hasSession = () => !!refreshToken;
export const clearSession = () => { accessToken = ""; refreshToken = ""; localStorage.removeItem("ember_admin_access"); localStorage.removeItem("ember_admin_refresh"); };
export async function login(email: string, password: string) {
  const r = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const data = await r.json(); if (!r.ok) throw new Error(data.message || "Login failed");
  if (data.user.role !== "ADMIN") throw new Error("This account does not have admin access");
  accessToken = data.accessToken; refreshToken = data.refreshToken;
  localStorage.setItem("ember_admin_access", accessToken); localStorage.setItem("ember_admin_refresh", refreshToken);
  return data.user;
}
async function renew() {
  const r = await fetch(`${API}/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }) });
  if (!r.ok) { clearSession(); throw new Error("Session expired"); }
  const data = await r.json(); accessToken = data.accessToken; refreshToken = data.refreshToken;
  localStorage.setItem("ember_admin_access", accessToken); localStorage.setItem("ember_admin_refresh", refreshToken);
}
export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const r = await fetch(`${API}${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...(init.headers || {}) } });
  if (r.status === 401 && retry && refreshToken) { await renew(); return api<T>(path, init, false); }
  const data = await r.json().catch(() => ({})); if (!r.ok) throw new Error(data.message || "Request failed"); return data as T;
}
