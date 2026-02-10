import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  assignUserRole,
  assignUserSkill,
  deleteMyMedia,
  getEmployer,
  getEmployerFromUser,
  getRoles,
  getRolesForUser,
  getMyMedia,
  getSkills,
  getSkillsForUser,
  getMemberTypes,
  removeUserRole,
  removeUserSkill,
  saveMyMedia,
  signCloudinaryUpload,
  updateEmployerMember,
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
  const { token, user, isAuthenticated, loading, activeRole } = useAuth();

  if (!loading && !isAuthenticated) return <Navigate to="/login" replace />;

  const userId = user?.user_id ?? null;
  const userMemberRole = user?.member_role ?? null;
  const displayName = user?.user_name ?? user?.name ?? "";
  const displayEmail = user?.email ?? "";
  const displayDob = formatDateDDMMYYYY(user?.dob);

  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isEditingRoles, setIsEditingRoles] = useState(false);
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [isEditingMemberRole, setIsEditingMemberRole] = useState(false);

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

  const myRolesQuery = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => getRolesForUser({ token }),
    enabled: Boolean(token),
  });

  const myRoleNames =
    myRolesQuery.data
      ?.map((r) => (r?.role_name ?? r?.name ?? r ?? "").toString())
      .filter(Boolean) ?? [];

  const activeRoleName = (activeRole ?? "").toString().toLowerCase();
  const isEmployerView = activeRoleName === "employer";

  const rolesMaster = Array.isArray(allRolesQuery.data)
    ? allRolesQuery.data
        .map((r) => (r?.role_name ?? r?.name ?? r ?? "").toString())
        .filter(Boolean)
    : [];

  const allSkillsQuery = useQuery({
    queryKey: ["skills-master"],
    queryFn: () => getSkills(),
    enabled: !isEmployerView,
  });

  const mySkillsQuery = useQuery({
    queryKey: ["my-skills", userId],
    queryFn: () => getSkillsForUser({ token, userId }),
    enabled: Boolean(token && userId && !isEmployerView),
  });

  const mySkillNames =
    mySkillsQuery.data
      ?.map((s) => (s?.skill_name ?? s?.name ?? s ?? "").toString())
      .filter(Boolean) ?? [];

  const skillsMaster = Array.isArray(allSkillsQuery.data)
    ? allSkillsQuery.data
        .map((s) => (s?.skill_name ?? s?.name ?? s ?? "").toString())
        .filter(Boolean)
    : [];

  const availableRoleOptions = rolesMaster.filter(
    (r) => r && !myRoleNames.includes(r),
  );
  const availableSkillOptions = skillsMaster.filter(
    (s) => s && !mySkillNames.includes(s),
  );

  const employerMemberQuery = useQuery({
    queryKey: ["employer-member-me"],
    queryFn: () => getEmployerFromUser({ token }),
    enabled: Boolean(token && isEmployerView),
  });

  const employerDetailsQuery = useQuery({
    queryKey: ["employer-details", employerMemberQuery.data?.employer_id],
    queryFn: () =>
      getEmployer({
        employerId: employerMemberQuery.data?.employer_id,
        token,
      }),
    enabled: Boolean(
      token && isEmployerView && employerMemberQuery.data?.employer_id,
    ),
  });

  useEffect(() => {
    if (!isEmployerView) return;
    const mr = employerMemberQuery.data?.member_role ?? "";
    setMemberRole(mr);
    setIsEditingMemberRole(false);
  }, [isEmployerView, employerMemberQuery.data?.member_role]);

  const memberTypesQuery = useQuery({
    queryKey: ["member-types"],
    queryFn: () => getMemberTypes(),
    enabled: Boolean(isEmployerView),
  });

  const memberTypeOptions = Array.isArray(memberTypesQuery.data)
    ? memberTypesQuery.data
        .map((m) =>
          (m?.member_type ?? m?.type_name ?? m?.name ?? m ?? "").toString(),
        )
        .filter(Boolean)
    : [];

  const updateEmployerMemberMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Not authenticated");
      const employerId = employerMemberQuery.data?.employer_id;
      if (!employerId) throw new Error("Missing employer_id");
      return updateEmployerMember({ token, employerId, memberRole });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employer-member-me"] });
      await queryClient.invalidateQueries({
        queryKey: ["employer-details", employerMemberQuery.data?.employer_id],
      });
    },
  });

  const handleUpdateEmployerMember = () => {
    updateEmployerMemberMutation.mutate(memberRole);
    setIsEditingMemberRole(false);
  };

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

  // --- Media uploads (Cloudinary direct upload + DB metadata)
  const myMediaQuery = useQuery({
    queryKey: ["my-media"],
    queryFn: () => getMyMedia({ token }),
    enabled: Boolean(token),
  });

  const [uploadStatus, setUploadStatus] = useState({
    profile_photo: null,
    resume: null,
    showreel: null,
  });

  const saveMediaMutation = useMutation({
    mutationFn: async (media) => {
      if (!token) throw new Error("Not authenticated");
      return saveMyMedia({ token, media });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-media"] });
    },
  });

  const deleteMediaMutation = useMutation({
    mutationFn: async (kind) => {
      if (!token) throw new Error("Not authenticated");
      return deleteMyMedia({ token, kind });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-media"] });
    },
  });

  async function uploadToCloudinary({ kind, file }) {
    if (!token) throw new Error("Not authenticated");
    if (!file) throw new Error("No file selected");

    setUploadStatus((prev) => ({ ...prev, [kind]: "Signing…" }));
    const sig = await signCloudinaryUpload({ token, kind });

    const url = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`;
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sig.apiKey);
    form.append("timestamp", String(sig.timestamp));
    form.append("signature", sig.signature);
    form.append("folder", sig.folder);
    if (Array.isArray(sig.allowedFormats) && sig.allowedFormats.length) {
      form.append("allowed_formats", sig.allowedFormats.join(","));
    }

    setUploadStatus((prev) => ({ ...prev, [kind]: "Uploading…" }));
    const res = await fetch(url, { method: "POST", body: form });
    const payload = await res.json();
    if (!res.ok) {
      throw new Error(
        payload?.error?.message || payload?.error || "Upload failed",
      );
    }

    setUploadStatus((prev) => ({ ...prev, [kind]: "Saving…" }));
    await saveMediaMutation.mutateAsync({
      kind,
      resource_type: sig.resourceType,
      public_id: payload.public_id,
      secure_url: payload.secure_url,
      format: payload.format,
      bytes: payload.bytes,
    });

    setUploadStatus((prev) => ({ ...prev, [kind]: "Done" }));
  }

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

      {isEmployerView ? (
        <section
          style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h3 style={{ margin: 0 }}>Employer</h3>
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
              <div style={{ fontWeight: 600, opacity: 0.85 }}>Employer ID</div>
              <div>{employerMemberQuery.data?.employer_id ?? "—"}</div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "160px 1fr",
                gap: 8,
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 600, opacity: 0.85 }}>
                Employer name
              </div>
              <div>{employerDetailsQuery.data?.employer_name ?? "—"}</div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "160px 1fr",
                gap: 8,
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 600, opacity: 0.85 }}>
                My member role
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {isEditingMemberRole ? (
                  <>
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value)}
                      disabled={
                        memberTypesQuery.isLoading ||
                        memberTypesQuery.isError ||
                        memberTypeOptions.length === 0
                      }
                      style={{
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid #d1d5db",
                        minWidth: 280,
                      }}
                    >
                      <option value="">Select member role</option>
                      {memberTypeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setMemberRole(
                          employerMemberQuery.data?.member_role ?? "",
                        );
                        setIsEditingMemberRole(false);
                      }}
                      disabled={updateEmployerMemberMutation.isPending}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateEmployerMember()}
                      disabled={
                        updateEmployerMemberMutation.isPending ||
                        !memberRole ||
                        memberTypesQuery.isLoading ||
                        memberTypesQuery.isError
                      }
                    >
                      {updateEmployerMemberMutation.isPending
                        ? "Saving…"
                        : "Save"}
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ minWidth: 280 }}>{memberRole || "—"}</div>
                    <button
                      type="button"
                      onClick={() => setIsEditingMemberRole(true)}
                      disabled={memberTypesQuery.isLoading}
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            </div>

            {employerMemberQuery.isError || employerDetailsQuery.isError ? (
              <div style={{ color: "crimson" }}>
                {String(
                  employerMemberQuery.error?.message ||
                    employerDetailsQuery.error?.message ||
                    "Failed to load employer details",
                )}
              </div>
            ) : null}

            {updateEmployerMemberMutation.isError ? (
              <div style={{ color: "crimson" }}>
                {String(
                  updateEmployerMemberMutation.error?.message ||
                    "Failed to update employer member",
                )}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section
        style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Uploads</h3>
          <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>
            One active file per type.
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
          {/* Profile photo */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr",
              gap: 10,
              alignItems: "start",
            }}
          >
            <div style={{ fontWeight: 600, opacity: 0.85 }}>Profile photo</div>
            <div style={{ display: "grid", gap: 8 }}>
              {myMediaQuery.data?.profile_photo?.secure_url ? (
                <img
                  alt="Profile"
                  src={myMediaQuery.data.profile_photo.secure_url}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 12,
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div style={{ opacity: 0.8 }}>No profile photo uploaded.</div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) =>
                    uploadToCloudinary({
                      kind: "profile_photo",
                      file: e.target.files?.[0],
                    }).catch((err) =>
                      setUploadStatus((prev) => ({
                        ...prev,
                        profile_photo: String(err?.message || "Upload failed"),
                      })),
                    )
                  }
                  disabled={!token || saveMediaMutation.isPending}
                />
                <button
                  type="button"
                  onClick={() => deleteMediaMutation.mutate("profile_photo")}
                  disabled={
                    !myMediaQuery.data?.profile_photo ||
                    deleteMediaMutation.isPending
                  }
                >
                  Remove
                </button>
                {uploadStatus.profile_photo ? (
                  <span style={{ fontSize: 12, opacity: 0.85 }}>
                    {uploadStatus.profile_photo}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {!isEmployerView ? (
            <>
              {/* Resume */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr",
                  gap: 10,
                  alignItems: "start",
                }}
              >
                <div style={{ fontWeight: 600, opacity: 0.85 }}>
                  Resume (PDF)
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {myMediaQuery.data?.resume?.secure_url ? (
                    <a
                      href={myMediaQuery.data.resume.secure_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View current resume
                    </a>
                  ) : (
                    <div style={{ opacity: 0.8 }}>No resume uploaded.</div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) =>
                        uploadToCloudinary({
                          kind: "resume",
                          file: e.target.files?.[0],
                        }).catch((err) =>
                          setUploadStatus((prev) => ({
                            ...prev,
                            resume: String(err?.message || "Upload failed"),
                          })),
                        )
                      }
                      disabled={!token || saveMediaMutation.isPending}
                    />
                    <button
                      type="button"
                      onClick={() => deleteMediaMutation.mutate("resume")}
                      disabled={
                        !myMediaQuery.data?.resume ||
                        deleteMediaMutation.isPending
                      }
                    >
                      Remove
                    </button>
                    {uploadStatus.resume ? (
                      <span style={{ fontSize: 12, opacity: 0.85 }}>
                        {uploadStatus.resume}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Showreel */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr",
                  gap: 10,
                  alignItems: "start",
                }}
              >
                <div style={{ fontWeight: 600, opacity: 0.85 }}>
                  Showreel (MP4)
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {myMediaQuery.data?.showreel?.secure_url ? (
                    <video
                      src={myMediaQuery.data.showreel.secure_url}
                      controls
                      style={{
                        width: "100%",
                        maxWidth: 520,
                        borderRadius: 10,
                      }}
                    />
                  ) : (
                    <div style={{ opacity: 0.8 }}>No showreel uploaded.</div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="file"
                      accept="video/mp4"
                      onChange={(e) =>
                        uploadToCloudinary({
                          kind: "showreel",
                          file: e.target.files?.[0],
                        }).catch((err) =>
                          setUploadStatus((prev) => ({
                            ...prev,
                            showreel: String(err?.message || "Upload failed"),
                          })),
                        )
                      }
                      disabled={!token || saveMediaMutation.isPending}
                    />
                    <button
                      type="button"
                      onClick={() => deleteMediaMutation.mutate("showreel")}
                      disabled={
                        !myMediaQuery.data?.showreel ||
                        deleteMediaMutation.isPending
                      }
                    >
                      Remove
                    </button>
                    {uploadStatus.showreel ? (
                      <span style={{ fontSize: 12, opacity: 0.85 }}>
                        {uploadStatus.showreel}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {myMediaQuery.isError ? (
            <div style={{ color: "crimson" }}>
              {String(myMediaQuery.error?.message || "Failed to load uploads")}
            </div>
          ) : null}

          {saveMediaMutation.isError || deleteMediaMutation.isError ? (
            <div style={{ color: "crimson" }}>
              {String(
                saveMediaMutation.error?.message ||
                  deleteMediaMutation.error?.message ||
                  "Upload update failed",
              )}
            </div>
          ) : null}
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

      {!isEmployerView ? (
        <section
          style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h3 style={{ margin: 0 }}>Skills</h3>
            <div style={{ marginLeft: "auto" }}>
              <button
                type="button"
                onClick={() => setIsEditingSkills((v) => !v)}
              >
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
      ) : null}
    </div>
  );
}
