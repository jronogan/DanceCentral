export const API_URL = import.meta.env.VITE_FLASK_SERVER_URL;

// Options: method, headers, body
export async function apiFetch(endpoint, { token, ...options } = {}) {
  const safeEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const headers = new Headers(options.headers ?? {});
  if (!headers.has("Content-Type") && options.body != null) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${safeEndpoint}`, {
    ...options,
    headers,
  });

  //   Check if the response is JSON
  const contentType = response.headers.get("Content-Type") ?? "";
  const resJson = contentType.includes("application/json");
  const data = resJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  return data;
}
