import express from "express";
import authenticateToken from "../middleware/isAuthenticated.js";
import {
  getAllUsersForOwner,
  getCompaniesForVerification,
  getOwnerDashboard,
  updateCompanyVerification,
  updateUserBlockStatus,
} from "../controllers/owner.controller.js";

const router = express.Router();

router.route("/dashboard").get(authenticateToken, getOwnerDashboard);
router.route("/users").get(authenticateToken, getAllUsersForOwner);
router.route("/users/:userId/block").put(authenticateToken, updateUserBlockStatus);
router.route("/companies").get(authenticateToken, getCompaniesForVerification);
router.route("/companies/:companyId/verify").put(authenticateToken, updateCompanyVerification);

export default router;
