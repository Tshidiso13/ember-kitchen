import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";
const ACCESS = "ember_access_token";
const REFRESH = "ember_refresh_token";

export type User = { id: string; name: string; email: string; phone?: string | null; address?: string | null; role: "CUSTOMER" | "ADMIN" };
type Session = { accessToken: string; refreshToken: string; user: User };

async function setSecret(key: string, value: string) {
  if (Platform.OS === "web") return AsyncStorage.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
}
async function getSecret(key: string) {
  if (Platform.OS === "web") return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}
async function deleteSecret(key: string) {
  if (Platform.OS === "web") return AsyncStorage.removeItem(key);
  return SecureStore.deleteItemAsync(key);
}
async function saveSession(session: Session) {
  await Promise.all([setSecret(ACCESS, session.accessToken), setSecret(REFRESH, session.refreshToken)]);
}
export async function clearSession() {
  await Promise.all([deleteSecret(ACCESS), deleteSecret(REFRESH)]);
}
async function refreshSession() {
  const refreshToken = await getSecret(REFRESH);
  if (!refreshToken) throw new Error("Session expired");
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { await clearSession(); throw new Error(data.message || "Session expired"); }
  await saveSession(data);
  return data as Session;
}
export async function api<T>(path: string, init: RequestInit = {}, authenticated = false, retry = true): Promise<T> {
  const token = authenticated ? await getSecret(ACCESS) : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  });
  if (response.status === 401 && authenticated && retry) {
    await refreshSession();
    return api<T>(path, init, true, false);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message.join(". ") : data.message;
    throw new Error(message || `Request failed (${response.status})`);
  }
  return data as T;
}
export async function signIn(email: string, password: string) {
  const session = await api<Session>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  await saveSession(session); return session.user;
}
export async function signUp(name: string, email: string, password: string) {
  const session = await api<Session>("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
  await saveSession(session); return session.user;
}
export async function restoreUser() {
  const refresh = await getSecret(REFRESH);
  if (!refresh) return null;
  try { return await api<User>("/users/me", {}, true); } catch { await clearSession(); return null; }
}
