import React, { useEffect, useState } from "react";
import Navbar from "../components_lite/Navbar";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { RadioGroup } from "../ui/radio-group";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { USER_API_ENDPOINT } from "@/utils/data";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { setLoading, setUser } from "@/redux/authSlice";
import { GoogleLogin } from "@react-oauth/google";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";

const Register = () => {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  const isGoogleEnabled =
    Boolean(googleClientId) && !googleClientId.toLowerCase().includes("replace_with");
  const [input, setInput] = useState({
    fullname: "",
    email: "",
    password: "",
    role: "",
    phoneNumber: "",
    pancard: "",
    adharcard: "",
    file: "",
  });
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [emailVerificationToken, setEmailVerificationToken] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();

  const dispatch = useDispatch();

  const { loading } = useSelector((store) => store.auth);
  const changeEventHandler = (e) => {
    const { name, value } = e.target;
    if (name === "email") {
      setOtpSent(false);
      setEmailOtpVerified(false);
      setOtpCode("");
      setEmailVerificationToken("");
    }
    setInput({ ...input, [name]: value });
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };
  const ChangeFilehandler = (e) => {
    setInput({ ...input, file: e.target.files?.[0] });
  };

  const validateRegister = () => {
    const nextErrors = {};

    if (!String(input.fullname || "").trim()) nextErrors.fullname = "Full name is required";
    if (!String(input.email || "").trim()) {
      nextErrors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(String(input.email).trim())) {
      nextErrors.email = "Enter a valid email address";
    }
    if (!String(input.password || "").trim()) nextErrors.password = "Password is required";
    if (!String(input.phoneNumber || "").trim()) {
      nextErrors.phoneNumber = "Phone number is required";
    } else if (!/^\+?[1-9]\d{7,14}$|^\d{10}$/.test(String(input.phoneNumber).trim())) {
      nextErrors.phoneNumber = "Enter a valid phone number";
    }
    if (!emailOtpVerified || !emailVerificationToken) {
      nextErrors.emailOtp = "Please verify email with OTP";
    }
    if (!String(input.role || "").trim()) nextErrors.role = "Please select a role";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const sendOtpHandler = async () => {
    const email = String(input.email || "").trim();
    if (!email) {
      setErrors((prev) => ({ ...prev, email: "Email is required" }));
      toast.error("Enter email first.");
      return;
    }

    try {
      setOtpSending(true);
      const res = await axios.post(
        `${USER_API_ENDPOINT}/email-otp/send`,
        { email, purpose: "register" },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data?.success) {
        setOtpSent(true);
        setEmailOtpVerified(false);
        setEmailVerificationToken("");
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to send OTP");
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtpHandler = async () => {
    const email = String(input.email || "").trim();
    const otp = String(otpCode || "").trim();

    if (!email || !otp) {
      toast.error("Enter email and OTP.");
      return;
    }

    try {
      setOtpVerifying(true);
      const res = await axios.post(
        `${USER_API_ENDPOINT}/email-otp/verify`,
        { email, otp, purpose: "register" },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data?.success) {
        setEmailOtpVerified(true);
        setEmailVerificationToken(res.data.verificationToken || "");
        setErrors((prev) => ({ ...prev, emailOtp: "", email: "" }));
        setInput((prev) => ({ ...prev, email: res.data.normalizedEmail || prev.email }));
        toast.success(res.data.message);
      }
    } catch (error) {
      setEmailOtpVerified(false);
      setEmailVerificationToken("");
      toast.error(error.response?.data?.message || "OTP verification failed");
    } finally {
      setOtpVerifying(false);
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!validateRegister()) {
      toast.error("Please fill all required fields correctly.");
      return;
    }

    const formData = new FormData();
    formData.append("fullname", input.fullname);
    formData.append("email", input.email);
    formData.append("password", input.password);
    formData.append("pancard", input.pancard);
    formData.append("adharcard", input.adharcard);
    formData.append("role", input.role);
    formData.append("phoneNumber", input.phoneNumber);
    formData.append("emailVerificationToken", emailVerificationToken);
    if (input.file) {
      formData.append("file", input.file);
    }
    const toastId = toast.loading("Creating your account...");
    try {
      dispatch(setLoading(true));
      const res = await axios.post(`${USER_API_ENDPOINT}/register`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      if (res.data.success) {
        navigate("/login");
        toast.success(res.data.message, { id: toastId });
      }
    } catch (error) {
      const errorMessage = error.response
        ? error.response.data.message
        : "An unexpected error occurred.";
      toast.error(errorMessage, { id: toastId });
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!input.role) {
      setErrors((prev) => ({ ...prev, role: "Please select a role" }));
      toast.error("Please select role before Google sign up.");
      return;
    }

    if (!String(input.phoneNumber || "").trim()) {
      setErrors((prev) => ({ ...prev, phoneNumber: "Phone number is required" }));
      toast.error("Phone number is required for Google sign up.");
      return;
    }

    const toastId = toast.loading("Signing up with Google...");

    try {
      dispatch(setLoading(true));
      const res = await axios.post(
        `${USER_API_ENDPOINT}/google`,
        {
          credential: credentialResponse.credential,
          role: input.role,
          phoneNumber: input.phoneNumber,
        },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      if (res.data.success) {
        let resolvedUser = res.data.user;

        // Optional: if user selected a custom photo, upload it after Google auth.
        if (input.file) {
          const profileFormData = new FormData();
          profileFormData.append("file", input.file);

          const profileRes = await axios.post(
            `${USER_API_ENDPOINT}/profile/update`,
            profileFormData,
            {
              headers: { "Content-Type": "multipart/form-data" },
              withCredentials: true,
            }
          );

          if (profileRes.data.success) {
            resolvedUser = profileRes.data.user;
          }
        }

        if (!resolvedUser) {
          dispatch(setUser(res.data.user));
        } else {
          dispatch(setUser(resolvedUser));
        }

        toast.success(res.data.message, { id: toastId });
        navigate("/");
      }
    } catch (error) {
      const message = error.response?.data?.message || "Google sign up failed";
      toast.error(message, { id: toastId });
    } finally {
      dispatch(setLoading(false));
    }
  };

  const { user } = useSelector((store) => store.auth);
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
          className="w-full max-w-2xl qh-panel"
        >
          <h1 className="qh-title mb-5 text-center text-slate-900">
            Register
          </h1>
          <div className="my-3">
            <Label>Fullname</Label>
            <Input
              type="text"
              value={input.fullname}
              name="fullname"
              onChange={changeEventHandler}
              placeholder="John Doe"
              className={errors.fullname ? "border-red-500 focus-visible:ring-red-200" : ""}
            ></Input>
            {errors.fullname && <p className="text-xs text-red-600 mt-1">{errors.fullname}</p>}
          </div>
          <div className="my-3">
            <Label>Email</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={input.email}
                name="email"
                onChange={changeEventHandler}
                placeholder="johndoe@gmail.com"
                className={errors.email ? "border-red-500 focus-visible:ring-red-200" : ""}
              ></Input>
              <Button type="button" variant="outline" onClick={sendOtpHandler} disabled={otpSending}>
                {otpSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send OTP"}
              </Button>
            </div>
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
            {otpSent && !emailOtpVerified && (
              <div className="mt-2 flex gap-2">
                <Input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                />
                <Button type="button" onClick={verifyOtpHandler} disabled={otpVerifying}>
                  {otpVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                </Button>
              </div>
            )}
            {emailOtpVerified && <p className="text-xs text-emerald-600 mt-1">Email verified</p>}
            {errors.emailOtp && <p className="text-xs text-red-600 mt-1">{errors.emailOtp}</p>}
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
          <div>
            <Label>PAN Card Number (Optional)</Label>
            <Input
              type="text"
              value={input.pancard}
              name="pancard"
              onChange={changeEventHandler}
              placeholder="ABCDEF1234G"
            ></Input>
          </div>
          <div>
            <Label>Adhar Card Number (Optional)</Label>
            <Input
              type="text"
              value={input.adharcard}
              name="adharcard"
              onChange={changeEventHandler}
              placeholder="123456789012"
            ></Input>
          </div>
          <div className="my-2">
            <Label>Phone Number</Label>
            <Input
              type="tel"
              value={input.phoneNumber}
              name="phoneNumber"
              onChange={changeEventHandler}
              placeholder="+919876543210"
              className={errors.phoneNumber ? "border-red-500 focus-visible:ring-red-200" : ""}
            ></Input>
            {errors.phoneNumber && <p className="text-xs text-red-600 mt-1">{errors.phoneNumber}</p>}
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
          <div className="flex items-center gap-2">
            <Label>Profile Photo (Optional)</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={ChangeFilehandler}
              className="cursor-pointer"
            />
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
              Register
            </Button>
          )}

          {isGoogleEnabled && (
            <div className="flex justify-center my-3">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error("Google sign up failed")}
                text="continue_with"
                shape="pill"
              />
            </div>
          )}
          {!isGoogleEnabled && (
            <p className="text-xs text-gray-500 dark:text-slate-400 text-center my-2">
              Google sign up will appear after setting VITE_GOOGLE_CLIENT_ID in Frontend/.env.
            </p>
          )}

          <p className="text-slate-600 dark:text-slate-300 text-md my-3">
            Already have an account?{" "}
            <Link to="/login" className="text-teal-700 font-semibold">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
