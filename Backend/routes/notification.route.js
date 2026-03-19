import express from "express";
import authenticateToken from "../middleware/isAuthenticated.js";
import {
  deleteNotification,
  getUserNotifications,
  markAllAsRead,
  markAsRead,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.route("/").get(authenticateToken, getUserNotifications);
router.route("/:id/read").put(authenticateToken, markAsRead);
router.route("/read-all").put(authenticateToken, markAllAsRead);
router.route("/:id").delete(authenticateToken, deleteNotification);

export default router;
