import express from "express";
import authenticateToken from "../middleware/isAuthenticated.js";
import {
  createAnnouncement,
  getAllUsersForOwner,
  getOwnerAnnouncements,
  getCompaniesForVerification,
  getOwnerDashboard,
  updateAnnouncement,
  updateCompanyVerification,
  updateUserBlockStatus,
} from "../controllers/owner.controller.js";

const router = express.Router();

router.route("/dashboard").get(authenticateToken, getOwnerDashboard);
router.route("/users").get(authenticateToken, getAllUsersForOwner);
router.route("/users/:userId/block").put(authenticateToken, updateUserBlockStatus);
router.route("/companies").get(authenticateToken, getCompaniesForVerification);
router.route("/companies/:companyId/verify").put(authenticateToken, updateCompanyVerification);
router.route("/announcements").get(authenticateToken, getOwnerAnnouncements);
router.route("/announcements").post(authenticateToken, createAnnouncement);
router.route("/announcements/:announcementId").put(authenticateToken, updateAnnouncement);

export default router;
