import React from "react";
import { BellRing, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "../ui/button";

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

const NotificationDropdown = ({
  loading,
  notifications,
  unreadCount,
  onOpenNotification,
  onDeleteNotification,
  onMarkAllRead,
}) => {
  return (
    <div className="w-[22rem] md:w-[24rem]">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Notifications</p>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
            {unreadCount} unread
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onMarkAllRead}
            disabled={!unreadCount}
            className="h-8"
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            Read All
          </Button>
        </div>
      </div>

      <div className="max-h-[22rem] overflow-y-auto">
        {loading ? (
          <p className="px-3 py-6 text-sm text-slate-500">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-slate-500">
            <BellRing className="h-5 w-5" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {notifications.map((item) => (
              <div
                key={item._id}
                className={`group flex items-start justify-between gap-2 px-3 py-2.5 ${
                  item?.isRead
                    ? "bg-white dark:bg-slate-900"
                    : "bg-rose-50/60 dark:bg-rose-900/10"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onOpenNotification(item)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className={`text-sm ${item?.isRead ? "text-slate-700 dark:text-slate-200" : "font-semibold text-slate-900 dark:text-slate-100"}`}>
                    {item?.message}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                    {item?.type || "system"} • {formatTime(item?.createdAt)}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteNotification(item?._id)}
                  className="mt-0.5 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  title="Delete notification"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
