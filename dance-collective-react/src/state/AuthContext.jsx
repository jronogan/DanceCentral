import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch } from "../lib/api.js";
import { useNavigate } from "react-router-dom";
import { createEmployer, getEmployerFromUser } from "../lib/dashboardApi.js";

const AuthContext = createContext(null);

const STORAGE_KEY = "dc_auth";

// To prevent crashes on null values, corrupted JSON
function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [skills, setSkills] = useState([]);
  const [activeRole, setActiveRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = safeJsonParse(localStorage.getItem(STORAGE_KEY));
    if (saved?.token) setToken(saved.token);
    if (saved?.user) setUser(saved.user);
    if (Array.isArray(saved?.roles)) setRoles(saved.roles);
    if (Array.isArray(saved?.skills)) setSkills(saved.skills);
    if (saved?.activeRole) setActiveRole(saved.activeRole);
    setLoading(false);
  }, []);

  // if logged out, remove storage; if logged in, set local storage
  useEffect(() => {
    if (!token && !user) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token, user, roles, skills, activeRole }),
    );
  }, [token, user, roles, skills, activeRole]);

  useEffect(() => {
    if (!token || !user?.user_id) return;
    if (roles?.length) return;

    let cancelled = false;
    (async () => {
      try {
        const fetched = await fetchRolesForUser({
          userId: user.user_id,
          accessToken: token,
        });
        if (cancelled) return;
        console.log("[auth] effect roles fetched:", {
          user_id: user.user_id,
          roles: fetched,
        });
        setRoles(fetched);
        setActiveRole((prev) => prev ?? fetched[0] ?? null);
      } catch (err) {
        if (cancelled) return;
        console.warn("[auth] effect roles fetch failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, user?.user_id, roles?.length]);

  // Fetch skills when logged in and skills are not loaded yet.
  useEffect(() => {
    if (!token || !user?.user_id) return;
    if (skills?.length) return;

    let cancelled = false;
    (async () => {
      try {
        const fetched = await fetchSkillsForUser({
          userId: user.user_id,
          accessToken: token,
        });
        if (cancelled) return;
        console.log("[auth] effect skills fetched:", {
          user_id: user.user_id,
          skills: fetched,
        });
        setSkills(fetched);
      } catch (err) {
        if (cancelled) return;
        console.warn("[auth] effect skills fetch failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, user?.user_id, skills?.length]);

  async function fetchRolesForUser({ userId, accessToken }) {
    if (!userId || !accessToken) return [];
    const data = await apiFetch(`/users-roles/${userId}/roles`, {
      method: "GET",
      token: accessToken,
    });
    return Array.isArray(data) ? data : [];
  }

  async function fetchSkillsForUser({ userId, accessToken }) {
    if (!userId || !accessToken) return [];
    const data = await apiFetch(`/users-skills/${userId}/skills`, {
      method: "GET",
      token: accessToken,
    });
    return Array.isArray(data) ? data : [];
  }

  async function login({ email, password, skipEmployerLookup = false }) {
    const data = await apiFetch("/users/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const nextToken = data?.access_token ?? null;
    setToken(nextToken);

    // Use backend canonical identity endpoint to populate user fields.
    // This avoids relying on /users/login returning user_id.
    let me = null;
    if (nextToken) {
      try {
        me = await apiFetch("/users/me", {
          method: "GET",
          token: nextToken,
        });
      } catch {
        me = null;
      }
    }

    const resolvedUserId =
      me?.user_id ?? data?.user_id ?? user?.user_id ?? null;

    // Only look up employer membership if the user actually has the employer role.
    // Dancers/choreographers are not employer members, and some backends return 400 for them.
    let employer = null;
    if (!skipEmployerLookup && resolvedUserId && nextToken) {
      try {
        const fetchedRoles = await fetchRolesForUser({
          userId: resolvedUserId,
          accessToken: nextToken,
        });
        const hasEmployerRole = fetchedRoles.includes("employer");
        if (hasEmployerRole) {
          employer = await getEmployerFromUser({
            userId: resolvedUserId,
            token: nextToken,
          });
        }
      } catch {
        employer = null;
      }
    }

    setUser((prev) => ({
      ...(prev ?? {}),
      user_id: resolvedUserId,
      email: me?.email ?? email,
      employer_id: employer?.employer_id ?? prev?.employer_id ?? null,
    }));

    return data;
  }

  async function register(payload) {
    const userPayload = payload.user;
    const selectedRoles = Array.isArray(payload?.roles) ? payload.roles : [];
    const selectedSkills = Array.isArray(payload?.skills) ? payload.skills : [];

    // 1) Create the user
    const createUser = await apiFetch("/users/register", {
      method: "POST",
      body: JSON.stringify(userPayload),
    });
    console.log("[auth] register response:", createUser);

    // 2) Log them in (so we can call protected endpoints)
    // Your /users-roles/roles endpoint typically requires JWT.
    const loginRes = await login({
      email: userPayload.email,
      password: userPayload.password,
      skipEmployerLookup: true,
    });
    // 3) Assign roles (requires JWT)
    const createdUserId = createUser?.user_id ?? null;
    console.log("[auth] register createdUserId:", createdUserId);

    if (createdUserId && selectedRoles.length) {
      try {
        for (const roleName of selectedRoles) {
          await apiFetch("/users-roles/roles", {
            method: "POST",
            token: loginRes?.access_token,
            body: JSON.stringify({
              user_id: createdUserId,
              role_name: roleName,
            }),
          });
        }
      } catch (err) {
        const msg =
          err?.message ??
          "Role assignment failed. Please try logging out and logging back in.";
        throw new Error(msg);
      }
    }

    // 3b) Assign skills (requires JWT)
    if (createdUserId && selectedSkills.length) {
      try {
        for (const skillName of selectedSkills) {
          await apiFetch("/users-skills/skills", {
            method: "POST",
            token: loginRes?.access_token,
            body: JSON.stringify({
              user_id: createdUserId,
              skill_name: skillName,
            }),
          });
        }
      } catch (err) {
        const msg = err?.message ?? "Skill assignment failed.";
        throw new Error(msg);
      }
    }

    // Force a roles refresh after registration so UI reflects server truth
    // Some login responses don't include user_id; we already have it from register.
    // Also, keep AuthContext.user.user_id consistent.
    setUser((prev) => ({
      ...(prev ?? {}),
      user_id: (prev?.user_id ?? createdUserId) || createdUserId,
    }));

    const fetchedRoles = await fetchRolesForUser({
      userId: createdUserId,
      accessToken: loginRes?.access_token,
    });
    console.log("[auth] register roles fetched:", {
      user_id: createdUserId,
      roles: fetchedRoles,
    });
    setRoles(fetchedRoles);
    setActiveRole((prev) => prev ?? fetchedRoles[0] ?? null);

    const fetchedSkills = await fetchSkillsForUser({
      userId: createdUserId,
      accessToken: loginRes?.access_token,
    });
    console.log("[auth] register skills fetched:", {
      user_id: createdUserId,
      skills: fetchedSkills,
    });
    setSkills(fetchedSkills);

    // 4) Optional: create employer + membership
    if (payload.employer?.employer_name) {
      // Use trailing slash to avoid Flask redirect (which can break CORS preflight).
      const employerRes = await createEmployer({
        token: loginRes?.access_token,
        body: {
          employer_name: payload.employer.employer_name,
          description: payload.employer.description ?? null,
          website: payload.employer.website ?? null,
          email: payload.employer.email ?? userPayload.email,
          phone: payload.employer.phone ?? null,
        },
      });

      const employerId = employerRes?.employer?.employer_id;
      console.log(employerId);
      const memberRole = payload.employer?.member_role;
      console.log(memberRole);

      if (employerId) {
        await apiFetch("/employer-members/", {
          method: "POST",
          token: loginRes?.access_token,
          body: JSON.stringify({
            employer_id: employerId,
            member_role: payload.employer.member_role ?? "member",
          }),
        });

        // Persist employer_id so EmployerPage can default it automatically.
        setUser((prev) => ({
          ...(prev ?? {}),
          employer_id: prev?.employer_id ?? employerId,
        }));
      }
    }

    return { createUser, loginRes };
  }

  function logout() {
    setToken(null);
    setUser(null);
    setRoles([]);
    setSkills([]);
    setActiveRole(null);
    navigate("/");
  }

  const value = useMemo(
    () => ({
      token,
      user,
      roles,
      skills,
      activeRole,
      setActiveRole,
      loading,
      login,
      register,
      logout,
    }),
    [token, user, roles, skills, activeRole, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
