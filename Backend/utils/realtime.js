import jwt from "jsonwebtoken";
import { Conversation } from "../models/conversation.model.js";
import { User } from "../models/user.model.js";

const extractTokenFromCookie = (cookieHeader = "") => {
  const entries = String(cookieHeader || "").split(";");
  const tokenEntry = entries.find((entry) => entry.trim().startsWith("token="));
  if (!tokenEntry) return "";
  return decodeURIComponent(tokenEntry.split("=").slice(1).join("=").trim());
};

const resolveConversationAccess = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId).populate({
    path: "application",
    select: "status",
  });

  if (!conversation) {
    return { allowed: false, reason: "Conversation not found" };
  }

  if (String(conversation?.application?.status || "") !== "accepted") {
    return {
      allowed: false,
      reason: "Conversation is disabled because application is not accepted",
    };
  }

  const isRecruiter = String(conversation.recruiter || "") === String(userId || "");
  const isStudent = String(conversation.student || "") === String(userId || "");

  if (!isRecruiter && !isStudent) {
    return { allowed: false, reason: "Not authorized for this conversation" };
  }

  return {
    allowed: true,
    conversation,
    isRecruiter,
    isStudent,
  };
};

export const registerRealtimeHandlers = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = extractTokenFromCookie(socket.handshake.headers.cookie);
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded?.userId) {
        return next(new Error("Unauthorized"));
      }

      const user = await User.findById(decoded.userId).select("_id role isBlocked");
      if (!user || user.isBlocked) {
        return next(new Error("Unauthorized"));
      }

      socket.data.userId = String(user._id);
      socket.data.userRole = String(user.role || "");
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);

    socket.on("conversation:join", async (payload = {}) => {
      try {
        const conversationId = String(payload?.conversationId || "").trim();
        if (!conversationId) {
          socket.emit("conversation:error", { message: "conversationId is required" });
          return;
        }

        const access = await resolveConversationAccess(conversationId, userId);
        if (!access.allowed) {
          socket.emit("conversation:error", { message: access.reason });
          return;
        }

        socket.join(`conversation:${conversationId}`);
        socket.emit("conversation:joined", { conversationId });
      } catch {
        socket.emit("conversation:error", { message: "Unable to join conversation" });
      }
    });

    const forwardCallEvent = async (eventName, payload = {}, requireUnlocked = true) => {
      const conversationId = String(payload?.conversationId || "").trim();
      if (!conversationId) {
        socket.emit("call:error", { message: "conversationId is required" });
        return;
      }

      const access = await resolveConversationAccess(conversationId, userId);
      if (!access.allowed) {
        socket.emit("call:error", { message: access.reason });
        return;
      }

      if (requireUnlocked && !access.conversation.unlockedByRecruiter) {
        socket.emit("call:error", {
          message: "Video call is available only after recruiter starts conversation",
        });
        return;
      }

      const room = `conversation:${conversationId}`;
      socket.to(room).emit(eventName, {
        conversationId,
        fromUserId: userId,
        sdp: payload?.sdp || null,
        candidate: payload?.candidate || null,
      });
    };

    socket.on("call:offer", (payload) => forwardCallEvent("call:offer", payload, true));
    socket.on("call:answer", (payload) => forwardCallEvent("call:answer", payload, true));
    socket.on("call:ice-candidate", (payload) =>
      forwardCallEvent("call:ice-candidate", payload, true)
    );
    socket.on("call:end", (payload) => forwardCallEvent("call:end", payload, false));
  });
};
