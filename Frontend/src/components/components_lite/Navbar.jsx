import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Avatar, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { LogOut, Moon, Sun, User2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import axios from "axios"; // Import axios
import { setUser } from "@/redux/authSlice";
import { USER_API_ENDPOINT } from "@/utils/data";
import { persistor } from "@/redux/store";

const Navbar = () => {
  const { user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTheme = localStorage.getItem("quickhire-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = storedTheme || (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    setTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem("quickhire-theme", nextTheme);
  };

  const logoutHandler = async () => {
    try {
      const res = await axios.post(
        `${USER_API_ENDPOINT}/logout`,
        {},
        { withCredentials: true }
      );
      if (res && res.data && res.data.success) {
        dispatch(setUser(null));
        await persistor.purge();
        navigate("/login", { replace: true });
        toast.success(res.data.message);
      } else {
        console.error("Error logging out:", res.data);
      }
    } catch (error) {
      console.error("Axios error:", error);
      if (error.response) {
        console.error("Error response:", error.response.data);
      }
      toast.error("Error logging out. Please try again.");
    }
  };
  return (
    <div className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-950/70">
      <div className="flex items-center justify-between mx-auto max-w-7xl h-20 px-4 md:px-6">
        <div>
          <Link to="/Home" className="inline-block">
            <h1 className="qh-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              <span className="text-[#0f766e]">Quick</span>
              <span className="text-[#b45309]">Hire</span>
              <span className="text-slate-900 dark:text-slate-100"> Job Portal</span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 tracking-[0.2em] uppercase">
              Student and Recruiter Hub
            </p>
          </Link>
        </div>
        <div className="flex items-center gap-8">
          <ul className="flex font-semibold items-center gap-5 text-slate-700 dark:text-slate-300 tracking-wide">
            {user && user.role === "Recruiter" ? (
              <>
                <li>
                  <Link className="hover:text-slate-900 dark:hover:text-white transition-colors" to={"/admin/companies"}>Companies</Link>
                </li>
                <li>
                  <Link className="hover:text-slate-900 dark:hover:text-white transition-colors" to={"/admin/jobs"}>Jobs</Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link className="hover:text-slate-900 dark:hover:text-white transition-colors" to={"/Home"}>Home</Link>
                </li>
                <li>
                  <Link className="hover:text-slate-900 dark:hover:text-white transition-colors" to={"/Browse"}>Browse</Link>
                </li>
                <li>
                  <Link className="hover:text-slate-900 dark:hover:text-white transition-colors" to={"/Jobs"}>Jobs</Link>
                </li>
                {user && user.role === "Student" && (
                  <li>
                    <Link className="hover:text-slate-900 dark:hover:text-white transition-colors" to={"/Preparation"}>Preparation</Link>
                  </li>
                )}
              </>
            )}
          </ul>

          <Button
            onClick={toggleTheme}
            variant="outline"
            size="icon"
            className="border-slate-300 dark:border-slate-700"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {!user ? (
            <div className=" flex items-center gap-2">
              <Link to={"/login"}>
                <Button variant="outline" className="border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">Login</Button>
              </Link>
              <Link to={"/register"}>
                <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                  Register
                </Button>
              </Link>
            </div>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Avatar className="cursor-pointer">
                  <AvatarImage
                    src={user?.profile?.profilePhoto}
                    alt="@shadcn"
                  />
                </Avatar>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="flex items-center gap-4 space-y-2">
                  <Avatar className="cursor-pointer">
                    <AvatarImage
                      src={user?.profile?.profilePhoto}
                      alt="@shadcn"
                    />
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{user?.fullname}</h3>
                    <p className="text-sm text-muted-foreground">
                      {user?.profile?.bio}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col my-2 text-gray-600 dark:text-slate-300">
                  {user && user.role === "Student" && (
                    <div className="flex w-fit items-center gap-2 cursor-pointer">
                      <User2></User2>
                      <Button variant="link">
                        {" "}
                        <Link to={"/Profile"}> Profile</Link>{" "}
                      </Button>
                    </div>
                  )}

                  <div className="flex w-fit items-center gap-2 cursor-pointer">
                    <LogOut></LogOut>
                    <Button onClick={logoutHandler} variant="link">
                      Logout
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
