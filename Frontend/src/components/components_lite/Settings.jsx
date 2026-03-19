import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import Navbar from "./Navbar";
import { Button } from "../ui/button";
import { setUser } from "@/redux/authSlice";
import { USER_API_ENDPOINT } from "@/utils/data";
import { persistor } from "@/redux/store";

const ToggleRow = ({ title, subtitle, checked, onChange }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
    <div>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative h-6 w-12 rounded-full transition ${checked ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-600"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? "left-6" : "left-0.5"}`}
      />
    </button>
  </div>
);

const parseCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const Settings = () => {
  const { user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const role = String(user?.role || "");
  const isStudent = role === "Student";
  const isRecruiter = role === "Recruiter";
  const isAdmin = role === "Admin";

  const [activeTab, setActiveTab] = useState("experience");
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [studentRolesText, setStudentRolesText] = useState("");
  const [studentLocationsText, setStudentLocationsText] = useState("");
  const [recruiterRolesText, setRecruiterRolesText] = useState("");
  const [recruiterRegionsText, setRecruiterRegionsText] = useState("");

  const tabItems = useMemo(() => {
    const base = [
      { key: "experience", label: "Experience" },
      { key: "notifications", label: "Notifications" },
    ];

    if (!isAdmin) {
      base.push({ key: "privacy", label: "Privacy" });
    }

    if (isStudent) base.push({ key: "career", label: "Career Preferences" });
    if (isRecruiter) base.push({ key: "hiring", label: "Hiring Workflow" });
    if (isAdmin) base.push({ key: "platform", label: "Platform Control" });

    base.push({ key: "security", label: "Security" });
    return base;
  }, [isStudent, isRecruiter, isAdmin]);

  useEffect(() => {
    if (!tabItems.some((item) => item.key === activeTab)) {
      setActiveTab("experience");
    }
  }, [tabItems, activeTab]);

  const notifications = settings.notifications || {};
  const privacy = settings.privacy || {};
  const preferences = settings.preferences || {};
  const jobPreferences = settings.jobPreferences || {};
  const recruiterPreferences = settings.recruiterPreferences || {};
  const adminPreferences = settings.adminPreferences || {};

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${USER_API_ENDPOINT}/settings`, {
        withCredentials: true,
      });

      if (res.data?.success) {
        const next = res.data.settings || {};
        setSettings(next);
        setStudentRolesText((next?.jobPreferences?.preferredRoles || []).join(", "));
        setStudentLocationsText((next?.jobPreferences?.preferredLocations || []).join(", "));
        setRecruiterRolesText((next?.recruiterPreferences?.focusHiringFor || []).join(", "));
        setRecruiterRegionsText((next?.recruiterPreferences?.preferredWorkRegions || []).join(", "));
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const applyThemePreference = (nextSettings) => {
    const theme = String(nextSettings?.preferences?.theme || "system").toLowerCase();
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const effectiveDark = theme === "dark" || (theme === "system" && prefersDark);

    document.documentElement.classList.toggle("dark", effectiveDark);
    localStorage.setItem("quickhire-theme", effectiveDark ? "dark" : "light");
  };

  const saveSettings = async (message = "Settings saved") => {
    setSaving(true);
    try {
      const payload = {
        ...settings,
        ...(isStudent
          ? {
              jobPreferences: {
                ...jobPreferences,
                preferredRoles: parseCsv(studentRolesText),
                preferredLocations: parseCsv(studentLocationsText),
              },
            }
          : {}),
        ...(isRecruiter
          ? {
              recruiterPreferences: {
                ...recruiterPreferences,
                focusHiringFor: parseCsv(recruiterRolesText),
                preferredWorkRegions: parseCsv(recruiterRegionsText),
              },
            }
          : {}),
      };

      const res = await axios.put(
        `${USER_API_ENDPOINT}/settings`,
        { settings: payload },
        { withCredentials: true }
      );

      if (res.data?.success) {
        const nextSettings = res.data.settings || payload;
        setSettings(nextSettings);
        applyThemePreference(nextSettings);

        if (res.data.user) {
          dispatch(setUser(res.data.user));
        } else if (user) {
          dispatch(setUser({ ...user, settings: nextSettings }));
        }

        toast.success(message);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to save settings");
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    setSaving(true);
    try {
      const res = await axios.put(
        `${USER_API_ENDPOINT}/settings`,
        { resetToDefaults: true },
        { withCredentials: true }
      );

      if (res.data?.success) {
        const next = res.data.settings || {};
        setSettings(next);
        setStudentRolesText((next?.jobPreferences?.preferredRoles || []).join(", "));
        setStudentLocationsText((next?.jobPreferences?.preferredLocations || []).join(", "));
        setRecruiterRolesText((next?.recruiterPreferences?.focusHiringFor || []).join(", "));
        setRecruiterRegionsText((next?.recruiterPreferences?.preferredWorkRegions || []).join(", "));
        applyThemePreference(next);

        if (res.data.user) dispatch(setUser(res.data.user));
        toast.success("Settings reset to defaults");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to reset settings");
    } finally {
      setSaving(false);
    }
  };

  const logoutHandler = async () => {
    try {
      const res = await axios.post(`${USER_API_ENDPOINT}/logout`, {}, { withCredentials: true });
      if (res.data?.success) {
        dispatch(setUser(null));
        await persistor.purge();
        navigate("/login", { replace: true });
      }
    } catch {
      toast.error("Unable to logout");
    }
  };

  if (loading) {
    return (
      <div className="qh-page">
        <Navbar />
        <div className="qh-shell py-8">
          <div className="qh-panel text-slate-600 dark:text-slate-300">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="qh-page">
      <Navbar />
      <div className="qh-shell py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="qh-title">Settings</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Role-aware controls tuned for your workflow as {role || "user"}.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetSettings} disabled={saving}>Reset defaults</Button>
            <Button onClick={() => saveSettings()} disabled={saving}>{saving ? "Saving..." : "Save all"}</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <aside className="qh-panel lg:col-span-3">
            <div className="space-y-1">
              {tabItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                    activeTab === item.key
                      ? "bg-teal-600 text-white"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          <section className="qh-panel lg:col-span-9 space-y-4">
            {activeTab === "experience" && (
              <>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Experience</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <p className="text-sm font-semibold">Theme</p>
                    <select
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      value={preferences.theme || "system"}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          preferences: { ...(prev.preferences || {}), theme: e.target.value },
                        }))
                      }
                    >
                      <option value="system">System</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <p className="text-sm font-semibold">Timezone</p>
                    <input
                      value={preferences.timezone || "Asia/Kolkata"}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          preferences: { ...(prev.preferences || {}), timezone: e.target.value },
                        }))
                      }
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                </div>

                <ToggleRow
                  title="Compact mode"
                  subtitle="Show more information per screen for high-density usage."
                  checked={Boolean(preferences.compactMode)}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      preferences: {
                        ...(prev.preferences || {}),
                        compactMode: !Boolean(prev?.preferences?.compactMode),
                      },
                    }))
                  }
                />
              </>
            )}

            {activeTab === "notifications" && (
              <>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Notifications</h2>
                <ToggleRow
                  title={isRecruiter ? "Candidate status alerts" : "Application updates"}
                  subtitle={
                    isRecruiter
                      ? "Instant updates when candidates move between stages."
                      : "Status changes like accepted or rejected."
                  }
                  checked={Boolean(notifications.applicationUpdates)}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: {
                        ...(prev.notifications || {}),
                        applicationUpdates: !Boolean(prev?.notifications?.applicationUpdates),
                      },
                    }))
                  }
                />
                <ToggleRow
                  title="Message alerts"
                  subtitle="Realtime chat and call-related notifications."
                  checked={Boolean(notifications.messageAlerts)}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: {
                        ...(prev.notifications || {}),
                        messageAlerts: !Boolean(prev?.notifications?.messageAlerts),
                      },
                    }))
                  }
                />
                <ToggleRow
                  title="Announcement alerts"
                  subtitle="Portal policy, moderation, and release announcements."
                  checked={Boolean(notifications.announcementAlerts)}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: {
                        ...(prev.notifications || {}),
                        announcementAlerts: !Boolean(prev?.notifications?.announcementAlerts),
                      },
                    }))
                  }
                />
                <ToggleRow
                  title="Weekly digest"
                  subtitle="A concise weekly summary email."
                  checked={Boolean(notifications.weeklyDigest)}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: {
                        ...(prev.notifications || {}),
                        weeklyDigest: !Boolean(prev?.notifications?.weeklyDigest),
                      },
                    }))
                  }
                />
              </>
            )}

            {activeTab === "privacy" && (
              <>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Privacy</h2>
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-sm font-semibold">Profile visibility</p>
                  <select
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    value={privacy.profileVisibility || "recruiters"}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        privacy: { ...(prev.privacy || {}), profileVisibility: e.target.value },
                      }))
                    }
                  >
                    <option value="public">Public</option>
                    <option value="recruiters">Recruiters only</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                {isStudent && (
                  <>
                    <ToggleRow
                      title="Show email to recruiters"
                      subtitle="Allow accepted recruiters to see your email directly."
                      checked={Boolean(privacy.showEmailToRecruiters)}
                      onChange={() =>
                        setSettings((prev) => ({
                          ...prev,
                          privacy: {
                            ...(prev.privacy || {}),
                            showEmailToRecruiters: !Boolean(prev?.privacy?.showEmailToRecruiters),
                          },
                        }))
                      }
                    />
                    <ToggleRow
                      title="Show phone to recruiters"
                      subtitle="Useful for fast interview coordination after acceptance."
                      checked={Boolean(privacy.showPhoneToRecruiters)}
                      onChange={() =>
                        setSettings((prev) => ({
                          ...prev,
                          privacy: {
                            ...(prev.privacy || {}),
                            showPhoneToRecruiters: !Boolean(prev?.privacy?.showPhoneToRecruiters),
                          },
                        }))
                      }
                    />
                  </>
                )}
              </>
            )}

            {activeTab === "career" && isStudent && (
              <>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Career Preferences</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <p className="text-sm font-semibold">Target roles</p>
                    <input
                      value={studentRolesText}
                      onChange={(e) => setStudentRolesText(e.target.value)}
                      placeholder="Frontend Developer, Data Analyst"
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <p className="text-sm font-semibold">Target locations</p>
                    <input
                      value={studentLocationsText}
                      onChange={(e) => setStudentLocationsText(e.target.value)}
                      placeholder="Bengaluru, Pune, Remote"
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <ToggleRow
                    title="Open to remote roles"
                    subtitle="Include remote opportunities in recommendation ranking."
                    checked={Boolean(jobPreferences.openToRemote)}
                    onChange={() =>
                      setSettings((prev) => ({
                        ...prev,
                        jobPreferences: {
                          ...(prev.jobPreferences || {}),
                          openToRemote: !Boolean(prev?.jobPreferences?.openToRemote),
                        },
                      }))
                    }
                  />
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <p className="text-sm font-semibold">Minimum salary expectation (LPA)</p>
                    <input
                      type="number"
                      min={0}
                      value={Number(jobPreferences.minSalaryLPA || 0)}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          jobPreferences: {
                            ...(prev.jobPreferences || {}),
                            minSalaryLPA: Number(e.target.value || 0),
                          },
                        }))
                      }
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === "hiring" && isRecruiter && (
              <>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Hiring Workflow</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <p className="text-sm font-semibold">Hiring focus roles</p>
                    <input
                      value={recruiterRolesText}
                      onChange={(e) => setRecruiterRolesText(e.target.value)}
                      placeholder="Backend Engineer, QA Engineer"
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <p className="text-sm font-semibold">Primary hiring regions</p>
                    <input
                      value={recruiterRegionsText}
                      onChange={(e) => setRecruiterRegionsText(e.target.value)}
                      placeholder="India, APAC, Remote"
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <ToggleRow
                    title="Auto-archive rejected applications"
                    subtitle="Keep your applicants table focused on active candidates."
                    checked={Boolean(recruiterPreferences.autoArchiveRejected)}
                    onChange={() =>
                      setSettings((prev) => ({
                        ...prev,
                        recruiterPreferences: {
                          ...(prev.recruiterPreferences || {}),
                          autoArchiveRejected: !Boolean(prev?.recruiterPreferences?.autoArchiveRejected),
                        },
                      }))
                    }
                  />

                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <p className="text-sm font-semibold">Candidate response SLA (hours)</p>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={Number(recruiterPreferences.candidateResponseSLAHours || 48)}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          recruiterPreferences: {
                            ...(prev.recruiterPreferences || {}),
                            candidateResponseSLAHours: Number(e.target.value || 48),
                          },
                        }))
                      }
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === "platform" && isAdmin && (
              <>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Platform Control</h2>
                <ToggleRow
                  title="Strict moderation mode"
                  subtitle="Apply tighter moderation thresholds for social feed and comments."
                  checked={Boolean(adminPreferences.strictModerationMode)}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      adminPreferences: {
                        ...(prev.adminPreferences || {}),
                        strictModerationMode: !Boolean(prev?.adminPreferences?.strictModerationMode),
                      },
                    }))
                  }
                />

                <ToggleRow
                  title="Auto-hide reported posts"
                  subtitle="Temporarily hide highly reported content until manual review."
                  checked={Boolean(adminPreferences.autoHideReportedPosts)}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      adminPreferences: {
                        ...(prev.adminPreferences || {}),
                        autoHideReportedPosts: !Boolean(prev?.adminPreferences?.autoHideReportedPosts),
                      },
                    }))
                  }
                />

                <ToggleRow
                  title="Company verification alerts"
                  subtitle="Notify owner/admin when new company verification is pending."
                  checked={Boolean(adminPreferences.verificationAlerts)}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      adminPreferences: {
                        ...(prev.adminPreferences || {}),
                        verificationAlerts: !Boolean(prev?.adminPreferences?.verificationAlerts),
                      },
                    }))
                  }
                />

                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-sm font-semibold">Owner digest frequency</p>
                  <select
                    value={String(adminPreferences.ownerDigestFrequency || "weekly")}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        adminPreferences: {
                          ...(prev.adminPreferences || {}),
                          ownerDigestFrequency: e.target.value,
                        },
                      }))
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="off">Off</option>
                  </select>
                </div>
              </>
            )}

            {activeTab === "security" && (
              <>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Security and Session</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <p className="text-sm font-semibold">{isAdmin ? "Portal governance" : "Profile and identity"}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isAdmin
                        ? "Open owner controls for moderation, verification, and portal-wide decisions."
                        : "Update personal profile, resume, and core account information."}
                    </p>
                    <Link
                      to={isAdmin ? "/owner/dashboard" : "/Profile"}
                      className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:underline dark:text-teal-300"
                    >
                      {isAdmin ? "Open Owner Dashboard" : "Open Profile"}
                    </Link>
                  </div>

                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-900/20">
                    <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Sign out session</p>
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      Logout from this device instantly if this is shared or public.
                    </p>
                    <Button className="mt-3 bg-rose-600 hover:bg-rose-500" onClick={logoutHandler}>
                      Logout Now
                    </Button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
