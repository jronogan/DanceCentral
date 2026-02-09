import { apiFetch } from "./api";

// 1. USER FUNCTION ROUTES
export async function registerNewUser(details) {
  const data = await apiFetch("/users/register", {
    method: "POST",
    body: JSON.stringify(details),
  });
  return data;
}

export async function loginUser({
  email,
  password,
  skipEmployerLookup = false,
}) {
  const credentials = { email, password, skipEmployerLookup };
  const data = await apiFetch("/users/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  return data;
}
// Note that login returns access_token + refresh_token

export async function getUserProfile(token) {
  const data = await apiFetch("/users/me", {
    method: "GET",
    token,
  });
  return data;
}
// Optional: refresh access token (requires refresh token)
export async function refreshAccessToken(refreshToken) {
  const data = await apiFetch("/users/refresh", {
    method: "GET",
    token: refreshToken,
  });
  return data;
}

export async function deleteUser({ userId, token }) {
  const data = await apiFetch(`/users/${userId}`, {
    method: "DELETE",
    token,
  });
  return data;
}

export async function updateUser({ token, ...updates }) {
  const data = await apiFetch("/users/", {
    method: "PATCH",
    token,
    body: JSON.stringify(updates),
  });
  return data;
}

// 2. EMPLOYER FUNCTION ROUTES
export async function createEmployer({ token, ...details }) {
  const data = await apiFetch("/employers/", {
    method: "POST",
    token,
    body: JSON.stringify(details),
  });
  return data;
}

export async function getEmployers({ token }) {
  const data = await apiFetch("/employers/", {
    method: "GET",
    token,
  });
  return data;
}

export async function getEmployer({ employerId, token }) {
  const data = await apiFetch(`/employers/${employerId}`, {
    method: "GET",
    token,
  });
  return data;
}

export async function updateEmployer({ employerId, token, ...details }) {
  const data = await apiFetch(`/employers/${employerId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(details),
  });
  return data;
}

export async function deleteEmployer({ employerId, token }) {
  const data = await apiFetch(`/employers/${employerId}`, {
    method: "DELETE",
    token,
  });
  return data;
}

// 3. GIG FUNCTION ROUTES
export async function createGig({ token, ...details }) {
  const data = await apiFetch("/gigs/", {
    method: "POST",
    token,
    body: JSON.stringify(details),
  });
  return data;
}

/**
 * Filters supported by backend (all optional): employer_id, type_name, posted_by_user_id
 */
export async function getGigs({
  token,
  employerId,
  typeName,
  postedByUserId,
} = {}) {
  const params = new URLSearchParams();
  if (employerId != null) params.set("employer_id", String(employerId));
  if (typeName != null) params.set("type_name", String(typeName));
  if (postedByUserId != null)
    params.set("posted_by_user_id", String(postedByUserId));

  const qs = params.toString();
  const endpoint = qs ? `/gigs/?${qs}` : "/gigs/";

  const data = await apiFetch(endpoint, {
    method: "GET",
    token,
  });
  return data;
}

export async function getPostedGigs({ token }) {
  const data = await apiFetch("/gigs/mygigs", {
    method: "GET",
    token,
  });
  return data;
}

export async function updateGig({ gigId, token, ...details }) {
  const data = await apiFetch(`/gigs/${gigId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(details),
  });
  return data;
}

export async function deleteGig({ gigId, token }) {
  const data = await apiFetch(`/gigs/${gigId}`, {
    method: "DELETE",
    token,
  });
  return data;
}

// 4. GIG ROLES FUNCTION ROUTES
export async function createGigRole({ token, ...details }) {
  const data = await apiFetch("/gigs-roles/", {
    method: "POST",
    token,
    body: JSON.stringify(details),
  });
  return data;
}

export async function getGigRoles({ gigId, token }) {
  const data = await apiFetch(`/gigs-roles/${gigId}`, {
    method: "GET",
    token,
  });
  return data;
}

export async function updateGigRole({ gigId, token, ...details }) {
  const data = await apiFetch(`/gigs-roles/${gigId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(details),
  });
  return data;
}

export async function deleteGigRole({ gigId, token, roleName }) {
  const data = await apiFetch(`/gigs-roles/${gigId}`, {
    method: "DELETE",
    token,
    body: JSON.stringify({ role_name: roleName }),
  });
  return data;
}

// 5. APPLICATION FUNCTION ROUTES
export async function createApplication({ token, gigId }) {
  const data = await apiFetch("/applications/", {
    method: "POST",
    token,
    body: JSON.stringify({ gig_id: gigId }),
  });
  return data;
}

/**
 * If gigId is provided, backend treats it as employer view for that gig (must be posted_by current user).
 * If omitted, backend returns the logged-in user's applications.
 */
export async function getApplications({ token, gigId } = {}) {
  const endpoint =
    gigId != null
      ? `/applications/?gig_id=${encodeURIComponent(String(gigId))}`
      : "/applications/";
  const data = await apiFetch(endpoint, {
    method: "GET",
    token,
  });
  return data;
}

export async function getUserApplications({ token }) {
  const data = await apiFetch("/applications/", {
    method: "GET",
    token,
  });
  return data;
}

export async function deleteApplication({ token, gigId }) {
  const data = await apiFetch("/applications/", {
    method: "DELETE",
    token,
    body: JSON.stringify({ gig_id: gigId }),
  });
  return data;
}

export async function updateApplicationStatus({
  token,
  applicationId,
  status,
}) {
  const data = await apiFetch(`/applications/${applicationId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status }),
  });
  return data;
}

// Applicants can only withdraw.
export async function withdrawApplication({ token, application_id }) {
  const res = await updateApplicationStatus({
    token,
    applicationId: application_id,
    status: "withdrawn",
  });
  return res;
}

// Employers can only accept/reject/shortlist.
export async function acceptApplication({ token, application_id }) {
  const res = await updateApplicationStatus({
    token,
    applicationId: application_id,
    status: "accepted",
  });
  return res;
}

export async function rejectApplication({ token, application_id }) {
  const res = await updateApplicationStatus({
    token,
    applicationId: application_id,
    status: "rejected",
  });
  return res;
}

export async function shortlistApplication({ token, application_id }) {
  const res = await updateApplicationStatus({
    token,
    applicationId: application_id,
    status: "shortlisted",
  });
  return res;
}

// 6. USERS-ROLES FUNCTION ROUTES
export async function assignUserRole({ token, userId, roleName }) {
  const data = await apiFetch("/users-roles/roles", {
    method: "POST",
    token,
    body: JSON.stringify({ user_id: userId, role_name: roleName }),
  });
  return data;
}

export async function removeUserRole({ token, userId, roleName }) {
  const data = await apiFetch("/users-roles/roles", {
    method: "DELETE",
    token,
    body: JSON.stringify({ user_id: userId, role_name: roleName }),
  });
  return data;
}

export async function getRolesForUser({ token }) {
  const data = await apiFetch(`/users-roles/myroles`, {
    method: "GET",
    token,
  });
  return data;
}

// 7. USERS-SKILLS FUNCTION ROUTES
export async function assignUserSkill({ token, userId, skillName }) {
  const data = await apiFetch("/users-skills/skills", {
    method: "POST",
    token,
    body: JSON.stringify({ user_id: userId, skill_name: skillName }),
  });
  return data;
}

export async function removeUserSkill({ token, userId, skillName }) {
  const data = await apiFetch("/users-skills/skills", {
    method: "DELETE",
    token,
    body: JSON.stringify({ user_id: userId, skill_name: skillName }),
  });
  return data;
}

export async function getSkillsForUser({ token, userId }) {
  const data = await apiFetch(`/users-skills/${userId}/skills`, {
    method: "GET",
    token,
  });
  return data;
}

// 8. ROLES (master table)
export async function getRoles() {
  const data = await apiFetch("/roles/", {
    method: "GET",
  });
  return data;
}

export async function getRole(roleName) {
  const data = await apiFetch(
    `/roles/${encodeURIComponent(String(roleName))}`,
    {
      method: "GET",
    },
  );
  return data;
}

// 9. SKILLS (master table)
export async function getSkills() {
  const data = await apiFetch("/skills/", {
    method: "GET",
  });
  return data;
}

// 10. EVENT TYPES (master table)
export async function getEventTypes() {
  const data = await apiFetch("/event-types/", {
    method: "GET",
  });
  return data;
}

// 11. EMPLOYER MEMBERS FUNCTION ROUTES
export async function createEmployerMember({ token, employerId, memberRole }) {
  const data = await apiFetch("/employer-members/", {
    method: "POST",
    token,
    body: JSON.stringify({ employer_id: employerId, member_role: memberRole }),
  });
  return data;
}

export async function updateEmployerMember({ token, employerId, memberRole }) {
  const data = await apiFetch("/employer-members/", {
    method: "PATCH",
    token,
    body: JSON.stringify({ employer_id: employerId, member_role: memberRole }),
  });
  return data;
}

export async function deleteEmployerMember({ token, employerId }) {
  const data = await apiFetch("/employer-members/", {
    method: "DELETE",
    token,
    body: JSON.stringify({ employer_id: employerId }),
  });
  return data;
}

export async function getEmployerMembers({ token, employerId }) {
  const data = await apiFetch(
    `/employer-members/?employer_id=${encodeURIComponent(String(employerId))}`,
    {
      method: "GET",
      token,
    },
  );
  return data;
}

export async function getEmployerFromUser({ token }) {
  const data = await apiFetch(`/employer-members/me`, {
    method: "GET",
    token,
  });
  return data;
}

// 12. MEMBER TYPES (from members table)
export async function getMemberTypes() {
  const data = await apiFetch("/member-types/", {
    method: "GET",
  });
  return data;
}

// 13. APPLICATION ROLES
export async function getApplicationRoles({ token, applicationId, roleName }) {
  const params = new URLSearchParams();
  if (applicationId != null)
    params.set("application_id", String(applicationId));
  if (roleName != null) params.set("role_name", String(roleName));

  const qs = params.toString();
  const endpoint = qs ? `/applications-roles/?${qs}` : "/applications-roles/";

  const data = await apiFetch(endpoint, {
    method: "GET",
    token,
  });
  return data;
}

// 14. APPLICATION STATUS
export async function getApplicationStatus({ token }) {
  const data = await apiFetch("/application-status/", {
    method: "GET",
    token,
  });
  return data;
}
