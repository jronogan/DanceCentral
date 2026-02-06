import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../state/AuthContext.jsx";
import {
  acceptApplication,
  addGigRole,
  createGig,
  getApplicationsForGig,
  getEmployerFromUser,
  getEventTypes,
  getGigs,
  rejectApplication,
  shortlistApplication,
} from "../lib/dashboardApi.js";

function normalizeEventTypes(data) {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data
      .map((t) => (typeof t === "string" ? t : t?.type_name))
      .filter(Boolean);
  }
  if (Array.isArray(data.event_types))
    return normalizeEventTypes(data.event_types);
  return [];
}

export default function EmployerPage() {
  const { token, user } = useAuth();
  const userId = user?.user_id;
  const queryClient = useQueryClient();

  const [gigName, setGigName] = useState("");
  const [gigDate, setGigDate] = useState("");
  const [gigDetails, setGigDetails] = useState("");
  const [typeName, setTypeName] = useState("");

  const [needsDancer, setNeedsDancer] = useState(false);
  const [needsChoreographer, setNeedsChoreographer] = useState(false);

  // Backend currently treats falsy values as missing, so default > 0.
  const [dancer, setDancer] = useState({
    needed_count: 1,
    pay_amount: 1,
    pay_currency: "USD",
    pay_unit: "flat",
  });
  const [choreographer, setChoreographer] = useState({
    needed_count: 1,
    pay_amount: 1,
    pay_currency: "USD",
    pay_unit: "flat",
  });

  const employerQuery = useQuery({
    queryKey: ["employer", { userId }],
    queryFn: () => getEmployerFromUser({ token, userId }),
    enabled: Boolean(token && userId),
  });

  const employerId = useMemo(() => {
    const n = Number(employerQuery.data?.employer_id);
    return Number.isFinite(n) ? n : null;
  }, [employerQuery.data]);

  const eventTypesQuery = useQuery({
    queryKey: ["eventTypes"],
    queryFn: () => getEventTypes({ token }),
    enabled: Boolean(token),
  });
  const eventTypes = normalizeEventTypes(eventTypesQuery.data);

  const myGigsQuery = useQuery({
    queryKey: ["employer", "gigs", { posted_by_user_id: userId }],
    queryFn: () => getGigs({ token, filters: { posted_by_user_id: userId } }),
    enabled: Boolean(token && userId),
  });

  const gigsList = useMemo(() => {
    const d = myGigsQuery.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.gigs)) return d.gigs;
    return [];
  }, [myGigsQuery.data]);

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
        results[g.gig_id] = await getApplicationsForGig({
          token,
          gig_id: g.gig_id,
        });
      }
      return results;
    },
    enabled: Boolean(token && gigsList.length),
  });

  const createGigMutation = useMutation({
    mutationFn: async () => {
      if (!needsDancer && !needsChoreographer) {
        throw new Error("Pick at least one required role.");
      }
      if (!employerId) {
        throw new Error("Missing employer_id.");
      }

      const created = await createGig({
        token,
        gig: {
          gig_name: gigName,
          gig_date: gigDate,
          gig_details: gigDetails,
          type_name: typeName,
          employer_id: employerId,
        },
      });

      const gigId = created?.gig_id ?? created?.gig?.gig_id ?? null;
      if (!gigId) return created;

      const roleCalls = [];
      if (needsDancer) {
        roleCalls.push(
          addGigRole({
            token,
            gig_role: {
              gig_id: gigId,
              role_name: "dancer",
              needed_count: Number(dancer.needed_count),
              pay_amount: Number(dancer.pay_amount),
              pay_currency: String(dancer.pay_currency || "").trim(),
              pay_unit: String(dancer.pay_unit || "").trim(),
            },
          }),
        );
      }
      if (needsChoreographer) {
        roleCalls.push(
          addGigRole({
            token,
            gig_role: {
              gig_id: gigId,
              role_name: "choreographer",
              needed_count: Number(choreographer.needed_count),
              pay_amount: Number(choreographer.pay_amount),
              pay_currency: String(choreographer.pay_currency || "").trim(),
              pay_unit: String(choreographer.pay_unit || "").trim(),
            },
          }),
        );
      }

      const results = await Promise.allSettled(roleCalls);
      const rejected = results.find((r) => r.status === "rejected");
      if (rejected?.status === "rejected") throw rejected.reason;

      return created;
    },
    onSuccess: async () => {
      setGigName("");
      setGigDate("");
      setGigDetails("");
      setTypeName("");
      setNeedsDancer(false);
      setNeedsChoreographer(false);
      setDancer({
        needed_count: 1,
        pay_amount: 1,
        pay_currency: "USD",
        pay_unit: "flat",
      });
      setChoreographer({
        needed_count: 1,
        pay_amount: 1,
        pay_currency: "USD",
        pay_unit: "flat",
      });

      await queryClient.invalidateQueries({
        queryKey: ["employer", "gigs", { posted_by_user_id: userId }],
      });
      await queryClient.invalidateQueries({
        queryKey: ["employer", "applicationsByGig"],
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ application_id, action }) => {
      if (action === "accept")
        return acceptApplication({ token, application_id });
      if (action === "reject")
        return rejectApplication({ token, application_id });
      if (action === "shortlist")
        return shortlistApplication({ token, application_id });
      throw new Error("Unknown action");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["employer", "applicationsByGig"],
      });
    },
  });

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", textAlign: "left" }}>
      <h2>Employer dashboard</h2>

      <section style={{ marginTop: 16 }}>
        <h3>Create a gig</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createGigMutation.mutate();
          }}
          style={{ display: "grid", gap: 10, maxWidth: 680 }}
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
            >
              <option value="" disabled>
                {eventTypesQuery.isLoading
                  ? "Loading event types…"
                  : eventTypesQuery.isError
                    ? "Failed to load event types"
                    : "Select an event type"}
              </option>
              {eventTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <fieldset
            style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}
          >
            <legend style={{ padding: "0 6px" }}>Required roles</legend>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={needsDancer}
                onChange={(e) => setNeedsDancer(e.target.checked)}
              />
              <span>Dancer</span>
            </label>

            {needsDancer ? (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  padding: 10,
                  border: "1px solid #eee",
                  borderRadius: 8,
                }}
              >
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Needed count</span>
                  <input
                    type="number"
                    min={1}
                    value={dancer.needed_count}
                    onChange={(e) =>
                      setDancer((s) => ({ ...s, needed_count: e.target.value }))
                    }
                    required
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Pay amount</span>
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    value={dancer.pay_amount}
                    onChange={(e) =>
                      setDancer((s) => ({ ...s, pay_amount: e.target.value }))
                    }
                    required
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Pay currency</span>
                  <input
                    value={dancer.pay_currency}
                    onChange={(e) =>
                      setDancer((s) => ({ ...s, pay_currency: e.target.value }))
                    }
                    required
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Pay unit</span>
                  <input
                    value={dancer.pay_unit}
                    onChange={(e) =>
                      setDancer((s) => ({ ...s, pay_unit: e.target.value }))
                    }
                    required
                  />
                </label>
              </div>
            ) : null}

            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <input
                type="checkbox"
                checked={needsChoreographer}
                onChange={(e) => setNeedsChoreographer(e.target.checked)}
              />
              <span>Choreographer</span>
            </label>

            {needsChoreographer ? (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  padding: 10,
                  border: "1px solid #eee",
                  borderRadius: 8,
                }}
              >
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Needed count</span>
                  <input
                    type="number"
                    min={1}
                    value={choreographer.needed_count}
                    onChange={(e) =>
                      setChoreographer((s) => ({
                        ...s,
                        needed_count: e.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Pay amount</span>
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    value={choreographer.pay_amount}
                    onChange={(e) =>
                      setChoreographer((s) => ({
                        ...s,
                        pay_amount: e.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Pay currency</span>
                  <input
                    value={choreographer.pay_currency}
                    onChange={(e) =>
                      setChoreographer((s) => ({
                        ...s,
                        pay_currency: e.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Pay unit</span>
                  <input
                    value={choreographer.pay_unit}
                    onChange={(e) =>
                      setChoreographer((s) => ({
                        ...s,
                        pay_unit: e.target.value,
                      }))
                    }
                    required
                  />
                </label>
              </div>
            ) : null}
          </fieldset>

          <button type="submit" disabled={createGigMutation.isPending}>
            {createGigMutation.isPending ? "Saving…" : "Create gig"}
          </button>

          {createGigMutation.isError ? (
            <p style={{ color: "crimson" }} role="alert">
              {createGigMutation.error?.message ?? "Failed to create gig"}
            </p>
          ) : null}
        </form>
      </section>

      <section style={{ marginTop: 24 }}>
        <h3>My posted gigs</h3>

        {myGigsQuery.isLoading ? <p>Loading…</p> : null}
        {myGigsQuery.isError ? (
          <p style={{ color: "crimson" }} role="alert">
            {myGigsQuery.error?.message ?? "Failed to load gigs"}
          </p>
        ) : null}

        {gigsList.length ? (
          <div style={{ display: "grid", gap: 16 }}>
            {gigsList.map((g) => {
              const apps = applicationsByGigQuery.data?.[g.gig_id] ?? [];
              return (
                <div
                  key={g.gig_id}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <strong>{g.gig_name}</strong>
                    <span>{g.gig_date}</span>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <strong>Applications</strong>
                    {Array.isArray(apps) && apps.length ? (
                      <ul>
                        {apps.map((a) => (
                          <li key={a.application_id} style={{ marginTop: 8 }}>
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <span>
                                #{a.application_id} — {a.status} — user{" "}
                                {a.user_id}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    application_id: a.application_id,
                                    action: "accept",
                                  })
                                }
                                disabled={updateStatusMutation.isPending}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    application_id: a.application_id,
                                    action: "reject",
                                  })
                                }
                                disabled={updateStatusMutation.isPending}
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    application_id: a.application_id,
                                    action: "shortlist",
                                  })
                                }
                                disabled={updateStatusMutation.isPending}
                              >
                                Shortlist
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: "#777" }}>No applications yet.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: "#777" }}>No gigs yet.</p>
        )}
      </section>
    </div>
  );
}
