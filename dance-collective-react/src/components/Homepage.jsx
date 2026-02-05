import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";
import RoleDashboardSwitcher from "./RoleDashboardSwitcher.jsx";

function roleToPath(role) {
  switch ((role ?? "").toLowerCase()) {
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

const Homepage = () => {
  const navigate = useNavigate();
  const { user, roles, skills, activeRole, setActiveRole } = useAuth();

  useEffect(() => {
    console.log("[home] auth snapshot:", {
      user,
      roles,
      skills,
      activeRole,
    });
  }, [user, roles, skills, activeRole]);

  // Auto-direct signed-in users to their active role landing page.
  useEffect(() => {
    if (!user) return;
    if (!activeRole) return;
    const path = roleToPath(activeRole);
    if (path !== "/") navigate(path, { replace: true });
  }, [user, activeRole, navigate]);

  return (
    <div>
      <h2>This is the Homepage</h2>

      {!user ? (
        <nav style={{ display: "flex", gap: 12 }}>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </nav>
      ) : (
        <>
          <p>Choose your view:</p>
          <RoleDashboardSwitcher label="View as" />

          <div style={{ marginTop: 16, textAlign: "left" }}>
            <h3 style={{ margin: "0 0 8px" }}>My skills</h3>
            {Array.isArray(skills) && skills.length ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {skills.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "#555", margin: 0 }}>No skills saved yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Homepage;
