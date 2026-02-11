import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import RoleDashboardSwitcher from "./RoleDashboardSwitcher";
import { useAuth } from "../auth/useAuth.js";
import ApplicantProfileModal from "./ApplicantProfileModal";
import {
  acceptApplication,
  createGig,
  createGigRole,
  deleteGig,
  getApplications,
  getEmployerFromUser,
  getEventTypes,
  getPostedGigs,
  formatString,
  rejectApplication,
  shortlistApplication,
} from "../library/dashboardApi";

const EmployerDashboard = () => {
  const { token, user } = useAuth();
  const userId = user?.user_id ?? null;
  const queryClient = useQueryClient();

  const [selectedApplicant, setSelectedApplicant] = useState(null);

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
    pay_currency: "SGD",
    pay_unit: "flat rate",
  });
  const [choreographer, setChoreographer] = useState({
    needed_count: 1,
    pay_amount: 1,
    pay_currency: "SGD",
    pay_unit: "flat rate",
  });

  // Get Employer from User
  const employerQuery = useQuery({
    queryKey: ["employerFromUser", userId],
    queryFn: () => getEmployerFromUser({ token }),
    enabled: Boolean(userId),
  });

  const employerId = employerQuery.data?.employer_id ?? null;

  // Get event types
  const eventTypesQuery = useQuery({
    queryKey: ["eventTypes"],
    queryFn: () => getEventTypes({ token }),
    enabled: Boolean(token),
  });

  const eventTypesData = Array.isArray(eventTypesQuery.data)
    ? eventTypesQuery.data
    : [];

  // View all gigs that I posted
  const postedGigsQuery = useQuery({
    queryKey: ["postedGigs"],
    queryFn: () => getPostedGigs({ token }),
    enabled: Boolean(token),
  });

  const postedGigs = Array.isArray(postedGigsQuery.data)
    ? postedGigsQuery.data
    : [];

  const postedGigsIds = postedGigs.map((gig) => gig.gig_id).filter(Boolean);

  // View all applicants for each gig I posted
  const applicantsByGigQuery = useQuery({
    queryKey: ["applicationsByGig", { postedGigsIds }],
    queryFn: async () => {
      const map = {};
      for (const gigId of postedGigsIds) {
        const applicants = await getApplications({ token, gigId });
        map[gigId] = Array.isArray(applicants) ? applicants : [];
      }
      return map;
    },
    enabled: Boolean(token && postedGigsIds.length > 0),
  });

  const applicantsByGig = applicantsByGigQuery.data ?? {};

  const createGigMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Not authenticated.");
      if (!needsDancer && !needsChoreographer) {
        throw new Error(
          "Pick at least one required role (dancer/choreographer).",
        );
      }
      if (!employerId)
        throw new Error("Missing employer_id (no employer linked).");
      if (!String(gigName || "").trim())
        throw new Error("Gig name is required.");
      if (!String(gigDate || "").trim())
        throw new Error("Gig date is required.");
      if (!String(typeName || "").trim())
        throw new Error("Event type is required.");

      // Create gig
      const created = await createGig({
        token,
        gig_name: gigName,
        gig_date: gigDate,
        gig_details: gigDetails,
        type_name: typeName,
        employer_id: employerId,
      });

      const gigId = created?.gig_id ?? created?.gig?.gig_id ?? null;
      if (!gigId) return created;

      // Attach gig roles
      const roleCalls = [];

      if (needsDancer) {
        roleCalls.push(
          createGigRole({
            token,
            gig_id: gigId,
            role_name: "dancer",
            needed_count: Number(dancer.needed_count),
            pay_amount: Number(dancer.pay_amount),
            pay_currency: String(dancer.pay_currency || "").trim(),
            pay_unit: String(dancer.pay_unit || "").trim(),
          }),
        );
      }

      if (needsChoreographer) {
        roleCalls.push(
          createGigRole({
            token,
            gig_id: gigId,
            role_name: "choreographer",
            needed_count: Number(choreographer.needed_count),
            pay_amount: Number(choreographer.pay_amount),
            pay_currency: String(choreographer.pay_currency || "").trim(),
            pay_unit: String(choreographer.pay_unit || "").trim(),
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
        pay_currency: "SGD",
        pay_unit: "flat rate",
      });
      setChoreographer({
        needed_count: 1,
        pay_amount: 1,
        pay_currency: "SGD",
        pay_unit: "flat rate",
      });

      await queryClient.invalidateQueries({ queryKey: ["postedGigs"] });
      await queryClient.invalidateQueries({ queryKey: ["applicationsByGig"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ application_id, action }) => {
      if (!token) throw new Error("Not authenticated.");
      if (action === "accept")
        return acceptApplication({ token, application_id });
      if (action === "reject")
        return rejectApplication({ token, application_id });
      if (action === "shortlist")
        return shortlistApplication({ token, application_id });
      throw new Error("Unknown action");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["applicationsByGig"] });
    },
  });

  const deleteGigMutation = useMutation({
    mutationFn: (gigId) => {
      if (!token) throw new Error("Not authenticated.");
      return deleteGig({ token, gigId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["postedGigs"] });
      await queryClient.invalidateQueries({ queryKey: ["applicationsByGig"] });
    },
  });

  const statusPillStyle = (status) => {
    const s = String(status || "").toLowerCase();
    const base = {
      fontSize: 12,
      padding: "2px 8px",
      borderRadius: 999,
      border: "1px solid var(--dc-border)",
      display: "inline-block",
    };
    if (s.includes("accept"))
      return { ...base, background: "rgba(16, 185, 129, 0.25)" };
    if (s.includes("reject"))
      return { ...base, background: "rgba(239, 68, 68, 0.25)" };
    if (s.includes("short"))
      return { ...base, background: "rgba(245, 158, 11, 0.25)" };
    return { ...base, background: "var(--dc-surface)" };
  };

  const canSubmitGig = useMemo(() => {
    if (!token) return false;
    if (!employerId) return false;
    if (!String(gigName || "").trim()) return false;
    if (!String(gigDate || "").trim()) return false;
    if (!String(typeName || "").trim()) return false;
    if (!needsDancer && !needsChoreographer) return false;
    return true;
  }, [
    token,
    employerId,
    gigName,
    gigDate,
    typeName,
    needsDancer,
    needsChoreographer,
  ]);

  return (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Employer Dashboard</h2>
        </div>

        <div style={{ fontSize: 12, opacity: 0.85 }}>
          {employerQuery.isLoading ?? <p>Loading employer…</p>}
          {employerQuery.isSuccess ? (
            <p>Employer ID: {employerId}</p>
          ) : (
            <p>No employer profile linked to this user</p>
          )}
        </div>
      </div>

      {/* 1) Create gigs */}
      <section
        style={{
          border: "1px solid var(--dc-border)",
          borderRadius: 8,
          padding: 12,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Create a gig</h3>

        {createGigMutation.isError ? (
          <div style={{ color: "var(--dc-danger)", marginBottom: 10 }}>
            {String(
              createGigMutation.error?.message || "Failed to create gig.",
            )}
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Gig name</span>
            <input
              value={gigName}
              onChange={(e) => setGigName(e.target.value)}
              style={{
                padding: 8,
                borderRadius: 6,
                border: "1px solid var(--dc-border)",
              }}
              placeholder="e.g. Chinese New Year performance"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Gig date</span>
            <input
              type="date"
              value={gigDate}
              onChange={(e) => setGigDate(e.target.value)}
              style={{
                padding: 8,
                borderRadius: 6,
                border: "1px solid var(--dc-border)",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Event type</span>
            {eventTypesQuery.isLoading ? (
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Loading event types…
              </div>
            ) : eventTypesQuery.isError ? (
              <div style={{ fontSize: 12, color: "var(--dc-danger)" }}>
                Couldn’t load event types.
              </div>
            ) : (
              <select
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                style={{
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid var(--dc-border)",
                }}
              >
                <option value="">Select event type…</option>
                {eventTypesData.map((t) => {
                  const value = t?.type_name ?? t?.name ?? String(t);
                  return (
                    <option key={value} value={value}>
                      {formatString(value)}
                    </option>
                  );
                })}
              </select>
            )}
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Gig details</span>
            <textarea
              value={gigDetails}
              onChange={(e) => setGigDetails(e.target.value)}
              rows={4}
              style={{
                padding: 8,
                borderRadius: 6,
                border: "1px solid var(--dc-border)",
              }}
              placeholder="Describe the gig, rehearsal needs, attire, etc."
            />
          </label>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={needsDancer}
                  onChange={(e) => setNeedsDancer(e.target.checked)}
                />
                <span>Need dancers</span>
              </label>

              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={needsChoreographer}
                  onChange={(e) => setNeedsChoreographer(e.target.checked)}
                />
                <span>Need choreographers</span>
              </label>
            </div>

            {needsDancer ? (
              <div
                style={{
                  border: "1px solid var(--dc-border)",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <strong>Dancer role requirements</strong>
                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Needed count</span>
                    <input
                      type="number"
                      min={1}
                      value={dancer.needed_count}
                      onChange={(e) =>
                        setDancer((prev) => ({
                          ...prev,
                          needed_count: e.target.value,
                        }))
                      }
                      style={{
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid var(--dc-border)",
                      }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Pay amount</span>
                    <input
                      type="number"
                      min={0}
                      value={dancer.pay_amount}
                      onChange={(e) =>
                        setDancer((prev) => ({
                          ...prev,
                          pay_amount: e.target.value,
                        }))
                      }
                      style={{
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid var(--dc-border)",
                      }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Currency</span>
                    <input
                      value={dancer.pay_currency}
                      onChange={(e) =>
                        setDancer((prev) => ({
                          ...prev,
                          pay_currency: e.target.value,
                        }))
                      }
                      style={{
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid var(--dc-border)",
                      }}
                      placeholder="e.g. SGD"
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Pay unit</span>
                    <input
                      value={dancer.pay_unit}
                      onChange={(e) =>
                        setDancer((prev) => ({
                          ...prev,
                          pay_unit: e.target.value,
                        }))
                      }
                      style={{
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid var(--dc-border)",
                      }}
                      placeholder="e.g. flat rate / per hour"
                    />
                  </label>
                </div>
              </div>
            ) : null}

            {needsChoreographer ? (
              <div
                style={{
                  border: "1px solid var(--dc-border)",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <strong>Choreographer role requirements</strong>
                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Needed count</span>
                    <input
                      type="number"
                      min={1}
                      value={choreographer.needed_count}
                      onChange={(e) =>
                        setChoreographer((prev) => ({
                          ...prev,
                          needed_count: e.target.value,
                        }))
                      }
                      style={{
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid var(--dc-border)",
                      }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Pay amount</span>
                    <input
                      type="number"
                      min={0}
                      value={choreographer.pay_amount}
                      onChange={(e) =>
                        setChoreographer((prev) => ({
                          ...prev,
                          pay_amount: e.target.value,
                        }))
                      }
                      style={{
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid var(--dc-border)",
                      }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Currency</span>
                    <input
                      value={choreographer.pay_currency}
                      onChange={(e) =>
                        setChoreographer((prev) => ({
                          ...prev,
                          pay_currency: e.target.value,
                        }))
                      }
                      style={{
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid var(--dc-border)",
                      }}
                      placeholder="e.g. SGD"
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Pay unit</span>
                    <input
                      value={choreographer.pay_unit}
                      onChange={(e) =>
                        setChoreographer((prev) => ({
                          ...prev,
                          pay_unit: e.target.value,
                        }))
                      }
                      style={{
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid var(--dc-border)",
                      }}
                      placeholder="e.g. flat rate / per hour"
                    />
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => createGigMutation.mutate()}
              disabled={!canSubmitGig || createGigMutation.isPending}
              style={{ padding: "8px 12px" }}
            >
              {createGigMutation.isPending ? "Creating…" : "Create gig"}
            </button>
            <span style={{ fontSize: 12, opacity: 0.75 }}>
              {needsDancer || needsChoreographer
                ? "Roles will be added after the gig is created."
                : "Select at least one role."}
            </span>
          </div>
        </div>
      </section>

      {/* 2) View my posted gigs + 3) Manage applications */}
      <section
        style={{
          border: "1px solid var(--dc-border)",
          borderRadius: 8,
          padding: 12,
        }}
      >
        <h3 style={{ marginTop: 0 }}>My posted gigs</h3>

        {postedGigsQuery.isLoading ? (
          <div>Loading your gigs…</div>
        ) : postedGigsQuery.isError ? (
          <div>Couldn’t load your gigs.</div>
        ) : postedGigs.length === 0 ? (
          <div>You haven’t posted any gigs yet.</div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              paddingLeft: 0,
              margin: 0,
              display: "grid",
              gap: 12,
            }}
          >
            {postedGigs.map((g) => {
              const applicants = applicantsByGig?.[g.gig_id] ?? [];
              return (
                <li
                  key={g.gig_id}
                  style={{
                    border: "1px solid var(--dc-border)",
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "grid", gap: 4 }}>
                      <strong>{g.gig_name ?? `Gig #${g.gig_id}`}</strong>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        {g.type_name ? formatString(g.type_name) : ""}{" "}
                        {g.gig_date
                          ? `• ${new Date(g.gig_date).toLocaleDateString()}`
                          : ""}
                      </div>
                    </div>

                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <button
                        type="button"
                        onClick={() => deleteGigMutation.mutate(g.gig_id)}
                        disabled={deleteGigMutation.isPending}
                        style={{ padding: "6px 10px" }}
                      >
                        {deleteGigMutation.isPending ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>

                  {g.gig_details ? (
                    <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                      {g.gig_details}
                    </div>
                  ) : null}

                  <div style={{ marginTop: 12 }}>
                    <h4 style={{ margin: "0 0 8px 0" }}>Applications</h4>

                    {applicantsByGigQuery.isLoading ? (
                      <div>Loading applicants…</div>
                    ) : applicantsByGigQuery.isError ? (
                      <div style={{ color: "var(--dc-danger)" }}>
                        {String(
                          applicantsByGigQuery.error?.message ||
                            "Couldn’t load applicants.",
                        )}
                      </div>
                    ) : applicants.length === 0 ? (
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        No applications yet.
                      </div>
                    ) : (
                      <ul
                        style={{
                          listStyle: "none",
                          paddingLeft: 0,
                          margin: 0,
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <li style={{ fontSize: 12, opacity: 0.75 }}>
                          Total: {applicants.length}
                        </li>
                        {applicants.map((a) => (
                          <li
                            key={a.application_id ?? `${a.user_id}-${a.gig_id}`}
                            style={{
                              border: "1px solid var(--dc-border)",
                              borderRadius: 8,
                              padding: 10,
                              display: "grid",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  gap: 10,
                                  alignItems: "center",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedApplicant({
                                      userId: a.user_id,
                                      name:
                                        a.applicant_name ||
                                        a.name ||
                                        a.applicant_email ||
                                        `Applicant #${a.user_id}`,
                                    })
                                  }
                                  style={{
                                    padding: 0,
                                    border: 0,
                                    background: "transparent",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    textAlign: "left",
                                    color: "var(--dc-text-muted)",
                                    textDecoration: "underline",
                                    textUnderlineOffset: 3,
                                  }}
                                  title="View applicant profile"
                                >
                                  {a.applicant_name ||
                                    a.name ||
                                    a.applicant_email ||
                                    `Applicant #${a.user_id}`}
                                </button>
                                <span style={statusPillStyle(a.status)}>
                                  {a.status ?? "applied"}
                                </span>
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.8 }}>
                                {a.created_at || a.applied_at
                                  ? new Date(
                                      a.created_at || a.applied_at,
                                    ).toLocaleString()
                                  : ""}
                              </div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    application_id: a.application_id,
                                    action: "shortlist",
                                  })
                                }
                                disabled={updateStatusMutation.isPending}
                                style={{ padding: "6px 10px" }}
                              >
                                Shortlist
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    application_id: a.application_id,
                                    action: "accept",
                                  })
                                }
                                disabled={updateStatusMutation.isPending}
                                style={{ padding: "6px 10px" }}
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
                                style={{ padding: "6px 10px" }}
                              >
                                Reject
                              </button>
                            </div>

                            {updateStatusMutation.isError ? (
                              <div
                                style={{
                                  color: "var(--dc-danger)",
                                  fontSize: 12,
                                }}
                              >
                                {String(
                                  updateStatusMutation.error?.message ||
                                    "Failed to update status.",
                                )}
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {selectedApplicant ? (
        <ApplicantProfileModal
          token={token}
          userId={selectedApplicant.userId}
          applicantName={selectedApplicant.name}
          onClose={() => setSelectedApplicant(null)}
        />
      ) : null}
    </div>
  );
};

export default EmployerDashboard;
