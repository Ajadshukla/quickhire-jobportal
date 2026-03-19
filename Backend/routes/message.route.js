import express from "express";
import authenticateToken from "../middleware/isAuthenticated.js";
import {
  getConversationByApplication,
  getMessageThreads,
  initiateConversation,
  sendMessage,
} from "../controllers/message.controller.js";

const router = express.Router();

router.route("/threads").get(authenticateToken, getMessageThreads);
router.route("/conversation/:applicationId").get(authenticateToken, getConversationByApplication);
router.route("/initiate/:applicationId").post(authenticateToken, initiateConversation);
router.route("/send/:conversationId").post(authenticateToken, sendMessage);

export default router;
