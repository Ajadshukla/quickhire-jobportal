import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import { USER_API_ENDPOINT } from "@/utils/data";
import { setUser } from "@/redux/authSlice";
import { Loader2 } from "lucide-react";

const EditProfileModal = ({ open, setOpen }) => {
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerificationToken, setEmailVerificationToken] = useState("");
  const { user } = useSelector((store) => store.auth);

  const [input, setInput] = useState({
    fullname: user?.fullname, // Corrected from fullnamename to fullname
    email: user?.email,
    phoneNumber: user?.phoneNumber,
    bio: user?.profile?.bio,
    skills: user?.profile?.skills?.map((skill) => skill),
    file: user?.profile?.resume,
  });
  const dispatch = useDispatch();

  const normalizedOriginalEmail = String(user?.email || "").trim().toLowerCase();
  const normalizedCurrentEmail = String(input.email || "").trim().toLowerCase();
  const hasEmailChanged = Boolean(normalizedCurrentEmail) && normalizedCurrentEmail !== normalizedOriginalEmail;

  const changeEventHandler = (e) => {
    if (e.target.name === "email") {
      setOtpCode("");
      setOtpSent(false);
      setEmailVerified(false);
      setEmailVerificationToken("");
    }
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const sendEmailOtpHandler = async () => {
    const email = String(input.email || "").trim().toLowerCase();
    if (!email) {
      toast.error("Enter email first.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Enter a valid email address.");
      return;
    }

    try {
      setOtpSending(true);
      const res = await axios.post(
        `${USER_API_ENDPOINT}/email-otp/send`,
        { email, purpose: "update_email" },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data?.success) {
        setOtpSent(true);
        setEmailVerified(false);
        setEmailVerificationToken("");
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to send OTP");
    } finally {
      setOtpSending(false);
    }
  };

  const verifyEmailOtpHandler = async () => {
    const email = String(input.email || "").trim().toLowerCase();
    const otp = String(otpCode || "").trim();

    if (!email || !otp) {
      toast.error("Enter email and OTP.");
      return;
    }

    try {
      setOtpVerifying(true);
      const res = await axios.post(
        `${USER_API_ENDPOINT}/email-otp/verify`,
        { email, otp, purpose: "update_email" },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data?.success) {
        setEmailVerified(true);
        setEmailVerificationToken(res.data.verificationToken || "");
        setInput((prev) => ({
          ...prev,
          email: res.data.normalizedEmail || prev.email,
        }));
        toast.success(res.data.message);
      }
    } catch (error) {
      setEmailVerified(false);
      setEmailVerificationToken("");
      toast.error(error.response?.data?.message || "OTP verification failed");
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleFileChange = async (e) => {
    e.preventDefault();

    if (hasEmailChanged && (!emailVerified || !emailVerificationToken)) {
      toast.error("Please verify the new email with OTP before saving.");
      return;
    }

    const formData = new FormData();
    formData.append("fullname", input.fullname);
    formData.append("email", input.email);
    formData.append("phoneNumber", input.phoneNumber);
    formData.append("bio", input.bio);
    formData.append("skills", input.skills);
    if (hasEmailChanged) {
      formData.append("emailVerificationToken", emailVerificationToken);
    }

    if (input.file) {
      formData.append("file", input.file);
    }

    try {
      setLoading(true);
      const res = await axios.post(
        `${USER_API_ENDPOINT}/profile/update`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );
      if (res.data.success) {
        // dispatch(setUser(res.data.user));
        dispatch(setUser({ ...res.data.user, skills: input.skills }));
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.data.message);
    } finally {
      setLoading(false);
    }
    setOpen(false);

    console.log(input);
  };

  const FileChangehandler = (e) => {
    const file = e.target.files?.[0];
    setInput({ ...input, file });
  };

  return (
    <div>
      <Dialog open={open}>
        <DialogContent
          className="sm:max-w-[500px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
          onInteractOutside={() => setOpen(false)}
        >
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          {/* Form for editing profile */}
          <form onSubmit={handleFileChange}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <input
                  type="text"
                  id="name"
                  value={input.fullname}
                  name="fullname"
                  onChange={changeEventHandler}
                  className="col-span-3 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md p-2"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <div className="col-span-3">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      id="email"
                      value={input.email}
                      name="email"
                      onChange={changeEventHandler}
                      className="flex-1 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md p-2"
                    />
                    {hasEmailChanged && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={sendEmailOtpHandler}
                        disabled={otpSending}
                      >
                        {otpSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send OTP"}
                      </Button>
                    )}
                  </div>

                  {hasEmailChanged && otpSent && !emailVerified && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                        className="flex-1 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md p-2"
                      />
                      <Button type="button" onClick={verifyEmailOtpHandler} disabled={otpVerifying}>
                        {otpVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                      </Button>
                    </div>
                  )}

                  {hasEmailChanged && emailVerified && (
                    <p className="text-xs text-emerald-600 mt-1">New email verified</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone
                </Label>
                <input
                  type="tel"
                  id="phone"
                  value={input.phoneNumber}
                  name="phoneNumber"
                  onChange={changeEventHandler}
                  className="col-span-3 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md p-2"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bio" className="text-right">
                  Bio
                </Label>
                <input
                  type="bio"
                  id="bio"
                  value={input.bio}
                  name="bio"
                  onChange={changeEventHandler}
                  className="col-span-3 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md p-2"
                />
              </div>
              {/* skills */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="skills" className="text-right">
                  Skills
                </Label>
                <input
                  id="skills"
                  name="skills"
                  value={input.skills}
                  onChange={changeEventHandler}
                  className="col-span-3 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md p-2"
                />
              </div>
              {/* Resume file upload */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="file" className="text-right">
                  File
                </Label>
                <div className="col-span-3">
                  <input
                    type="file"
                    id="file"
                    name="file"
                    accept="application/pdf,image/*"
                    onChange={FileChangehandler}
                    className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md p-2"
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Upload image to update profile photo, or upload PDF to update resume.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              {loading ? (
                <Button className="w-full my-4">
                  {" "}
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait{" "}
                </Button>
              ) : (
                <Button type="submit" className="w-full my-4">
                  Save
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditProfileModal;
