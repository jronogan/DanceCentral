import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  assignUserRole,
  assignUserSkill,
  getRoles,
  getRolesForUser,
  getSkills,
  getSkillsForUser,
  removeUserRole,
  removeUserSkill,
  updateUser,
} from "../library/dashboardApi.js";

function pad2(value) {
  return String(value).padStart(2, "0");
}

// Display-only DOB formatting. Keep <input type="date" /> in YYYY-MM-DD.
function formatDateDDMMYYYY(dateString) {
  if (!dateString) return "";

  // Fast path for YYYY-MM-DD
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})/.exec(String(dateString));
  if (m) {
    const [, yyyy, mm, dd] = m;
    return `${dd}-${mm}-${yyyy}`;
  }

  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return String(dateString);
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function toISODateInputValue(value) {
  if (!value) return "";

  const s = String(value);
  // Already correct
  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s)) return s;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  // Use UTC to avoid timezone shifting the day.
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

const chipStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 999,
  padding: "4px 10px",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

export default function UserProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, user, isAuthenticated, loading } = useAuth();

  if (!loading && !isAuthenticated) return <Navigate to="/login" replace />;

  const userId = user?.user_id ?? null;
  const displayName = user?.user_name ?? user?.name ?? "";
  const displayEmail = user?.email ?? "";
  const displayDob = formatDateDDMMYYYY(user?.dob);

  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isEditingRoles, setIsEditingRoles] = useState(false);
  const [isEditingSkills, setIsEditingSkills] = useState(false);

  const [name, setName] = useState(displayName);
  const [email, setEmail] = useState(displayEmail);
  const [dateOfBirth, setDateOfBirth] = useState(() =>
    toISODateInputValue(user?.dob),
  );

  useEffect(() => {
    setName(displayName);
    setEmail(displayEmail);
    setDateOfBirth(toISODateInputValue(user?.dob));
    setIsEditingAccount(false);
  }, [user?.user_id]);

  const allRolesQuery = useQuery({
    queryKey: ["roles-master"],
    queryFn: () => getRoles(),
    enabled: true,
  });

  const allSkillsQuery = useQuery({
    queryKey: ["skills-master"],
    queryFn: () => getSkills(),
    enabled: true,
  });

  const myRolesQuery = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => getRolesForUser({ token }),
    enabled: Boolean(token),
  });

  const mySkillsQuery = useQuery({
    queryKey: ["my-skills", userId],
    queryFn: () => getSkillsForUser({ token, userId }),
    enabled: Boolean(token && userId),
  });

  const myRoleNames =
    myRolesQuery.data
      ?.map((r) => (r?.role_name ?? r?.name ?? r ?? "").toString())
      .filter(Boolean) ?? [];

  const mySkillNames =
    mySkillsQuery.data
      ?.map((s) => (s?.skill_name ?? s?.name ?? s ?? "").toString())
      .filter(Boolean) ?? [];

  const rolesMaster = Array.isArray(allRolesQuery.data)
    ? allRolesQuery.data
        .map((r) => (r?.role_name ?? r?.name ?? r ?? "").toString())
        .filter(Boolean)
    : [];

  const skillsMaster = Array.isArray(allSkillsQuery.data)
    ? allSkillsQuery.data
        .map((s) => (s?.skill_name ?? s?.name ?? s ?? "").toString())
        .filter(Boolean)
    : [];

  const [newRole, setNewRole] = useState("");
  const [newSkill, setNewSkill] = useState("");

  const availableRoleOptions = rolesMaster.filter(
    (r) => r && !myRoleNames.includes(r),
  );
  const availableSkillOptions = skillsMaster.filter(
    (s) => s && !mySkillNames.includes(s),
  );

  const updateUserMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Not authenticated");
      return updateUser({
        token,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        date_of_birth: dateOfBirth || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      setIsEditingAccount(false);
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async (roleName) => {
      if (!token || !userId) throw new Error("Not authenticated");
      return assignUserRole({ token, userId, roleName });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-roles"] });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleName) => {
      if (!token || !userId) throw new Error("Not authenticated");
      return removeUserRole({ token, userId, roleName });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-roles"] });
    },
  });

  const addSkillMutation = useMutation({
    mutationFn: async (skillName) => {
      if (!token || !userId) throw new Error("Not authenticated");
      return assignUserSkill({ token, userId, skillName });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-skills", userId] });
    },
  });

  const removeSkillMutation = useMutation({
    mutationFn: async (skillName) => {
      if (!token || !userId) throw new Error("Not authenticated");
      return removeUserSkill({ token, userId, skillName });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-skills", userId] });
    },
  });

  return (
    <div style={{ padding: 16, display: "grid", gap: 16, maxWidth: 860 }}>
      <h2 style={{ margin: 0 }}>My profile</h2>

      <section
        style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Account info</h3>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {isEditingAccount ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setName(displayName);
                    setEmail(displayEmail);
                    setDateOfBirth(toISODateInputValue(user?.dob));
                    setIsEditingAccount(false);
                  }}
                  disabled={updateUserMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => updateUserMutation.mutate()}
                  disabled={updateUserMutation.isPending || !token}
                >
                  {updateUserMutation.isPending ? "Saving…" : "Save"}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setIsEditingAccount(true)}>
                Edit
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr",
              gap: 8,
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 600, opacity: 0.85 }}>Name</div>
            {isEditingAccount ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                }}
              />
            ) : (
              <div>{displayName || "—"}</div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr",
              gap: 8,
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 600, opacity: 0.85 }}>Email</div>
            {isEditingAccount ? (
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                }}
              />
            ) : (
              <div>{displayEmail || "—"}</div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr",
              gap: 8,
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 600, opacity: 0.85 }}>Date of birth</div>
            {isEditingAccount ? (
              <input
                type="date"
                value={dateOfBirth || ""}
                onChange={(e) => setDateOfBirth(e.target.value)}
                style={{
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  maxWidth: 220,
                }}
              />
            ) : (
              <div>{displayDob || "—"}</div>
            )}
          </div>

          {updateUserMutation.isError ? (
            <div style={{ color: "crimson" }}>
              {String(updateUserMutation.error?.message || "Update failed")}
            </div>
          ) : null}

          <div style={{ fontSize: 12, opacity: 0.85 }}>
            <div>User ID: {userId ?? "—"}</div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <button type="button" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </section>

      <section
        style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Roles</h3>
          <div style={{ marginLeft: "auto" }}>
            <button type="button" onClick={() => setIsEditingRoles((v) => !v)}>
              {isEditingRoles ? "Done" : "Edit"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {myRoleNames.length === 0 ? (
              <div style={{ opacity: 0.8 }}>No roles.</div>
            ) : (
              myRoleNames.map((r) => (
                <div key={r} style={chipStyle}>
                  <span style={{ fontWeight: 600 }}>{r}</span>
                  {isEditingRoles ? (
                    <button
                      type="button"
                      onClick={() => removeRoleMutation.mutate(r)}
                      disabled={removeRoleMutation.isPending}
                      style={{ padding: "2px 8px" }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>

          {isEditingRoles ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                disabled={availableRoleOptions.length === 0}
              >
                <option value="">Add a role…</option>
                {availableRoleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (!newRole) return;
                  addRoleMutation.mutate(newRole);
                  setNewRole("");
                }}
                disabled={!newRole || addRoleMutation.isPending}
              >
                Add role
              </button>
            </div>
          ) : null}

          {addRoleMutation.isError || removeRoleMutation.isError ? (
            <div style={{ color: "crimson" }}>
              {String(
                addRoleMutation.error?.message ||
                  removeRoleMutation.error?.message ||
                  "Role update failed",
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section
        style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Skills</h3>
          <div style={{ marginLeft: "auto" }}>
            <button type="button" onClick={() => setIsEditingSkills((v) => !v)}>
              {isEditingSkills ? "Done" : "Edit"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {mySkillNames.length === 0 ? (
              <div style={{ opacity: 0.8 }}>No skills.</div>
            ) : (
              mySkillNames.map((s) => (
                <div key={s} style={chipStyle}>
                  <span style={{ fontWeight: 600 }}>{s}</span>
                  {isEditingSkills ? (
                    <button
                      type="button"
                      onClick={() => removeSkillMutation.mutate(s)}
                      disabled={removeSkillMutation.isPending}
                      style={{ padding: "2px 8px" }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>

          {isEditingSkills ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <select
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                disabled={availableSkillOptions.length === 0}
              >
                <option value="">Add a skill…</option>
                {availableSkillOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (!newSkill) return;
                  addSkillMutation.mutate(newSkill);
                  setNewSkill("");
                }}
                disabled={!newSkill || addSkillMutation.isPending}
              >
                Add skill
              </button>
            </div>
          ) : null}

          {addSkillMutation.isError || removeSkillMutation.isError ? (
            <div style={{ color: "crimson" }}>
              {String(
                addSkillMutation.error?.message ||
                  removeSkillMutation.error?.message ||
                  "Skill update failed",
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
