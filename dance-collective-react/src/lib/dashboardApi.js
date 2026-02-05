import { apiFetch } from "./api.js";

// Aligned to your Flask routes:
// - gigs blueprint
//   - POST /gigs/  (create_gig)
//   - GET  /gigs/  (get_gigs) supports query: employer_id, type_name, posted_by_user_id
// - applications blueprint
//   - POST   /applications/  (create_application)
//   - GET    /applications/  (get_application) -> applications for current user
//   - PATCH  /applications/<application_id>
//   - DELETE /applications/

export async function getGigs({ token, filters } = {}) {
  const params = new URLSearchParams();
  if (filters?.employer_id)
    params.set("employer_id", String(filters.employer_id));
  if (filters?.type_name) params.set("type_name", String(filters.type_name));
  if (filters?.posted_by_user_id)
    params.set("posted_by_user_id", String(filters.posted_by_user_id));

  const qs = params.toString();
  return apiFetch(`/gigs/${qs ? `?${qs}` : ""}`, {
    method: "GET",
    token,
  });
}

export async function createGig({ token, gig }) {
  return apiFetch("/gigs/", {
    method: "POST",
    token,
    body: JSON.stringify(gig),
  });
}

export async function getMyApplications({ token }) {
  return apiFetch("/applications/", {
    method: "GET",
    token,
  });
}

export async function getApplicationsForGig({ token, gig_id }) {
  const params = new URLSearchParams();
  if (gig_id != null) params.set("gig_id", String(gig_id));
  const qs = params.toString();

  return apiFetch(`/applications/${qs ? `?${qs}` : ""}`, {
    method: "GET",
    token,
  });
}

export async function applyToGig({ token, gig_id }) {
  return apiFetch("/applications/", {
    method: "POST",
    token,
    body: JSON.stringify({ gig_id }),
  });
}

// Event Types
// Backend table: event_types(type_name VARCHAR(50) PK)
// Assumption: backend exposes GET /event-types/ returning an array of rows
// like: [{ type_name: "audition" }, ...] OR ["audition", ...]
export async function getEventTypes({ token } = {}) {
  return apiFetch("/event-types/", {
    method: "GET",
    token,
  });
}

export async function getApplicationsForEmployerGigs() {
  // Deprecated by backend change: employers can call GET /applications/?gig_id=<id>.
  // Use getApplicationsForGig instead.
  return { status: "deprecated", applications: [] };
}

export async function getUserSkills({ token, userId }) {
  const res = await apiFetch(`/users-skills/${userId}/skills`, {
    method: "GET",
    token,
  });
  return Array.isArray(res) ? res : [];
}
