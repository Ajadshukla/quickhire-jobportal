import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import Navbar from "./Navbar";
import { ANNOUNCEMENT_API_ENDPOINT } from "@/utils/data";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

const priorityTone = (priority) => {
  if (priority === "critical") return "bg-rose-100 text-rose-700";
  if (priority === "important") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
};

const StudentAnnouncements = () => {
  const { user } = useSelector((store) => store.auth);
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${ANNOUNCEMENT_API_ENDPOINT}/student`, {
          withCredentials: true,
        });

        if (res.data?.success) {
          setAnnouncements(res.data.announcements || []);
        }
      } catch {
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    if (String(user?.role || "") === "Student") {
      fetchAnnouncements();
    }
  }, [user?.role]);

  const sorted = useMemo(
    () => [...announcements].sort((a, b) => new Date(b.publishAt) - new Date(a.publishAt)),
    [announcements]
  );

  const resetDismissed = () => {
    localStorage.removeItem("quickhire-dismissed-announcements");
  };

  return (
    <div className="qh-page min-h-screen">
      <Navbar />
      <div className="qh-shell py-6">
        <div className="qh-panel">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h1 className="qh-title">Announcements</h1>
              <p className="qh-subtitle mt-1">All active updates from admin for students.</p>
            </div>
            <Button variant="outline" onClick={resetDismissed}>
              Reset Top Banner Dismiss
            </Button>
          </div>

          {loading ? (
            <p className="mt-4 text-slate-600">Loading announcements...</p>
          ) : sorted.length === 0 ? (
            <p className="mt-4 text-slate-600">No active announcements right now.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {sorted.map((item) => (
                <div key={item._id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
                    <Badge className={priorityTone(item.priority)}>{item.priority || "normal"}</Badge>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 mt-1">{item.message}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Published: {item.publishAt ? String(item.publishAt).replace("T", " ").slice(0, 16) : "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAnnouncements;
