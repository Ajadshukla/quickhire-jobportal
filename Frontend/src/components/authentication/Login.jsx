import React, { useEffect, useState } from "react";
import Navbar from "../components_lite/Navbar";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useNavigate } from "react-router-dom";
import { RadioGroup } from "../ui/radio-group";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { USER_API_ENDPOINT } from "@/utils/data.js";
import { useDispatch, useSelector } from "react-redux";
import { setLoading, setUser } from "@/redux/authSlice";
import { GoogleLogin } from "@react-oauth/google";
import { Button } from "../ui/button";

const Login = () => {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  const isGoogleEnabled =
    Boolean(googleClientId) && !googleClientId.toLowerCase().includes("replace_with");
  const [input, setInput] = useState({
    email: "",
    password: "", 
    role: "",
  });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, user } = useSelector((store) => store.auth);
  const changeEventHandler = (e) => {
    const { name, value } = e.target;
    setInput({ ...input, [name]: value });
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateLogin = () => {
    const nextErrors = {};

    if (!String(input.email || "").trim()) {
      nextErrors.email = "Email is required";
    }
    if (!String(input.password || "").trim()) {
      nextErrors.password = "Password is required";
    }
    if (!String(input.role || "").trim()) {
      nextErrors.role = "Please select a role";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!validateLogin()) {
      toast.error("Please fill all required fields.");
      return;
    }

    const toastId = toast.loading("Signing in...");

    try {
      dispatch(setLoading(true)); // Start loading
      const res = await axios.post(`${USER_API_ENDPOINT}/login`, input, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setUser(res.data.user));
        navigate("/");
        toast.success(res.data.message, { id: toastId });
      }
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";
      toast.error(message, { id: toastId });
    } finally {
      dispatch(setLoading(false)); // End loading
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!input.role) {
      setErrors((prev) => ({ ...prev, role: "Please select a role" }));
      toast.error("Please select role before Google sign in.");
      return;
    }

    const toastId = toast.loading("Signing in with Google...");

    try {
      dispatch(setLoading(true));
      const res = await axios.post(
        `${USER_API_ENDPOINT}/google`,
        {
          credential: credentialResponse.credential,
          role: input.role,
        },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      if (res.data.success) {
        dispatch(setUser(res.data.user));
        toast.success(res.data.message, { id: toastId });
        navigate("/");
      }
    } catch (error) {
      const message = error.response?.data?.message || "Google login failed";
      toast.error(message, { id: toastId });
    } finally {
      dispatch(setLoading(false));
    }
  };

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  return (
    <div className="qh-page">
      <Navbar></Navbar>
      <div className="qh-shell flex items-center justify-center py-10">
        <form
          onSubmit={submitHandler}
          className="w-full max-w-xl qh-panel"
        >
          <h1 className="qh-title mb-5 text-center text-slate-900">
            Login
          </h1>
          <div className="my-3">
            <Label>Email</Label>
            <Input
              type="email"
              value={input.email}
              name="email"
              onChange={changeEventHandler}
              placeholder="johndoe@gmail.com"
              className={errors.email ? "border-red-500 focus-visible:ring-red-200" : ""}
            ></Input>
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>
          <div className="my-3">
            <Label>Password</Label>
            <Input
              type="password"
              value={input.password}
              name="password"
              onChange={changeEventHandler}
              placeholder="********"
              className={errors.password ? "border-red-500 focus-visible:ring-red-200" : ""}
            ></Input>
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
          </div>
           

          <div className={`flex items-center justify-between qh-panel p-3 ${errors.role ? "border border-red-400" : ""}`}>
            <RadioGroup className="flex items-center gap-4 my-5 ">
              <div className="flex items-center space-x-2">
                <Input
                  type="radio"
                  name="role"
                  value="Student"
                  checked={input.role === "Student"}
                  onChange={changeEventHandler}
                  className="cursor-pointer"
                />
                <Label htmlFor="r1">Student</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  type="radio"
                  name="role"
                  value="Recruiter"
                  checked={input.role === "Recruiter"}
                  onChange={changeEventHandler}
                  className="cursor-pointer"
                />
                <Label htmlFor="r2">Recruiter</Label>
              </div>
            </RadioGroup>
          </div>
          {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role}</p>}

          {loading ? (
            <div className="flex items-center justify-center my-10">
              <div className="spinner-border text-blue-600" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          ) : (
            <Button
              type="submit"
              className="w-full mt-4"
            >
              Login
            </Button>
          )}

          {isGoogleEnabled && (
            <div className="flex justify-center my-3">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error("Google sign in failed")}
                text="continue_with"
                shape="pill"
              />
            </div>
          )}
          {!isGoogleEnabled && (
            <p className="text-xs text-gray-500 dark:text-slate-400 text-center my-2">
              Google sign in will appear after setting VITE_GOOGLE_CLIENT_ID in Frontend/.env.
            </p>
          )}

          <div>
            <p className="text-slate-700 dark:text-slate-300 text-center my-3">
              New here?
            </p>
            <Link to="/register" className="block">
              <Button variant="outline" className="w-full">Register</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
