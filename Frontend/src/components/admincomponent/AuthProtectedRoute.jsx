import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const AuthProtectedRoute = ({ children, requiredRole }) => {
  const { user, authChecked } = useSelector((store) => store.auth);

  if (!authChecked) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && String(user.role || "").toLowerCase() !== String(requiredRole).toLowerCase()) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AuthProtectedRoute;
