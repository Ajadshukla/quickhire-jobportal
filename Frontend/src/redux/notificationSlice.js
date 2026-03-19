import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
};

const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    setNotificationLoading(state, action) {
      state.loading = Boolean(action.payload);
    },
    setNotifications(state, action) {
      const list = Array.isArray(action.payload?.notifications)
        ? action.payload.notifications
        : [];
      state.notifications = list;
      state.unreadCount = Number(
        action.payload?.unreadCount ?? list.filter((item) => !item?.isRead).length
      );
    },
    prependNotification(state, action) {
      const incoming = action.payload;
      if (!incoming?._id) return;

      const exists = state.notifications.some(
        (item) => String(item?._id) === String(incoming._id)
      );
      if (exists) return;

      state.notifications = [incoming, ...state.notifications];
      if (!incoming.isRead) {
        state.unreadCount += 1;
      }
    },
    markNotificationRead(state, action) {
      const notificationId = String(action.payload || "");
      if (!notificationId) return;

      const target = state.notifications.find(
        (item) => String(item?._id) === notificationId
      );

      if (target && !target.isRead) {
        target.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllNotificationsRead(state) {
      state.notifications = state.notifications.map((item) => ({
        ...item,
        isRead: true,
      }));
      state.unreadCount = 0;
    },
    deleteNotificationById(state, action) {
      const notificationId = String(action.payload || "");
      const existing = state.notifications.find(
        (item) => String(item?._id) === notificationId
      );

      state.notifications = state.notifications.filter(
        (item) => String(item?._id) !== notificationId
      );

      if (existing && !existing.isRead) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
  },
});

export const {
  setNotificationLoading,
  setNotifications,
  prependNotification,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationById,
} = notificationSlice.actions;

export default notificationSlice.reducer;
