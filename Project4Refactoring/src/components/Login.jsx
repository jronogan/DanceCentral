import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

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

const Login = () => {
  const navigate = useNavigate();
  const { loginProcess, loading, roles, activeRole } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const nextRole = activeRole ?? roles?.[0];
    if (!nextRole) return;

    navigate(roleToPath(nextRole), { replace: true });
  }, [activeRole, roles, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      await loginProcess({ email, password });
    } catch (err) {
      setError(err?.message ?? "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = loading || submitting;

  return (
    <div style={{ maxWidth: 520, margin: "24px auto" }}>
      <h2>Login</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
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

        <label style={{ display: "grid", gap: 6 }}>
          <span>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />
        </label>

        {error ? (
          <div style={{ color: "crimson" }} role="alert">
            {error}
          </div>
        ) : null}

        <button type="submit" disabled={disabled}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p style={{ marginTop: 12 }}>
        Need an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
};

export default Login;
