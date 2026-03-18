import express from "express";
import { getStudentAnnouncements } from "../controllers/announcement.controller.js";
import authenticateToken from "../middleware/isAuthenticated.js";

const router = express.Router();

router.route("/student").get(authenticateToken, getStudentAnnouncements);

export default router;
