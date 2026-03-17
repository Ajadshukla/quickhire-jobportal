import express from "express";

import authenticateToken from "../middleware/isAuthenticated.js";
import {
  getAdminJobs,
  getAllJobs,
  getJobById,
  getSavedJobs,
  postJob,
  toggleSaveJob,
} from "../controllers/job.controller.js";

const router = express.Router();

router.route("/post").post(authenticateToken, postJob);
router.route("/get").get(authenticateToken, getAllJobs);
router.route("/getadminjobs").get(authenticateToken, getAdminJobs);
router.route("/saved").get(authenticateToken, getSavedJobs);
router.route("/save/:id").post(authenticateToken, toggleSaveJob);
router.route("/get/:id").get(authenticateToken, getJobById);
export default router;
