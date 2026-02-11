import "./App.css";
import { Navigate, Route, Routes } from "react-router-dom";
import Register from "./components/Register";
import DancerDashboard from "./components/DancerDashboard";
import Login from "./components/Login";
import ChoreographerDashboard from "./components/ChoreographerDashboard";
import EmployerDashboard from "./components/EmployerDashboard";
import UserProfile from "./components/UserProfile";
import { useAuth } from "./auth/useAuth.js";
import RoleDashboardSwitcher from "./components/RoleDashboardSwitcher.jsx";

function roleToPath(roleName) {
  switch ((roleName ?? "").toLowerCase()) {
    case "dancer":
      return "/dancer";
    case "choreographer":
      return "/choreographer";
    case "employer":
      return "/employer";
    default:
      return "/login";
  }
}

function App() {
  const { logout, user, isAuthenticated, loading, activeRole, roles } =
    useAuth();

  const displayName = user?.user_name ?? user?.name ?? user?.email;
  const defaultRole = activeRole ?? roles?.[0];
  const defaultPath = isAuthenticated ? roleToPath(defaultRole) : "/login";
  return (
    <>
      <h1>DANCE CENTRAL</h1>
      <div>
        {user ? <p>Signed in as: {displayName}</p> : <p>Not Signed in</p>}
        {loading ? null : isAuthenticated ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <RoleDashboardSwitcher />
            <a href="/user" style={{ textDecoration: "none" }}>
              My Profile
            </a>
            <button type="button" onClick={logout}>
              Logout
            </button>
          </div>
        ) : null}
      </div>
      <Routes>
        <Route path="/" element={<Navigate to={defaultPath} replace />} />
        <Route path="/*" element={<Navigate to={defaultPath} replace />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/user" element={<UserProfile />} />
        <Route path="/dancer" element={<DancerDashboard />} />
        <Route path="/choreographer" element={<ChoreographerDashboard />} />
        <Route path="/employer" element={<EmployerDashboard />} />
      </Routes>
    </>
  );
}

export default App;
