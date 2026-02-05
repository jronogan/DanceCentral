import { useState } from "react";
import "./App.css";
import { Navigate, Route, Routes } from "react-router-dom";
import Homepage from "./components/Homepage";
import Login from "./components/Login";
import Registration from "./components/Registration";
import { useAuth } from "./state/AuthContext.jsx";
import DancerPage from "./components/DancerPage.jsx";
import ChoreographerPage from "./components/ChoreographerPage.jsx";
import EmployerPage from "./components/EmployerPage.jsx";

function App() {
  const { user, logout } = useAuth();

  return (
    <>
      <h1>This is the App</h1>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {user ? (
          <>
            <span>Signed in as: {user.email ?? "User"}</span>
            <button type="button" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <span>Not signed in</span>
        )}
      </div>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Registration />} />
        <Route path="/dancer" element={<DancerPage />} />
        <Route path="/choreographer" element={<ChoreographerPage />} />
        <Route path="/employer" element={<EmployerPage />} />
        <Route path="/*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
