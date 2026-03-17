import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = ({ children }) => {
  const { user, authChecked } = useSelector((store) => store.auth);

  if (!authChecked) {
    return null;
  }

  if (!user || String(user.role || "") !== "Recruiter") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
