export const API_BASE_URL = import.meta.env.VITE_FLASK_SERVER_URL;

/**
 * Tiny JSON fetch wrapper.
 * - Adds Authorization: Bearer <token> when provided
 * - Throws with a readable error message on non-2xx
 */
export async function apiFetch(path, { token, ...options } = {}) {
  const safePath = path?.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${safePath}`;

  const headers = new Headers(options.headers ?? {});
  if (!headers.has("Content-Type") && options.body != null) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && (data.error || data.message)) ||
      (typeof data === "string" && data) ||
      `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
