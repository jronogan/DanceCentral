import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

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

  const availableRoles = useMemo(() => {
    if (!Array.isArray(roles)) return [];
    return roles.filter((r) => roleToPath(r) !== "/");
  }, [roles]);

  // Prefer activeRole when it's one of the available roles; otherwise infer from the route.
  const inferred = useMemo(() => {
    if (availableRoles.includes(activeRole)) return activeRole;

    const p = location.pathname;
    if (p.startsWith("/dancer")) return "dancer";
    if (p.startsWith("/choreographer")) return "choreographer";
    if (p.startsWith("/employer")) return "employer";
    return "";
  }, [availableRoles, activeRole, location.pathname]);

  if (!availableRoles.length) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 600 }}>{label}:</span>
        <select
          value={inferred ?? ""}
          onChange={(e) => {
            const next = e.target.value;
            setActiveRole(next);
            navigate(roleToPath(next));
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
