import express from "express";
import {
  analyzeResumeByJob,
  downloadResume,
  downloadResumeByUserId,
  evaluateMockInterviewAnswers,
  generateMockInterviewSet,
  generatePreparationQuestions,
  getCurrentUser,
  googleAuth,
  login,
  logout,
  previewResumeByUserId,
  register,
  updateProfile,
} from "../controllers/user.controller.js";
import authenticateToken from "../middleware/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.route("/register").post(singleUpload, register);
router.route("/login").post(login);
router.route("/google").post(googleAuth);
router.route("/logout").post(logout);
router.route("/me").get(authenticateToken, getCurrentUser);
router.route("/resume/download").get(authenticateToken, downloadResume);
router.route("/resume/:userId/download").get(authenticateToken, downloadResumeByUserId);
router.route("/resume/:userId/preview").get(authenticateToken, previewResumeByUserId);
router.route("/resume/analyze/:jobId").get(authenticateToken, analyzeResumeByJob);
router.route("/preparation/questions/:jobId").get(authenticateToken, generatePreparationQuestions);
router.route("/preparation/mock/:jobId").get(authenticateToken, generateMockInterviewSet);
router.route("/preparation/mock/:jobId/evaluate").post(authenticateToken, evaluateMockInterviewAnswers);
router
  .route("/profile/update")
  .post(authenticateToken, singleUpload, updateProfile);

export default router;
