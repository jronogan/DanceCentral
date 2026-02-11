import React, { useState } from "react";
import RoleDashboardSwitcher from "./RoleDashboardSwitcher";
import { useAuth } from "../auth/useAuth.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createApplication,
  deleteApplication,
  getGigs,
  getGigRoles,
  getSkillsForUser,
  getUserApplications,
  getMyMedia,
  formatString,
} from "../library/dashboardApi";
import DcTopBar from "./DcTopBar.jsx";

const ChoreographerDashboard = () => {
  const { token, user } = useAuth();
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const skillsQuery = useQuery({
    queryKey: ["skills", user?.user_id],
    queryFn: () => getSkillsForUser({ token }),
    enabled: Boolean(token && user?.user_id),
  });

  const myAppsQuery = useQuery({
    queryKey: ["my-apps"],
    queryFn: () => getUserApplications({ token }),
    enabled: Boolean(token),
  });

  const myMediaQuery = useQuery({
    queryKey: ["my-media"],
    queryFn: () => getMyMedia({ token }),
    enabled: Boolean(token),
  });

  const availableGigsQuery = useQuery({
    queryKey: ["available-gigs"],
    queryFn: () => getGigs({ token }),
    enabled: Boolean(token),
  });

  const availableGigsList = availableGigsQuery?.data ?? [];

  const gigsRolesQuery = useQuery({
    queryKey: [
      "gigs_roles",
      { gigIds: availableGigsList.map((g) => g.gig_id) },
    ],
    queryFn: async () => {
      const map = {};
      for (const g of availableGigsList) {
        if (!g?.gig_id) continue;
        // Note: getGigRoles signature is (gigId, token)
        const roles = await getGigRoles({ token, gigId: g.gig_id });
        map[g.gig_id] = roles.map((r) => r.role_name);
      }
      return map;
    },
    enabled: Boolean(token && availableGigsList.length > 0),
  });

  const gigsRolesData = gigsRolesQuery.data ?? {};

  const filteredGigsList = gigsRolesQuery.isSuccess
    ? availableGigsList.filter((g) =>
        gigsRolesData[g.gig_id]?.includes("choreographer"),
      )
    : availableGigsList;

  const lowerSearch = search.trim() ? search.trim().toLowerCase() : "";
  const searchedGigsList = lowerSearch
    ? filteredGigsList.filter((g) =>
        Boolean(
          g.gig_name?.toLowerCase().includes(lowerSearch) ||
          g.gig_details?.toLowerCase().includes(lowerSearch) ||
          g.type_name?.toLowerCase().includes(lowerSearch),
        ),
      )
    : filteredGigsList;

  const applyToGigMutation = useMutation({
    mutationFn: (gigId) => createApplication({ token, gigId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-apps"] });
    },
  });

  const withdrawFromGigMutation = useMutation({
    mutationFn: (gigId) => deleteApplication({ token, gigId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-apps"] });
    },
  });

  const skills = skillsQuery.data ?? [];
  const myApplications = myAppsQuery.data ?? [];

  const appliedGigIds = new Set(
    myApplications.map((a) => a?.gig_id).filter(Boolean),
  );

  const appliedGigs = myApplications
    .map((a) => {
      const gig = availableGigsList.find((g) => g?.gig_id === a?.gig_id);
      return { ...a, gig };
    })
    .filter((a) => a?.gig);

  const visibleAvailableGigs = searchedGigsList.filter(
    (g) => !appliedGigIds.has(g?.gig_id),
  );

  return (
    <div className="dc-page">
      <div className="dc-container">
        <DcTopBar subtitle="Choreographer" />

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Choreographer Dashboard</h2>
        </div>

        <div className="dc-two-col">
          <section className="dc-card">
            <h3 style={{ marginTop: 0 }}>My Skills</h3>
            {skillsQuery.isLoading ? (
              <div>Loading skills…</div>
            ) : skillsQuery.isError ? (
              <div>Couldn’t load skills.</div>
            ) : skills.length === 0 ? (
              <div>No skills found.</div>
            ) : (
              <div className="dc-skills">
                {skills.map((s) => {
                  const key = s?.skill_id ?? s?.skill_name ?? JSON.stringify(s);
                  const label = formatString(s?.skill_name ?? s?.name ?? s);
                  return (
                    <span key={key} className="dc-skill">
                      {label}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="dc-divider" style={{ margin: "14px 0" }} />

            <h4 style={{ margin: "0 0 10px 0" }}>My Media</h4>
            {myMediaQuery.isLoading ? (
              <div style={{ opacity: 0.85, fontSize: 13 }}>Loading media…</div>
            ) : myMediaQuery.isError ? (
              <div style={{ color: "var(--dc-danger)", fontSize: 13 }}>
                Couldn’t load media.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Resume</div>
                  {myMediaQuery.data?.resume?.secure_url ? (
                    <a
                      href={myMediaQuery.data.resume.secure_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--dc-text)" }}
                    >
                      View resume
                    </a>
                  ) : (
                    <div style={{ opacity: 0.8, fontSize: 13 }}>
                      No resume uploaded.
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>
                    Showreel
                  </div>
                  {myMediaQuery.data?.showreel?.secure_url ? (
                    <video
                      controls
                      src={myMediaQuery.data.showreel.secure_url}
                      style={{ width: "100%", borderRadius: 12 }}
                    />
                  ) : (
                    <div style={{ opacity: 0.8, fontSize: 13 }}>
                      No showreel uploaded.
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="dc-card">
            <h3 style={{ marginTop: 0 }}>My applied gigs</h3>

            {myAppsQuery.isLoading ? (
              <div>Loading applications…</div>
            ) : myAppsQuery.isError ? (
              <div>Couldn’t load your applications.</div>
            ) : appliedGigs.length === 0 ? (
              <div>You haven’t applied to any gigs yet.</div>
            ) : (
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 0,
                  listStyle: "none",
                  display: "grid",
                  gap: 10,
                }}
              >
                {appliedGigs.map((a) => (
                  <li
                    key={a.application_id ?? `${a.user_id}-${a.gig_id}`}
                    style={{
                      border: "1px solid var(--dc-border)",
                      borderRadius: 12,
                      padding: 12,
                      display: "grid",
                      gap: 6,
                      background: "rgba(0, 0, 0, 0.12)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <strong>{a.gig?.gig_name ?? `Gig #${a.gig_id}`}</strong>
                      <span style={{ fontSize: 12, opacity: 0.8 }}>
                        {a.gig?.gig_date
                          ? new Date(a.gig.gig_date).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      Status: {a.status ?? "applied"}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>
                      {a.gig?.gig_details ?? ""}
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => withdrawFromGigMutation.mutate(a.gig_id)}
                        disabled={withdrawFromGigMutation.isPending}
                        style={{ padding: "8px 10px" }}
                      >
                        {withdrawFromGigMutation.isPending
                          ? "Withdrawing…"
                          : "Withdraw"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="dc-card">
          <h3 style={{ marginTop: 0 }}>Find choreographer gigs</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, type, or details…"
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 6,
                border: "1px solid var(--dc-border)",
              }}
            />
            <button
              type="button"
              onClick={() => setSearch("")}
              disabled={!search.trim()}
              style={{ padding: "8px 10px" }}
            >
              Clear
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            Showing {visibleAvailableGigs.length} gig(s) you haven’t applied to.
          </div>

          {availableGigsQuery.isLoading || gigsRolesQuery.isLoading ? (
            <div style={{ marginTop: 10 }}>Loading gigs…</div>
          ) : availableGigsQuery.isError || gigsRolesQuery.isError ? (
            <div style={{ marginTop: 10 }}>Couldn’t load gigs.</div>
          ) : visibleAvailableGigs.length === 0 ? (
            <div style={{ marginTop: 10 }}>
              No choreographer gigs match your search.
            </div>
          ) : (
            <ul
              style={{
                marginTop: 10,
                paddingLeft: 0,
                listStyle: "none",
                display: "grid",
                gap: 10,
              }}
            >
              {visibleAvailableGigs.map((g) => (
                <li
                  key={g.gig_id}
                  style={{
                    border: "1px solid var(--dc-border)",
                    borderRadius: 12,
                    padding: 12,
                    display: "grid",
                    gap: 6,
                    background: "rgba(0, 0, 0, 0.12)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <strong>{g.gig_name ?? `Gig #${g.gig_id}`}</strong>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      {g.gig_date
                        ? new Date(g.gig_date).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    {g.type_name ? formatString(g.type_name) : ""}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>
                    {g.gig_details ?? ""}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => applyToGigMutation.mutate(g.gig_id)}
                      disabled={applyToGigMutation.isPending}
                      style={{ padding: "8px 10px" }}
                    >
                      {applyToGigMutation.isPending ? "Applying…" : "Apply"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default ChoreographerDashboard;
