import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./index.css";
import App from "./App.jsx";
import { Toaster } from "./components/ui/sonner";
import { Provider } from "react-redux";
import AppErrorBoundary from "./components/components_lite/AppErrorBoundary";

import store from "./redux/store";

const initializeTheme = () => {
  if (typeof window === "undefined") return;
  const savedTheme = localStorage.getItem("quickhire-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const effectiveTheme = savedTheme || (prefersDark ? "dark" : "light");
  document.documentElement.classList.toggle("dark", effectiveTheme === "dark");
};

initializeTheme();

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const isGoogleConfigured =
  Boolean(googleClientId) && !googleClientId.toLowerCase().includes("replace_with");

const appTree = (
  <AppErrorBoundary>
    <Provider store={store}>
      <App />
      <Toaster />
    </Provider>
  </AppErrorBoundary>
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {googleClientId ? (
      isGoogleConfigured ? (
        <GoogleOAuthProvider clientId={googleClientId}>{appTree}</GoogleOAuthProvider>
      ) : (
        appTree
      )
    ) : (
      appTree
    )}
  </StrictMode>
);
