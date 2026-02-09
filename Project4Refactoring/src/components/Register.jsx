import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  getMemberTypes,
  getRoles,
  getSkills,
} from "../library/dashboardApi.js";

const STEPS = {
  DETAILS: 1,
  COMPANY: 2,
  SKILLS: 3,
  REVIEW: 4,
};

const Register = () => {
  const navigate = useNavigate();
  const { registerProcess, loading, roles: authRoles, activeRole } = useAuth();

  function roleToPath(roleName) {
    switch ((roleName ?? "").toLowerCase()) {
      case "dancer":
        return "/dancer";
      case "choreographer":
        return "/choreographer";
      case "employer":
        return "/employer";
      default:
        return "/";
    }
  }

  const [roleOptions, setRoleOptions] = useState([]);
  const [skillOptions, setSkillOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [currentStep, setCurrentStep] = useState(STEPS.DETAILS);
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Prevent recalculation every render
  const [roles, setRoles] = useState(() => new Set());
  const [skills, setSkills] = useState(() => new Set());
  const [memberRoles, setMemberRoles] = useState(() => new Set());

  const [employerMode, setEmployerMode] = useState("solo");
  const [employerName, setEmployerName] = useState("");
  const [employerDescription, setEmployerDescription] = useState("");
  const [employerWebsite, setEmployerWebsite] = useState("");
  const [employerPhone, setEmployerPhone] = useState("");
  const [employerMemberRole, setEmployerMemberRole] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const selectedRoles = Array.from(roles);
  const selectedSkills = Array.from(skills);
  const selectedMemberRoles = Array.from(memberRoles);
  const wantsEmployer = roles.has("employer");
  const wantsSkills = roles.has("dancer") || roles.has("choreographer");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setOptionsLoading(true);
      try {
        const [rolesRes, skillsRes, memberRolesRes] = await Promise.all([
          getRoles(),
          getSkills(),
          getMemberTypes(),
        ]);

        const rolesList = Array.isArray(rolesRes) ? rolesRes : [];
        const skillsList = Array.isArray(skillsRes) ? skillsRes : [];
        const memberRolesList = Array.isArray(memberRolesRes)
          ? memberRolesRes
          : [];

        if (cancelled) return;

        setRoleOptions(rolesList);
        setSkillOptions(skillsList);
        setMemberRoles(memberRolesList);
      } catch (err) {
        if (cancelled) return;
        console.warn("[register] failed to load roles/skills options:", err);
        // Keep the form usable; validation will prevent empty roles.
        setRoleOptions([]);
        setSkillOptions([]);
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleRole(roleName) {
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleName)) {
        next.delete(roleName);
      } else {
        next.add(roleName);
      }
      return next;
    });
  }

  function toggleSkill(skillName) {
    setSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skillName)) next.delete(skillName);
      else next.add(skillName);
      return next;
    });
  }

  function validateDetailsStep() {
    if (!userName || !email || !password) {
      return "User name, email, and password are required.";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }
    if (!optionsLoading && roleOptions.length === 0) {
      return "Could not load roles from the server. Is your backend running?";
    }
    if (selectedRoles.length === 0) {
      return "Please choose at least one role.";
    }
    return null;
  }

  const navigateToCompany = () => {
    const msg = validateDetailsStep();
    if (msg) {
      setError(msg);
      return;
    }
    if (!wantsEmployer) {
      // If employer isn't selected, skip company step.
      navigateToSkills();
      return;
    }
    setError(null);
    setCurrentStep(STEPS.COMPANY);
  };

  const navigateToSkills = () => {
    const msg = validateDetailsStep();
    if (msg) {
      setError(msg);
      return;
    }
    if (!wantsSkills) {
      setError(null);
      setCurrentStep(STEPS.REVIEW);
      return;
    }
    setError(null);
    setCurrentStep(STEPS.SKILLS);
  };

  const navigateToReview = () => {
    const msg = validateDetailsStep();
    if (msg) {
      setError(msg);
      return;
    }
    if (wantsSkills && selectedSkills.length === 0) {
      setError(
        "Please select at least one skill (or remove dancer/choreographer).",
      );
      return;
    }
    setError(null);
    setCurrentStep(STEPS.REVIEW);
  };

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);

    const detailsError = validateDetailsStep();
    if (detailsError) {
      setError(detailsError);
      setCurrentStep(STEPS.DETAILS);
      return;
    }
    if (wantsEmployer && employerMode === "company" && !employerName) {
      setError("Company name is required.");
      setCurrentStep(STEPS.COMPANY);
      return;
    }
    if (wantsSkills && selectedSkills.length === 0) {
      setError("Please select at least one skill.");
      setCurrentStep(STEPS.SKILLS);
      return;
    }

    const buildEmployer = () => ({
      employer_name: employerName,
      description: employerDescription || null,
      website: employerWebsite || null,
      phone: employerPhone || null,
      email,
      member_role: employerMemberRole || null,
    });

    const payload = {
      user: {
        // Flask expects: name, email, date_of_birth, password
        name: userName,
        email,
        password,
        date_of_birth: dob,
      },
      roles: selectedRoles ?? [],
      skills: selectedSkills ?? [],
      ...(wantsEmployer ? { employer: buildEmployer() } : {}),
    };

    setSubmitting(true);
    try {
      await registerProcess(payload);
      const nextRole = activeRole ?? authRoles?.[0] ?? selectedRoles?.[0];
      navigate(roleToPath(nextRole), { replace: true });
    } catch (err) {
      setError(err?.message ?? "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = loading || submitting;

  const renderStep = () => {
    switch (currentStep) {
      case STEPS.DETAILS:
        return (
          <>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <span>Name</span>
                <input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  type="text"
                  autoComplete="username"
                  maxLength={50}
                  required
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span>Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
            </div>

            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <span>Date of birth</span>
                <input
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  type="date"
                />
              </label>

              <div />
            </div>

            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <span>Password</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span>Confirm password</span>
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </label>
            </div>

            <fieldset style={{ padding: 12 }}>
              <legend>Roles</legend>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {(roleOptions.length ? roleOptions : []).map((roleName) => (
                  <label
                    key={roleName}
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <input
                      type="checkbox"
                      checked={roles.has(roleName)}
                      onChange={() => toggleRole(roleName)}
                    />
                    <span>{roleName}</span>
                  </label>
                ))}
              </div>
              <p style={{ marginTop: 8, color: "#555" }}>
                Choose one or more: dancer, choreographer, employer.
              </p>
              {optionsLoading ? (
                <p style={{ marginTop: 8, color: "#555" }}>Loading roles…</p>
              ) : null}
            </fieldset>

            <div
              style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
            >
              <button
                type="button"
                onClick={navigateToCompany}
                disabled={disabled}
              >
                Next
              </button>
            </div>
          </>
        );

      case STEPS.COMPANY:
        // Only reachable if employer was selected
        return (
          <>
            <h3>Company details</h3>
            <p style={{ color: "#555" }}>
              Only required if you selected the employer role.
            </p>

            <label style={{ display: "grid", gap: 6, maxWidth: 320 }}>
              <span>Employer type</span>
              <select
                value={employerMode}
                onChange={(e) => setEmployerMode(e.target.value)}
              >
                <option value="solo">Solo employer</option>
                <option value="company">Company</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, maxWidth: 320 }}>
              <span>Your member role</span>
              <select
                value={employerMemberRole}
                onChange={(e) => setEmployerMemberRole(e.target.value)}
              >
                <option value="">Select a role…</option>
                {selectedMemberRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <span>
                  {employerMode === "company"
                    ? "Company name"
                    : "Employer name"}
                </span>
                <input
                  value={employerName}
                  onChange={(e) => setEmployerName(e.target.value)}
                  type="text"
                  maxLength={120}
                  placeholder={
                    employerMode === "company" ? "Acme Dance Co." : "Your name"
                  }
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span>Phone</span>
                <input
                  value={employerPhone}
                  onChange={(e) => setEmployerPhone(e.target.value)}
                  type="tel"
                  placeholder="(optional)"
                />
              </label>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Website</span>
              <input
                value={employerWebsite}
                onChange={(e) => setEmployerWebsite(e.target.value)}
                type="url"
                placeholder="https://… (optional)"
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Description</span>
              <textarea
                value={employerDescription}
                onChange={(e) => setEmployerDescription(e.target.value)}
                rows={4}
                placeholder="(optional)"
              />
            </label>

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "space-between",
              }}
            >
              <button
                type="button"
                onClick={() => setCurrentStep(STEPS.DETAILS)}
                disabled={disabled}
              >
                Back
              </button>
              <button
                type="button"
                onClick={navigateToSkills}
                disabled={disabled}
              >
                Next
              </button>
            </div>
          </>
        );

      case STEPS.SKILLS:
        // Only reachable if dancer/choreographer was selected
        return (
          <>
            <h3>Skills</h3>
            <p style={{ color: "#555" }}>
              Choose the skills you have (based on your backend skills list).
            </p>

            {!optionsLoading && skillOptions.length === 0 ? (
              <p style={{ color: "crimson" }} role="alert">
                Could not load skills from the server.
              </p>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 8,
              }}
            >
              {(skillOptions.length ? skillOptions : []).map((s) => (
                <label
                  key={s}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    padding: 8,
                    border: "1px solid #ddd",
                    borderRadius: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={skills.has(s)}
                    onChange={() => toggleSkill(s)}
                  />
                  <span>{s}</span>
                </label>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "space-between",
                marginTop: 12,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setCurrentStep(wantsEmployer ? STEPS.COMPANY : STEPS.DETAILS)
                }
                disabled={disabled}
              >
                Back
              </button>
              <button
                type="button"
                onClick={navigateToReview}
                disabled={disabled}
              >
                Next
              </button>
            </div>
          </>
        );

      case STEPS.REVIEW:
        return (
          <>
            <h3>Review</h3>
            <div style={{ display: "grid", gap: 8 }}>
              <div>
                <strong>Name:</strong> {userName}
              </div>
              <div>
                <strong>Email:</strong> {email}
              </div>
              <div>
                <strong>Roles:</strong> {selectedRoles.join(", ")}
              </div>
              {wantsEmployer ? (
                <div>
                  <strong>Employer:</strong> {employerMode}{" "}
                  {employerName ? `(${employerName})` : ""}
                </div>
              ) : null}
              {wantsSkills ? (
                <div>
                  <strong>Skills:</strong> {selectedSkills.join(", ")}
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "space-between",
                marginTop: 12,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (wantsSkills) setCurrentStep(STEPS.SKILLS);
                  else if (wantsEmployer) setCurrentStep(STEPS.COMPANY);
                  else setCurrentStep(STEPS.DETAILS);
                }}
                disabled={disabled}
              >
                Back
              </button>
              <button type="submit" disabled={disabled}>
                {submitting ? "Creating account…" : "Create account"}
              </button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const STEP_TITLES = {
    [STEPS.DETAILS]: "Register",
    [STEPS.COMPANY]: "Register — Company",
    [STEPS.SKILLS]: "Register — Skills",
    [STEPS.REVIEW]: "Register — Review",
  };

  const title = STEP_TITLES[currentStep] ?? "Register";

  return (
    <div style={{ maxWidth: 720, margin: "24px auto" }}>
      <h2>{title}</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        {renderStep()}

        {error ? (
          <div style={{ color: "crimson" }} role="alert">
            {error}
          </div>
        ) : null}
      </form>

      <p style={{ marginTop: 12 }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
};

export default Register;
