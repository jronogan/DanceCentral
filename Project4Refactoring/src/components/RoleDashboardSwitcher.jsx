import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth.js";

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

export default function RoleDashboardSwitcher({ label = "Dashboard" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { roles, activeRole, setActiveRole } = useAuth();

  const availableRoles = (Array.isArray(roles) ? roles : []).filter(
    (r) => roleToPath(r) !== "/",
  );

  // If user somehow has no dashboard roles, don't render.
  if (availableRoles.length === 0) return null;

  const selected =
    activeRole && availableRoles.includes(activeRole)
      ? activeRole
      : availableRoles[0];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 600 }}>{label}:</span>
        <select
          value={selected ?? ""}
          onChange={(e) => {
            const next = e.target.value;
            setActiveRole(next);
            const nextPath = roleToPath(next);
            if (location.pathname !== nextPath) navigate(nextPath);
          }}
        >
          {availableRoles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
