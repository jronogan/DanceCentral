import React, { useEffect, useState, createContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  assignUserRole,
  assignUserSkill,
  createEmployer,
  createEmployerMember,
  getEmployerFromUser,
  getRolesForUser,
  getSkillsForUser,
  getUserProfile,
  loginUser,
  registerNewUser,
} from "../library/dashboardApi";

const AuthContext = createContext(null);

const STORAGE_KEY = "dc_auth";

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error("Failed to parse JSON:", error);
    return null;
  }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [hydrated] = useState(() => {
    const saved = safeJsonParse(localStorage.getItem(STORAGE_KEY));
    return {
      token: saved?.token ?? null,
      user: saved?.user ?? null,
      roles: Array.isArray(saved?.roles) ? saved.roles : [],
      skills: Array.isArray(saved?.skills) ? saved.skills : [],
      activeRole: saved?.activeRole ?? null,
    };
  });

  const [token, setToken] = useState(hydrated.token);
  const [user, setUser] = useState(hydrated.user);
  const [roles, setRoles] = useState(hydrated.roles);
  const [skills, setSkills] = useState(hydrated.skills);
  const [activeRole, setActiveRole] = useState(hydrated.activeRole);
  const [loading] = useState(false);

  const isAuthenticated = Boolean(token);

  // Hydration is done in initial state to avoid setState inside effects.

  // At any render when these values change, update localStorage
  useEffect(() => {
    if (!token && !user) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token, user, roles, skills, activeRole }),
    );

    console.log(user);
  }, [token, user, roles, skills, activeRole]);

  // Fallback retrieval of user skills and roles if localStorage fails to extract
  useEffect(() => {
    if (!token || !user?.user_id) return;

    const needRoles = !roles?.length;
    const needSkills = !skills?.length;
    if (!needRoles && !needSkills) return;

    let cancelled = false;

    //IIFE: Immediately Invoked Function Expressions
    (async () => {
      try {
        const [rolesArr, skillsArr] = await Promise.all([
          needRoles ? getRolesForUser({ token }) : Promise.resolve(null),
          needSkills ? getSkillsForUser({ token }) : Promise.resolve(null),
        ]);

        if (cancelled) return;

        if (Array.isArray(rolesArr)) {
          setRoles(rolesArr);
          setActiveRole((prev) => prev ?? rolesArr[0] ?? null);
        }

        if (Array.isArray(skillsArr)) {
          setSkills(skillsArr);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching roles and skills:", error);
      }
    })();

    // Cleanup function --> in case user logs out while fetching/re-render etc
    return () => {
      cancelled = true;
    };
  }, [token, user?.user_id, roles?.length, skills?.length]);

  useEffect(() => {
    console.log("roles now:", roles);
    console.log("activeRole now:", activeRole);
  }, [roles, activeRole]);

  const loginProcess = async ({
    email,
    password,
    skipEmployerLookup = false,
  }) => {
    const login = await loginUser({ email, password, skipEmployerLookup });

    const accessToken = login?.access_token ?? null;
    setToken(accessToken);

    let me = null;
    if (accessToken) {
      try {
        // dashboardApi signature: getUserProfile(token)
        me = await getUserProfile(accessToken);
      } catch {
        me = null;
      }
    }

    const obtainedUserId = me?.user_id ?? null;

    let employer = null;
    if (obtainedUserId && accessToken) {
      try {
        const fetchedRoles = await getRolesForUser({
          token: accessToken,
        });

        const rolesArr = Array.isArray(fetchedRoles) ? fetchedRoles : [];
        setRoles(rolesArr);
        setActiveRole((prev) => prev ?? rolesArr[0] ?? null);

        if (!skipEmployerLookup && rolesArr.includes("employer")) {
          const employmentDetails = await getEmployerFromUser({
            token: accessToken,
          });
          employer = employmentDetails ?? null;
        }
      } catch {
        employer = null;
      }
    }

    setUser((prev) => ({
      ...(prev ?? {}),
      user_id: obtainedUserId,
      user_name: me?.user_name,
      email: me?.email ?? email,
      dob: me?.dob ?? null,
      employer_id: employer?.employer_id ?? prev?.employer_id ?? null,
      member_role: employer?.member_role ?? prev?.member_role ?? null,
    }));

    return { accessToken, me, employer };
  };

  const registerProcess = async (payload) => {
    // Backend expects: name, email, date_of_birth, password
    const userPayload = payload.user;
    // If some UI code accidentally sends `user_name`, map it to `name`.
    const registerPayload =
      userPayload?.name != null
        ? userPayload
        : { ...userPayload, name: userPayload?.user_name };
    const selectedRoles = Array.isArray(payload?.roles) ? payload.roles : [];
    const selectedSkills = Array.isArray(payload?.skills) ? payload.skills : [];

    const registerNew = await registerNewUser(registerPayload);

    const newUserId = registerNew?.user_id ?? null;

    // Login immediately to get a JWT for subsequent role/skill/employer calls
    let accessToken = null;

    if (newUserId) {
      const loginRes = await loginProcess({
        email: registerPayload.email,
        password: registerPayload.password,
        skipEmployerLookup: true,
      });

      accessToken = loginRes?.accessToken ?? null;
    }

    if (newUserId && selectedRoles.length) {
      try {
        for (const roleName of selectedRoles) {
          if (accessToken) {
            await assignUserRole({
              userId: newUserId,
              roleName,
              token: accessToken,
            });
          }
        }
      } catch (err) {
        const msg =
          err?.message ??
          "Role assignment failed. Please try logging out and logging back in.";
        throw new Error(msg);
      }
    }

    // 3b) Assign skills (requires JWT)
    if (newUserId && selectedSkills.length) {
      try {
        for (const skillName of selectedSkills) {
          if (accessToken) {
            await assignUserSkill({
              userId: newUserId,
              skillName,
              token: accessToken,
            });
          }
        }
      } catch (err) {
        const msg = err?.message ?? "Skill assignment failed.";
        throw new Error(msg);
      }
    }

    setUser((prev) => ({
      ...(prev ?? {}),
      user_id: newUserId,
    }));

    if (newUserId && accessToken) {
      const fetchedRoles = await getRolesForUser({
        userId: newUserId,
        token: accessToken,
      });
      if (Array.isArray(fetchedRoles)) {
        setRoles(fetchedRoles);
        setActiveRole((prev) => prev ?? fetchedRoles[0] ?? null);
      }

      const fetchedSkills = await getSkillsForUser({
        token: accessToken,
      });
      if (Array.isArray(fetchedSkills)) {
        setSkills(fetchedSkills);
      }
    }

    // IF GOT EMPLOYER
    if (payload.employer?.employer_name && accessToken) {
      const employerRes = await createEmployer({
        token: accessToken,
        employer_name: payload.employer.employer_name,
        description: payload.employer.description ?? null,
        website: payload.employer.website ?? null,
        email: payload.employer.email ?? registerPayload.email,
        phone: payload.employer.phone ?? null,
      });

      const employerId = employerRes?.employer?.employer_id;
      const memberRole = payload.employer.member_role ?? "member";

      if (employerId) {
        await createEmployerMember({
          token: accessToken,
          employerId,
          memberRole,
        });

        // Persist employer_id so EmployerPage can default it automatically.
        setUser((prev) => ({
          ...(prev ?? {}),
          employer_id: prev?.employer_id ?? employerId,
          member_role: payload.employer.member_role ?? "member",
        }));
      }
    }

    return { userId: newUserId, accessToken };
  };

  function logout() {
    setToken(null);
    setUser(null);
    setRoles([]);
    setSkills([]);
    setActiveRole(null);
    navigate("/");
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        roles,
        skills,
        activeRole,
        setActiveRole,
        loading,
        isAuthenticated,
        loginProcess,
        registerProcess,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
