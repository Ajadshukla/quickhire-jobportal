import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components_lite/Navbar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { OWNER_API_ENDPOINT } from "@/utils/data";
import { toast } from "sonner";

const initialForm = {
  title: "",
  message: "",
  audience: "Student",
  priority: "important",
  isActive: true,
  publishAt: "",
  expireAt: "",
};

const OwnerAnnouncements = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");

  const canSubmit =
    String(form.title || "").trim().length >= 4 && String(form.message || "").trim().length >= 10;

  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [announcements]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId("");
  };

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${OWNER_API_ENDPOINT}/announcements`, { withCredentials: true });
      if (res.data?.success) {
        setAnnouncements(res.data.announcements || []);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const submitAnnouncement = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("Please enter a valid title and message");
      return;
    }

    const payload = {
      title: String(form.title || "").trim(),
      message: String(form.message || "").trim(),
      audience: form.audience,
      priority: form.priority,
      isActive: Boolean(form.isActive),
      publishAt: form.publishAt || undefined,
      expireAt: form.expireAt || undefined,
    };

    try {
      setSaving(true);
      const res = editingId
        ? await axios.put(`${OWNER_API_ENDPOINT}/announcements/${editingId}`, payload, {
            withCredentials: true,
          })
        : await axios.post(`${OWNER_API_ENDPOINT}/announcements`, payload, {
            withCredentials: true,
          });

      if (res.data?.success) {
        toast.success(res.data.message || "Announcement saved");
        resetForm();
        loadAnnouncements();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save announcement");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    const toLocalDateTime = (value) => {
      if (!value) return "";
      const dt = new Date(value);
      const offset = dt.getTimezoneOffset();
      const local = new Date(dt.getTime() - offset * 60000);
      return local.toISOString().slice(0, 16);
    };

    setEditingId(item._id);
    setForm({
      title: item.title || "",
      message: item.message || "",
      audience: "Student",
      priority: item.priority || "important",
      isActive: Boolean(item.isActive),
      publishAt: toLocalDateTime(item.publishAt),
      expireAt: toLocalDateTime(item.expireAt),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleActive = async (item) => {
    try {
      const res = await axios.put(
        `${OWNER_API_ENDPOINT}/announcements/${item._id}`,
        { isActive: !item.isActive },
        { withCredentials: true }
      );

      if (res.data?.success) {
        toast.success(item.isActive ? "Announcement paused" : "Announcement activated");
        loadAnnouncements();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update status");
    }
  };

  return (
    <div className="qh-page min-h-screen">
      <Navbar />
      <div className="qh-shell py-8 space-y-6">
        <div className="qh-panel">
          <h1 className="qh-title">Announcement Center</h1>
          <p className="qh-subtitle mt-1">
            Publish updates that are shown to logged-in students.
          </p>

          <form className="mt-5 space-y-3" onSubmit={submitAnnouncement}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Announcement title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
              <div className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 px-3 py-2 text-slate-700 dark:text-slate-200 flex items-center justify-between">
                <span className="text-sm">Audience</span>
                <Badge className="bg-emerald-100 text-emerald-700">Students</Badge>
              </div>
            </div>

            <textarea
              rows={4}
              placeholder="Write announcement message..."
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 px-3 py-2 text-slate-800 dark:text-slate-100"
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                value={form.priority}
                onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 px-3 py-2 text-slate-800 dark:text-slate-100"
              >
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="critical">Critical</option>
              </select>

              <Input
                type="datetime-local"
                value={form.publishAt}
                onChange={(e) => setForm((prev) => ({ ...prev, publishAt: e.target.value }))}
              />

              <Input
                type="datetime-local"
                value={form.expireAt}
                onChange={(e) => setForm((prev) => ({ ...prev, expireAt: e.target.value }))}
              />

              <label className="flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">Active now</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={saving || !canSubmit}>
                {saving ? "Saving..." : editingId ? "Update Announcement" : "Publish Announcement"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>
        </div>

        <div className="qh-panel">
          <div className="flex items-center justify-between gap-2">
            <h2 className="qh-display text-xl font-bold">Recent Announcements</h2>
            {loading && <span className="text-sm text-slate-500">Loading...</span>}
          </div>

          {sortedAnnouncements.length === 0 ? (
            <p className="text-slate-600 mt-3">No announcements yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {sortedAnnouncements.map((item) => (
                <div key={item._id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{item.message}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-100 text-slate-700">{item.audience}</Badge>
                      <Badge
                        className={
                          item.priority === "critical"
                            ? "bg-rose-100 text-rose-700"
                            : item.priority === "important"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }
                      >
                        {item.priority}
                      </Badge>
                      <Badge className={item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
                        {item.isActive ? "Active" : "Paused"}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                    <span>Publish: {item.publishAt ? String(item.publishAt).replace("T", " ").slice(0, 16) : "now"}</span>
                    <span>Expiry: {item.expireAt ? String(item.expireAt).replace("T", " ").slice(0, 16) : "none"}</span>
                    <span>By: {item.createdBy?.fullname || "Owner"}</span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => startEdit(item)}>
                      Edit
                    </Button>
                    <Button type="button" variant="outline" onClick={() => toggleActive(item)}>
                      {item.isActive ? "Pause" : "Activate"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerAnnouncements;
