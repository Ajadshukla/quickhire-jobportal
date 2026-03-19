import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { LogOut, Menu, Moon, Sun, User2, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import axios from "axios"; // Import axios
import { setUser } from "@/redux/authSlice";
import { USER_API_ENDPOINT } from "@/utils/data";
import { persistor } from "@/redux/store";
import AnnouncementStrip from "./AnnouncementStrip";

const normalizeProfileImageUrl = (url) => {
  const value = String(url || "").trim();
  if (!value) return "";
  if (value.startsWith("http://")) return `https://${value.slice(7)}`;
  return value;
};

const Navbar = () => {
  const { user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [theme, setTheme] = useState("light");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userInitials = String(user?.fullname || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const navItems =
    user && user.role === "Admin"
      ? [
          { label: "Feed", to: "/feed" },
          { label: "Owner", to: "/owner/dashboard" },
          { label: "Announcements", to: "/owner/announcements" },
        ]
      : user && user.role === "Recruiter"
      ? [
          { label: "Feed", to: "/feed" },
          { label: "Companies", to: "/admin/companies" },
          { label: "Jobs", to: "/admin/jobs" },
        ]
      : [
          { label: "Home", to: "/Home" },
          { label: "Feed", to: "/feed" },
          { label: "Browse", to: "/Browse" },
          { label: "Jobs", to: "/Jobs" },
          ...(user && user.role === "Student"
            ? [
                { label: "Announcements", to: "/announcements" },
                { label: "Preparation", to: "/Preparation" },
                { label: "Resume Analyzer", to: "/resume-analyzer" },
              ]
            : []),
        ];

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
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex min-h-20 items-center justify-between py-3 md:h-20 md:py-0">
          <div className="min-w-0">
          <Link to="/Home" className="inline-block">
            <h1 className="qh-display text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 truncate">
              <span className="text-[#0f766e]">Quick</span>
              <span className="text-[#b45309]">Hire</span>
              <span className="text-slate-900 dark:text-slate-100"> Job Portal</span>
            </h1>
            <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 tracking-[0.2em] uppercase">
              Student and Recruiter Hub
            </p>
          </Link>
          </div>
          <div className="flex items-center gap-2 md:gap-6">
            <ul className="hidden md:flex font-semibold items-center gap-5 text-slate-700 dark:text-slate-300 tracking-wide">
              {navItems.map((item) => (
                <li key={item.to}>
                  <Link className="hover:text-slate-900 dark:hover:text-white transition-colors" to={item.to}>
                    {item.label}
                  </Link>
                </li>
              ))}
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
              <div className="hidden md:flex items-center gap-2">
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
                  <Avatar className="hidden md:flex cursor-pointer">
                    <AvatarImage
                      src={normalizeProfileImageUrl(user?.profile?.profilePhoto)}
                      alt="@shadcn"
                    />
                    <AvatarFallback className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100 font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="flex items-center gap-4 space-y-2">
                    <Avatar className="cursor-pointer">
                      <AvatarImage
                        src={normalizeProfileImageUrl(user?.profile?.profilePhoto)}
                        alt="@shadcn"
                      />
                      <AvatarFallback className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100 font-semibold">
                        {userInitials}
                      </AvatarFallback>
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
                          <Link to={"/Profile"}> Profile</Link>
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

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="md:hidden border-slate-300 dark:border-slate-700"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 pt-1">
            <div className="qh-panel p-3 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={closeMobileMenu}
                  className="block rounded-lg px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {item.label}
                </Link>
              ))}

              {!user ? (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Link to={"/login"} onClick={closeMobileMenu}>
                    <Button variant="outline" className="w-full border-slate-300 dark:border-slate-700">
                      Login
                    </Button>
                  </Link>
                  <Link to={"/register"} onClick={closeMobileMenu}>
                    <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white">Register</Button>
                  </Link>
                </div>
              ) : (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={normalizeProfileImageUrl(user?.profile?.profilePhoto)} alt="profile" />
                      <AvatarFallback className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100 font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {user?.fullname}
                    </span>
                  </div>

                  {user.role === "Student" && (
                    <Link to={"/Profile"} onClick={closeMobileMenu}>
                      <Button variant="outline" className="w-full justify-start border-slate-300 dark:border-slate-700">
                        <User2 className="h-4 w-4 mr-2" /> Profile
                      </Button>
                    </Link>
                  )}

                  <Button
                    onClick={async () => {
                      closeMobileMenu();
                      await logoutHandler();
                    }}
                    variant="outline"
                    className="w-full justify-start border-slate-300 dark:border-slate-700"
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <AnnouncementStrip />
    </div>
  );
};

export default Navbar;
