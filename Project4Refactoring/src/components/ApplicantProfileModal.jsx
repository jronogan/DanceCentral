import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserPublicProfile } from "../library/dashboardApi";

export default function ApplicantProfileModal({
  token,
  userId,
  applicantName,
  onClose,
}) {
  const profileQuery = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: () => getUserPublicProfile({ token, userId }),
    enabled: Boolean(token && userId),
  });

  const p = profileQuery.data || null;

  const dobText = useMemo(() => {
    const raw = p?.dob;
    if (!raw) return "—";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }, [p?.dob]);

  const media = p?.media || {};

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: "min(820px, 100%)",
          background: "white",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          padding: 14,
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>
            Applicant profile{applicantName ? ` — ${applicantName}` : ""}
          </h3>
          <div style={{ marginLeft: "auto" }}>
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {profileQuery.isLoading ? (
          <div>Loading profile…</div>
        ) : profileQuery.isError ? (
          <div style={{ color: "crimson" }}>
            {String(profileQuery.error?.message || "Failed to load profile")}
          </div>
        ) : !p ? (
          <div style={{ opacity: 0.8 }}>No profile data.</div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                gap: 12,
                alignItems: "start",
              }}
            >
              <div>
                {media?.profile_photo?.secure_url ? (
                  <img
                    alt="Profile"
                    src={media.profile_photo.secure_url}
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 12,
                      objectFit: "cover",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 12,
                      border: "1px dashed #d1d5db",
                      display: "grid",
                      placeItems: "center",
                      opacity: 0.7,
                    }}
                  >
                    No photo
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontWeight: 700 }}>{p?.name || "—"}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {p?.email || ""}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div>
                    <span style={{ fontWeight: 600, opacity: 0.85 }}>
                      Date of birth:
                    </span>{" "}
                    {dobText}
                  </div>

                  {Array.isArray(p?.roles) ? (
                    <div>
                      <span style={{ fontWeight: 600, opacity: 0.85 }}>
                        Roles:
                      </span>{" "}
                      {p.roles
                        .map((r) => r?.role_name || r)
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </div>
                  ) : null}

                  {Array.isArray(p?.skills) ? (
                    <div>
                      <span style={{ fontWeight: 600, opacity: 0.85 }}>
                        Skills:
                      </span>{" "}
                      {p.skills
                        .map((s) => s?.skill_name || s)
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <hr style={{ border: 0, borderTop: "1px solid #e5e7eb" }} />

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 700 }}>Resume</div>
              {media?.resume?.secure_url ? (
                <a
                  href={media.resume.secure_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open resume (PDF)
                </a>
              ) : (
                <div style={{ opacity: 0.8 }}>No resume uploaded.</div>
              )}

              <div style={{ fontWeight: 700, marginTop: 8 }}>Showreel</div>
              {media?.showreel?.secure_url ? (
                <video
                  controls
                  src={media.showreel.secure_url}
                  style={{ width: "100%", maxHeight: 360 }}
                />
              ) : (
                <div style={{ opacity: 0.8 }}>No showreel uploaded.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
