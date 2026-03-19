import express from "express";
import authenticateToken from "../middleware/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";
import {
  addCommentToPost,
  createPost,
  deleteComment,
  deletePost,
  getFeed,
  toggleLikePost,
} from "../controllers/post.controller.js";

const router = express.Router();

router.route("/create").post(authenticateToken, singleUpload, createPost);
router.route("/feed").get(getFeed);
router.route("/like/:postId").put(authenticateToken, toggleLikePost);
router.route("/comment/:postId").post(authenticateToken, addCommentToPost);
router.route("/:postId").delete(authenticateToken, deletePost);
router.route("/:postId/comment/:commentId").delete(authenticateToken, deleteComment);

export default router;
