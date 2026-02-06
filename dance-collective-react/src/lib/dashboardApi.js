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

export async function addGigRole({ token, gig_role }) {
  return apiFetch("/gigs-roles/", {
    method: "POST",
    token,
    body: JSON.stringify(gig_role),
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

export async function getApplicationStatuses({ token }) {
  return apiFetch("/application-status/", {
    method: "GET",
    token,
  });
}

export async function updateApplicationStatus({
  token,
  application_id,
  status,
}) {
  return apiFetch(`/applications/${application_id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status }),
  });
}

// --- Action helpers (match backend rules) ---
// Applicants can only withdraw.
export async function withdrawApplication({ token, application_id }) {
  return updateApplicationStatus({
    token,
    application_id,
    status: "withdrawn",
  });
}

// Employers can only accept/reject/shortlist.
export async function acceptApplication({ token, application_id }) {
  return updateApplicationStatus({ token, application_id, status: "accepted" });
}

export async function rejectApplication({ token, application_id }) {
  return updateApplicationStatus({ token, application_id, status: "rejected" });
}

export async function shortlistApplication({ token, application_id }) {
  return updateApplicationStatus({
    token,
    application_id,
    status: "shortlisted",
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

// Roles
// Backend exposes:
// - GET /roles/ -> ["choreographer", "dancer", "employer"]
// - GET /roles/<role_name> -> { status: "ok", role: "dancer" }
export async function getRoles({ token } = {}) {
  const res = await apiFetch("/roles/", {
    method: "GET",
    token,
  });
  return Array.isArray(res) ? res : [];
}

// Gig Roles
// Backend exposes: GET /gigs-roles/<gig_id> -> rows from gigs_roles table
// Shape is backend-defined, so we keep it flexible and normalize later.
export async function getGigRoles({ token, gig_id }) {
  if (gig_id == null || gig_id === "") {
    throw new Error("gig_id is required");
  }
  return apiFetch(`/gigs-roles/${gig_id}`, {
    method: "GET",
    token,
  });
}

export function normalizeGigRolesResponse(rows) {
  if (!rows) return [];
  const list = Array.isArray(rows)
    ? rows
    : Array.isArray(rows.roles)
      ? rows.roles
      : [];
  const out = new Set();

  for (const r of list) {
    // Try common columns.
    const raw =
      typeof r === "string"
        ? r
        : r && typeof r === "object"
          ? (r.role_name ?? r.required_role ?? r.role ?? r.name)
          : "";

    const v = String(raw ?? "")
      .trim()
      .toLowerCase();
    if (v === "dancer" || v === "choreographer") out.add(v);
  }

  return Array.from(out);
}

// --- Gig required-roles helpers ---
// Different backends represent this differently (array, CSV string, booleans, join table).
// These helpers let the UI enforce apply rules as long as the gig includes *some* hint.
export function normalizeGigRequiredRoles(gig) {
  if (!gig || typeof gig !== "object") return [];

  const out = new Set();

  const takeRole = (r) => {
    // Accept either a string role name ("dancer") or an object from a join
    // (e.g. { role_name: "dancer" } or { name: "dancer" }).
    const raw =
      typeof r === "string"
        ? r
        : r && typeof r === "object"
          ? (r.role_name ?? r.name ?? r.role)
          : "";

    const v = String(raw ?? "")
      .trim()
      .toLowerCase();
    if (v === "dancer" || v === "choreographer") out.add(v);
  };

  // Preferred: required_roles: ["dancer", "choreographer"]
  if (Array.isArray(gig.required_roles)) {
    for (const r of gig.required_roles) takeRole(r);
  }

  // Common if backend returns a join-table expansion:
  // required_roles: [{ role_name: "dancer" }, ...]
  // (Handled by takeRole above.)

  // Alternative: roles_required: [..]
  if (Array.isArray(gig.roles_required)) {
    for (const r of gig.roles_required) takeRole(r);
  }

  // Alternative: required_roles: { roles: [...] }
  if (gig.required_roles && typeof gig.required_roles === "object") {
    const inner = gig.required_roles;
    if (Array.isArray(inner.roles)) {
      for (const r of inner.roles) takeRole(r);
    }
  }

  // Alternative: required_roles: "dancer,choreographer"
  if (typeof gig.required_roles === "string") {
    for (const part of gig.required_roles.split(",")) takeRole(part);
  }

  // Alternative: required_role: "dancer"
  if (typeof gig.required_role === "string") takeRole(gig.required_role);

  // Alternative: booleans
  if (gig.requires_dancer === true) out.add("dancer");
  if (gig.requires_choreographer === true) out.add("choreographer");

  return Array.from(out);
}

export function gigAllowsRole(gig, roleName) {
  const role = String(roleName ?? "")
    .trim()
    .toLowerCase();
  if (role !== "dancer" && role !== "choreographer") return false;

  const required = normalizeGigRequiredRoles(gig);
  // If backend doesn't provide required roles yet, default to allow (non-breaking).
  if (!required.length) return true;
  return required.includes(role);
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

export async function getEmployerFromUser({ token, userId }) {
  const res = await apiFetch(`/employer-members/${userId}`, {
    method: "GET",
    token,
  });
  return res;
}

export async function createEmployer({ token, body }) {
  const res = await apiFetch("/employers/", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
  return res;
}
