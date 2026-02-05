import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../state/AuthContext.jsx";
import {
  createGig,
  getEventTypes,
  getApplicationsForGig,
  getGigs,
} from "../lib/dashboardApi.js";
import RoleDashboardSwitcher from "./RoleDashboardSwitcher.jsx";

export default function EmployerPage() {
  const { token, activeRole, user } = useAuth();
  const userId = user?.user_id;
  const employerIdFromUser = user?.employer_id;

  const [gigName, setGigName] = useState("");
  const [gigDate, setGigDate] = useState("");
  const [gigDetails, setGigDetails] = useState("");
  const [typeName, setTypeName] = useState("");

  const eventTypesQuery = useQuery({
    queryKey: ["eventTypes"],
    queryFn: () => getEventTypes({ token }),
    enabled: Boolean(token),
  });

  const resolvedEmployerId =
    employerIdFromUser != null && employerIdFromUser !== ""
      ? Number(employerIdFromUser)
      : null;

  const createGigMutation = useMutation({
    mutationFn: async () => {
      return createGig({
        token,
        gig: {
          gig_name: gigName,
          gig_date: gigDate,
          gig_details: gigDetails,
          type_name: typeName,
          employer_id: resolvedEmployerId,
        },
      });
    },
  });

  const myPostedGigsQuery = useQuery({
    queryKey: ["employer", "gigs", { posted_by_user_id: userId }],
    queryFn: () => getGigs({ token, filters: { posted_by_user_id: userId } }),
    enabled: Boolean(token && userId),
  });

  const createError = createGigMutation.error?.message;
  const gigs = myPostedGigsQuery.data;
  const gigsList = useMemo(() => {
    if (!gigs) return [];
    if (Array.isArray(gigs)) return gigs;
    if (Array.isArray(gigs.gigs)) return gigs.gigs;
    return [];
  }, [gigs]);

  const applicationsByGigQuery = useQuery({
    queryKey: [
      "employer",
      "applicationsByGig",
      { gigIds: gigsList.map((g) => g.gig_id) },
    ],
    queryFn: async () => {
      const results = {};
      for (const g of gigsList) {
        if (!g?.gig_id) continue;
        // Backend authorizes by checking posted_by_user_id matches current JWT identity.
        results[g.gig_id] = await getApplicationsForGig({
          token,
          gig_id: g.gig_id,
        });
      }
      return results;
    },
    enabled: Boolean(token && userId && gigsList.length > 0),
  });

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
        <h2 style={{ margin: 0 }}>Employer</h2>
        <RoleDashboardSwitcher label="View as" />
      </div>
      <p>Active role: {activeRole}</p>

      <section style={{ textAlign: "left", marginTop: 16 }}>
        <h3>Upload a gig</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createGigMutation.mutate();
          }}
          style={{ display: "grid", gap: 10, maxWidth: 640 }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span>Gig name</span>
            <input
              value={gigName}
              onChange={(e) => setGigName(e.target.value)}
              required
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Gig date</span>
            <input
              type="date"
              value={gigDate}
              onChange={(e) => setGigDate(e.target.value)}
              required
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Gig details</span>
            <textarea
              value={gigDetails}
              onChange={(e) => setGigDetails(e.target.value)}
              rows={4}
              required
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Type name</span>
            <select
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              required
              disabled={eventTypesQuery.isLoading || eventTypesQuery.isError}
            >
              <option value="" disabled>
                {eventTypesQuery.isLoading
                  ? "Loading event types…"
                  : eventTypesQuery.isError
                    ? "Failed to load event types"
                    : "Select an event type"}
              </option>
              {eventTypesQuery.isSuccess
                ? eventTypesQuery.data.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))
                : null}
            </select>
          </label>

          {eventTypesQuery.isError ? (
            <div style={{ color: "crimson" }} role="alert">
              {eventTypesQuery.error?.message ?? "Failed to load event types"}
            </div>
          ) : null}

          {!resolvedEmployerId ? (
            <div style={{ color: "crimson" }} role="alert">
              Missing employer_id for this account. Create an employer during
              registration (or ensure your login payload includes employer_id).
            </div>
          ) : (
            <div style={{ color: "#555" }}>
              Employer ID: {resolvedEmployerId}
            </div>
          )}
          {createError ? (
            <div style={{ color: "crimson" }} role="alert">
              {createError}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={
              createGigMutation.isPending ||
              !token ||
              !gigName ||
              !gigDate ||
              !gigDetails ||
              !typeName ||
              !resolvedEmployerId
            }
          >
            {createGigMutation.isPending ? "Creating…" : "Create gig"}
          </button>
          {!token ? (
            <p style={{ color: "#555" }}>
              You must be logged in to create gigs.
            </p>
          ) : null}
        </form>
      </section>

      <section style={{ textAlign: "left", marginTop: 24 }}>
        <h3>My posted gigs</h3>
        {myPostedGigsQuery.isLoading ? <p>Loading gigs…</p> : null}
        {myPostedGigsQuery.isError ? (
          <p style={{ color: "crimson" }} role="alert">
            {myPostedGigsQuery.error?.message ?? "Failed to load gigs"}
          </p>
        ) : null}
        {!myPostedGigsQuery.isLoading && !myPostedGigsQuery.isError ? (
          gigsList.length ? (
            <ul>
              {gigsList.map((g, idx) => (
                <li key={g.gig_id ?? idx}>
                  <pre style={{ whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(g, null, 2)}
                  </pre>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#555" }}>No gigs found yet.</p>
          )
        ) : null}

        <h3 style={{ marginTop: 24 }}>Applications to my gigs</h3>
        {applicationsByGigQuery.isLoading ? <p>Loading applications…</p> : null}
        {applicationsByGigQuery.isError ? (
          <p style={{ color: "crimson" }} role="alert">
            {applicationsByGigQuery.error?.message ??
              "Failed to load applications"}
          </p>
        ) : null}

        {!applicationsByGigQuery.isLoading &&
        !applicationsByGigQuery.isError ? (
          gigsList.length ? (
            <div style={{ display: "grid", gap: 16 }}>
              {gigsList.map((g) => {
                const raw = applicationsByGigQuery.data?.[g.gig_id];
                const list = Array.isArray(raw)
                  ? raw
                  : Array.isArray(raw?.applications)
                    ? raw.applications
                    : [];

                return (
                  <div
                    key={g.gig_id}
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      {g.gig_name ?? `Gig #${g.gig_id}`}
                    </div>
                    {list.length ? (
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {list.map((a, idx) => (
                          <li key={a.application_id ?? idx}>
                            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                              {JSON.stringify(a, null, 2)}
                            </pre>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: "#555", margin: 0 }}>
                        No applications.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: "#555" }}>Post a gig to see applications.</p>
          )
        ) : null}
      </section>
    </div>
  );
}
