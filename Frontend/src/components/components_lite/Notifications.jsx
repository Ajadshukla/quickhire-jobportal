import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "./Navbar";
import { Button } from "../ui/button";
import {
  deleteNotificationById,
  markAllNotificationsRead,
  markNotificationRead,
  setNotificationLoading,
  setNotifications,
} from "@/redux/notificationSlice";
import { NOTIFICATION_API_ENDPOINT } from "@/utils/data";

const formatTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const Notifications = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { notifications, unreadCount, loading } = useSelector((store) => store.notification);

  useEffect(() => {
    const loadNotifications = async () => {
      dispatch(setNotificationLoading(true));
      try {
        const res = await axios.get(`${NOTIFICATION_API_ENDPOINT}`, {
          withCredentials: true,
        });

        if (res.data?.success) {
          dispatch(
            setNotifications({
              notifications: res.data.notifications,
              unreadCount: res.data.unreadCount,
            })
          );
        }
      } finally {
        dispatch(setNotificationLoading(false));
      }
    };

    loadNotifications();
  }, [dispatch]);

  const openNotification = async (item) => {
    try {
      if (!item?.isRead) {
        await axios.put(
          `${NOTIFICATION_API_ENDPOINT}/${item._id}/read`,
          {},
          { withCredentials: true }
        );
        dispatch(markNotificationRead(item._id));
      }
    } catch {
      // Navigate even if read status call fails.
    }

    navigate(String(item?.link || "/notifications"));
  };

  const markAll = async () => {
    await axios.put(`${NOTIFICATION_API_ENDPOINT}/read-all`, {}, { withCredentials: true });
    dispatch(markAllNotificationsRead());
  };

  const removeItem = async (id) => {
    await axios.delete(`${NOTIFICATION_API_ENDPOINT}/${id}`, { withCredentials: true });
    dispatch(deleteNotificationById(id));
  };

  return (
    <div className="qh-page">
      <Navbar />
      <div className="qh-shell py-8">
        <div className="qh-panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h1 className="qh-title text-xl">Notifications</h1>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-900/20 dark:text-rose-200">
                {unreadCount} unread
              </span>
              <Button variant="outline" onClick={markAll} disabled={!unreadCount}>
                Mark all as read
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-slate-500">No notifications</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((item) => (
                <div
                  key={item._id}
                  className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${
                    item?.isRead
                      ? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                      : "border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/10"
                  }`}
                >
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openNotification(item)}>
                    <p className={`text-sm ${item?.isRead ? "text-slate-700 dark:text-slate-200" : "font-semibold text-slate-900 dark:text-slate-100"}`}>
                      {item?.message}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item?.type || "system"} • {formatTime(item?.createdAt)}
                    </p>
                  </button>

                  <Button variant="outline" size="sm" onClick={() => removeItem(item._id)}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
