import { Notification } from "../models/notification.model.js";

export const createNotification = async ({ req, userId, type, message, link = "" }) => {
  const normalizedUserId = String(userId || "").trim();
  const normalizedMessage = String(message || "").trim();
  const normalizedType = String(type || "").trim().toLowerCase();

  if (!normalizedUserId || !normalizedMessage || !normalizedType) return null;

  const notification = await Notification.create({
    userId: normalizedUserId,
    type: normalizedType,
    message: normalizedMessage,
    link: String(link || "").trim(),
  });

  const io = req?.app?.get("io");
  if (io) {
    io.to(`user:${normalizedUserId}`).emit("new_notification", {
      notification,
    });
  }

  return notification;
};
