import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { toast } from "sonner";
import {
  deleteNotificationById,
  markAllNotificationsRead,
  markNotificationRead,
  prependNotification,
  setNotificationLoading,
  setNotifications,
} from "@/redux/notificationSlice";
import { NOTIFICATION_API_ENDPOINT, REALTIME_API_URL } from "@/utils/data";
import NotificationDropdown from "./NotificationDropdown";

const NotificationBell = () => {
  const { user } = useSelector((store) => store.auth);
  const { notifications, unreadCount, loading } = useSelector((store) => store.notification);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?._id) return;

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
      } catch (error) {
        toast.error(error?.response?.data?.message || "Unable to load notifications");
      } finally {
        dispatch(setNotificationLoading(false));
      }
    };

    loadNotifications();
  }, [dispatch, user?._id]);

  useEffect(() => {
    if (!user?._id) return;

    const socket = io(REALTIME_API_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("new_notification", (payload = {}) => {
      if (!payload?.notification) return;
      dispatch(prependNotification(payload.notification));
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch, user?._id]);

  const handleOpenNotification = async (notification) => {
    if (!notification?._id) return;

    try {
      if (!notification.isRead) {
        await axios.put(
          `${NOTIFICATION_API_ENDPOINT}/${notification._id}/read`,
          {},
          { withCredentials: true }
        );
        dispatch(markNotificationRead(notification._id));
      }
    } catch {
      // Keep navigation working even if mark-read request fails.
    }

    setOpen(false);

    const nextLink = String(notification?.link || "").trim();
    if (nextLink) {
      navigate(nextLink);
      return;
    }

    navigate("/notifications");
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.put(`${NOTIFICATION_API_ENDPOINT}/read-all`, {}, { withCredentials: true });
      dispatch(markAllNotificationsRead());
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to mark all notifications as read");
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!notificationId) return;

    try {
      await axios.delete(`${NOTIFICATION_API_ENDPOINT}/${notificationId}`, {
        withCredentials: true,
      });
      dispatch(deleteNotificationById(notificationId));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to delete notification");
    }
  };

  if (!user?._id) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="p-0">
        <NotificationDropdown
          loading={loading}
          notifications={notifications}
          unreadCount={unreadCount}
          onOpenNotification={handleOpenNotification}
          onDeleteNotification={handleDeleteNotification}
          onMarkAllRead={handleMarkAllRead}
        />
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
