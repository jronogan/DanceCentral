import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../state/AuthContext.jsx";
import {
  applyToGig,
  withdrawApplication,
  getGigs,
  getMyApplications,
  getUserSkills,
  getGigRoles,
  normalizeGigRolesResponse,
} from "../lib/dashboardApi.js";
import RoleDashboardSwitcher from "./RoleDashboardSwitcher.jsx";

export default function ChoreographerPage() {
  const { token, activeRole, user } = useAuth();
  const [q, setQ] = useState("");
  const [typeName, setTypeName] = useState("");
  const queryClient = useQueryClient();

  const gigsQuery = useQuery({
    queryKey: ["gigs", { type_name: typeName }],
    queryFn: () =>
      getGigs({ token, filters: { type_name: typeName || undefined } }),
    enabled: Boolean(token),
  });

  const skillsQuery = useQuery({
    queryKey: ["skills", { userId: user?.user_id }],
    queryFn: () => getUserSkills({ token, userId: user?.user_id }),
    enabled: Boolean(token && user?.user_id),
  });

  const myAppsQuery = useQuery({
    queryKey: ["applications", "mine"],
    queryFn: () => getMyApplications({ token }),
    enabled: Boolean(token),
  });

  const applyMutation = useMutation({
    mutationFn: ({ gig_id }) => applyToGig({ token, gig_id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["applications", "mine"],
      });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: ({ application_id }) =>
      withdrawApplication({ token, application_id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["applications", "mine"],
      });
    },
  });

  const gigs = gigsQuery.data;
  const gigsList = useMemo(() => {
    if (!gigs) return [];
    if (Array.isArray(gigs)) return gigs;
    if (Array.isArray(gigs.gigs)) return gigs.gigs;
    return [];
  }, [gigs]);

  const filteredGigsList = useMemo(() => {
    if (!q.trim()) return gigsList;
    const needle = q.trim().toLowerCase();
    return gigsList.filter((g) => {
      const text = JSON.stringify(g).toLowerCase();
      return text.includes(needle);
    });
  }, [gigsList, q]);

  const gigsRolesQuery = useQuery({
    queryKey: ["gigs_roles", { gigIds: gigsList.map((g) => g.gig_id) }],
    queryFn: async () => {
      const map = {};
      for (const g of gigsList) {
        if (!g?.gig_id) continue;
        map[g.gig_id] = await getGigRoles({ token, gig_id: g.gig_id });
      }
      return map;
    },
    enabled: Boolean(token && gigsList.length > 0),
  });

  const visibleGigsList = useMemo(() => {
    // Show only gigs that match the active dashboard role.
    // If a gig has no recorded roles, treat it as visible to avoid hiding legacy data.
    // If a gig DOES have recorded roles, hide it unless it includes this role.
    return filteredGigsList.filter((g) => {
      const raw = gigsRolesQuery.data?.[g.gig_id];
      const required = normalizeGigRolesResponse(raw);
      if (required.length === 0) return true;
      return required.includes("choreographer");
    });
  }, [filteredGigsList, gigsRolesQuery.data]);

  const apps = myAppsQuery.data;
  const appsList = useMemo(() => {
    if (!apps) return [];
    if (Array.isArray(apps)) return apps;
    if (Array.isArray(apps.applications)) return apps.applications;
    return [];
  }, [apps]);

  const appliedGigIds = useMemo(() => {
    const s = new Set();
    for (const a of appsList) {
      if (a?.gig_id != null && String(a?.status ?? "") !== "withdrawn") {
        s.add(Number(a.gig_id));
      }
    }
    return s;
  }, [appsList]);

  return (
    <div style={{ maxWidth: 900, margin: "24px auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0 }}>Choreographer</h2>
        <RoleDashboardSwitcher label="View as" />
      </div>
      <p>Active role: {activeRole}</p>

      <section style={{ textAlign: "left", marginTop: 16 }}>
        <h3>My skills</h3>
        {skillsQuery.isLoading ? <p>Loading...</p> : null}
        {skillsQuery.isError ? (
          <p style={{ color: "crimson" }} role="alert">
            {skillsQuery.error?.message ?? "Failed to load skills"}
          </p>
        ) : null}
        {skillsQuery.isSuccess ? (
          <ul>
            {skillsQuery.data.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section style={{ textAlign: "left", marginTop: 16 }}>
        <h3>Search gigs</h3>
        <div style={{ display: "flex", gap: 8, maxWidth: 640 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="(Optional) client-side filter…"
            style={{ flex: 1 }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, maxWidth: 640, marginTop: 8 }}>
          <input
            value={typeName}
            onChange={(e) => setTypeName(e.target.value)}
            placeholder='type_name filter (e.g. "audition")'
            style={{ flex: 1 }}
          />
        </div>

        {gigsQuery.isLoading ? (
          <p>Loading…</p>
        ) : gigsQuery.isError ? (
          <p style={{ color: "crimson" }} role="alert">
            {gigsQuery.error?.message ?? "Failed to load gigs"}
          </p>
        ) : filteredGigsList.length ? (
          <ul>
            {visibleGigsList.map((g, idx) => (
              <li key={g.gig_id ?? idx}>
                <pre style={{ whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(g, null, 2)}
                </pre>
                {(() => {
                  const raw = gigsRolesQuery.data?.[g.gig_id];
                  const required = normalizeGigRolesResponse(raw);
                  const hasRestriction = required.length > 0;
                  const allowed =
                    !hasRestriction || required.includes("choreographer");

                  return !allowed ? (
                    <p style={{ color: "#555", margin: "6px 0 0" }}>
                      This gig isnt looking for choreographers.
                    </p>
                  ) : null;
                })()}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => applyMutation.mutate({ gig_id: g.gig_id })}
                    disabled={
                      applyMutation.isPending ||
                      !token ||
                      !g?.gig_id ||
                      appliedGigIds.has(Number(g.gig_id)) ||
                      (() => {
                        const raw = gigsRolesQuery.data?.[g.gig_id];
                        const required = normalizeGigRolesResponse(raw);
                        return (
                          required.length > 0 &&
                          !required.includes("choreographer")
                        );
                      })()
                    }
                  >
                    {appliedGigIds.has(Number(g.gig_id))
                      ? "Applied"
                      : applyMutation.isPending
                        ? "Applying…"
                        : "Apply"}
                  </button>
                  {applyMutation.isError ? (
                    <span style={{ color: "crimson" }} role="alert">
                      {applyMutation.error?.message ?? "Failed to apply"}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#555" }}>No gigs found.</p>
        )}
      </section>

      <section style={{ textAlign: "left", marginTop: 24 }}>
        <h3>My applications</h3>
        {myAppsQuery.isLoading ? <p>Loading…</p> : null}
        {myAppsQuery.isError ? (
          <p style={{ color: "crimson" }} role="alert">
            {myAppsQuery.error?.message ?? "Failed to load applications"}
          </p>
        ) : null}
        {!myAppsQuery.isLoading && !myAppsQuery.isError ? (
          appsList.length ? (
            <ul>
              {appsList.map((a, idx) => (
                <li key={a.application_id ?? idx}>
                  <pre style={{ whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(a, null, 2)}
                  </pre>
                  <button
                    type="button"
                    onClick={() =>
                      withdrawMutation.mutate({
                        application_id: a.application_id,
                      })
                    }
                    disabled={
                      withdrawMutation.isPending ||
                      !a?.application_id ||
                      String(a?.status ?? "") === "withdrawn"
                    }
                  >
                    {String(a?.status ?? "") === "withdrawn"
                      ? "Withdrawn"
                      : withdrawMutation.isPending
                        ? "Withdrawing…"
                        : "Withdraw"}
                  </button>
                  {withdrawMutation.isError ? (
                    <p style={{ color: "crimson" }} role="alert">
                      {withdrawMutation.error?.message ?? "Failed to withdraw"}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#555" }}>No applications yet.</p>
          )
        ) : null}
      </section>
    </div>
  );
}
