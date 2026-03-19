import React, { useEffect } from "react";
import Login from "./components/authentication/Login";
import Register from "./components/authentication/Register";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./components/components_lite/Home";
import PrivacyNotice from "./components/components_lite/PrivacyNotice.jsx";
import TermsofService from "./components/components_lite/TermsofService.jsx";
import Jobs from "./components/components_lite/Jobs.jsx";
import Browse from "./components/components_lite/Browse.jsx";
import Profile from "./components/components_lite/Profile.jsx";
import ResumeAnalyzer from "./components/components_lite/ResumeAnalyzer.jsx";
import Preparation from "./components/components_lite/Preparation.jsx";
import StudentAnnouncements from "./components/components_lite/StudentAnnouncements.jsx";
import Feed from "./components/components_lite/Feed.jsx";
import Description from "./components/components_lite/Description.jsx";
import Companies from "./components/admincomponent/Companies";
import CompanyCreate from "./components/admincomponent/CompanyCreate";
import CompanySetup from "./components/admincomponent/CompanySetup";
import AdminJobs from "./components/admincomponent/AdminJobs.jsx";
import PostJob from "./components/admincomponent/PostJob";
import Applicants from "./components/admincomponent/Applicants";
import OwnerDashboard from "./components/admincomponent/OwnerDashboard";
import OwnerAnnouncements from "./components/admincomponent/OwnerAnnouncements";
import ProtectedRoute from "./components/admincomponent/ProtectedRoute";
import AuthProtectedRoute from "./components/admincomponent/AuthProtectedRoute";
import axios from "axios";
import { USER_API_ENDPOINT } from "./utils/data";
import { useDispatch } from "react-redux";
import { setAuthChecked, setUser } from "./redux/authSlice";

const appRouter = createBrowserRouter([
  { path: "/", element: <Home /> },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/description/:id",
    element: <Description />,
  },
  {
    path: "/Profile",
    element: (
      <AuthProtectedRoute>
        <Profile />
      </AuthProtectedRoute>
    ),
  },
  {
    path: "/Preparation",
    element: (
      <AuthProtectedRoute requiredRole="Student">
        <Preparation />
      </AuthProtectedRoute>
    ),
  },
  {
    path: "/resume-analyzer",
    element: (
      <AuthProtectedRoute requiredRole="Student">
        <ResumeAnalyzer />
      </AuthProtectedRoute>
    ),
  },
  {
    path: "/announcements",
    element: (
      <AuthProtectedRoute requiredRole="Student">
        <StudentAnnouncements />
      </AuthProtectedRoute>
    ),
  },
  {
    path: "/feed",
    element: <Feed />,
  },
  {
    path: "/PrivacyPolicy",
    element: <PrivacyNotice />,
  },
  {
    path: "/TermsofService",
    element: <TermsofService />,
  },
  {
    path: "/Jobs",
    element: <Jobs />,
  },
  {
    path: "/Home",
    element: <Home />,
  },
  {
    path: "/Browse",
    element: <Browse />,
  },
  {
    path:"/Creator",
    element: <Home/>
  },

  // /admin
  {
    path: "/admin/companies",
    element: (
      <ProtectedRoute>
        <Companies />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/companies/create",
    element: (
      <ProtectedRoute>
        <CompanyCreate />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/companies/:id",
    element: (
      <ProtectedRoute>
        <CompanySetup />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/jobs",
    element: (
      <ProtectedRoute>
        {" "}
        <AdminJobs />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/jobs/create",
    element: (
      <ProtectedRoute>
        {" "}
        <PostJob />{" "}
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/jobs/:id/applicants",
    element: (
      <ProtectedRoute>
        <Applicants />
      </ProtectedRoute>
    ),
  },
  {
    path: "/owner/dashboard",
    element: (
      <AuthProtectedRoute requiredRole="Admin">
        <OwnerDashboard />
      </AuthProtectedRoute>
    ),
  },
  {
    path: "/owner/announcements",
    element: (
      <AuthProtectedRoute requiredRole="Admin">
        <OwnerAnnouncements />
      </AuthProtectedRoute>
    ),
  },
]);

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const res = await axios.get(`${USER_API_ENDPOINT}/me`, {
          withCredentials: true,
        });
        if (res.data?.success) {
          dispatch(setUser(res.data.user));
        } else {
          dispatch(setUser(null));
        }
      } catch {
        dispatch(setUser(null));
      } finally {
        dispatch(setAuthChecked(true));
      }
    };

    bootstrapAuth();
  }, [dispatch]);

  return (
    <div>
      <RouterProvider router={appRouter}></RouterProvider>
    </div>
  );
}

export default App;
