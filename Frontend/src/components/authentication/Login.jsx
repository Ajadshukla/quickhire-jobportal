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
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, user } = useSelector((store) => store.auth);
  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    try {
      dispatch(setLoading(true)); // Start loading
      const res = await axios.post(`${USER_API_ENDPOINT}/login`, input, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setUser(res.data.user));
        navigate("/");
        toast.success(res.data.message);
      }
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";
      toast.error(message);
    } finally {
      dispatch(setLoading(false)); // End loading
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!input.role) {
      toast.error("Please select role before Google sign in.");
      return;
    }

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
        toast.success(res.data.message);
        navigate("/");
      }
    } catch (error) {
      const message = error.response?.data?.message || "Google login failed";
      toast.error(message);
    } finally {
      dispatch(setLoading(false));
    }
  };

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, []);

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
            ></Input>
          </div>
          <div className="my-3">
            <Label>Password</Label>
            <Input
              type="password"
              value={input.password}
              name="password"
              onChange={changeEventHandler}
              placeholder="********"
            ></Input>
          </div>
           

          <div className="flex items-center justify-between qh-panel p-3">
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
