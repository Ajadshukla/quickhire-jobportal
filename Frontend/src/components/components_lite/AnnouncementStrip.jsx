import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ANNOUNCEMENT_API_ENDPOINT } from "@/utils/data";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

const AnnouncementStrip = () => {
  const { user } = useSelector((store) => store.auth);
  const [announcements, setAnnouncements] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const raw = localStorage.getItem("quickhire-dismissed-announcements");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const isStudent = String(user?.role || "") === "Student";

  useEffect(() => {
    if (!isStudent) {
      setAnnouncements([]);
      return;
    }

    const fetchAnnouncements = async () => {
      try {
        const res = await axios.get(`${ANNOUNCEMENT_API_ENDPOINT}/student`, {
          withCredentials: true,
        });
        if (res.data?.success) {
          setAnnouncements(res.data.announcements || []);
        }
      } catch {
        setAnnouncements([]);
      }
    };

    fetchAnnouncements();
  }, [isStudent]);

  const visible = useMemo(() => {
    return (announcements || []).filter((a) => !dismissedIds.includes(a._id)).slice(0, 2);
  }, [announcements, dismissedIds]);

  const dismissAnnouncement = (id) => {
    const next = [...dismissedIds, id];
    setDismissedIds(next);
    localStorage.setItem("quickhire-dismissed-announcements", JSON.stringify(next));
  };

  const tone = (priority) => {
    if (priority === "critical") return "border-rose-300 bg-rose-50 text-rose-900";
    if (priority === "important") return "border-amber-300 bg-amber-50 text-amber-900";
    return "border-teal-300 bg-teal-50 text-teal-900";
  };

  if (!isStudent || visible.length === 0) return null;

  return (
    <div className="qh-shell mt-3 space-y-2">
      <div className="flex justify-end">
        <Link
          to="/announcements"
          className="text-xs font-semibold text-slate-700 dark:text-slate-200 underline"
        >
          View all announcements
        </Link>
      </div>
      {visible.map((item) => (
        <div
          key={item._id}
          className={`rounded-xl border px-3 py-2 text-sm flex items-start justify-between gap-2 ${tone(item.priority)}`}
        >
          <div>
            <p className="font-semibold">{item.title}</p>
            <p className="opacity-90">{item.message}</p>
          </div>
          <button
            type="button"
            onClick={() => dismissAnnouncement(item._id)}
            className="text-xs font-semibold opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
};

export default AnnouncementStrip;
