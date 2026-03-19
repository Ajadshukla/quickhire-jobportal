import { Post } from "../models/post.model.js";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloud.js";

const isCloudinaryConfigured = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
  const cloudApi = process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API;
  const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.API_SECRET;

  if (!cloudName || !cloudApi || !apiSecret) return false;
  if (
    cloudName.toLowerCase().includes("replace") ||
    cloudApi.toLowerCase().includes("replace") ||
    apiSecret.toLowerCase().includes("replace")
  ) {
    return false;
  }

  return true;
};

const populatePostById = (postId) =>
  Post.findById(postId)
    .populate({
      path: "userId",
      select: "fullname role profile.profilePhoto",
    })
    .populate({
      path: "likes",
      select: "fullname role profile.profilePhoto",
    })
    .populate({
      path: "comments.userId",
      select: "fullname role profile.profilePhoto",
    });

export const createPost = async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    const file = req.file;

    if (!text) {
      return res.status(400).json({
        message: "Post text is required",
        success: false,
      });
    }

    if (text.length > 2000) {
      return res.status(400).json({
        message: "Post text cannot exceed 2000 characters",
        success: false,
      });
    }

    let image = "";
    if (file) {
      if (!isCloudinaryConfigured()) {
        return res.status(400).json({
          message:
            "Cloudinary is not configured. Remove image upload or add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in Backend/.env.",
          success: false,
        });
      }

      const fileUri = getDataUri(file);
      const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
        folder: "quickhire/posts",
      });
      image = cloudResponse.secure_url;
    }

    const post = await Post.create({
      userId: req.id,
      text,
      image,
      likes: [],
      comments: [],
    });

    const populatedPost = await populatePostById(post._id);

    return res.status(201).json({
      message: "Post created successfully",
      post: populatedPost,
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};

export const getFeed = async (req, res) => {
  try {
    const posts = await Post.find({})
      .populate({
        path: "userId",
        select: "fullname role profile.profilePhoto",
      })
      .populate({
        path: "likes",
        select: "fullname role profile.profilePhoto",
      })
      .populate({
        path: "comments.userId",
        select: "fullname role profile.profilePhoto",
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      posts,
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};

export const toggleLikePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId).select("likes");
    if (!post) {
      return res.status(404).json({
        message: "Post not found",
        success: false,
      });
    }

    const userId = String(req.id);
    const hasLiked = post.likes.some((likedUserId) => String(likedUserId) === userId);

    if (hasLiked) {
      post.likes = post.likes.filter((likedUserId) => String(likedUserId) !== userId);
    } else {
      post.likes.push(req.id);
    }

    await post.save();

    const updatedPost = await populatePostById(postId);

    return res.status(200).json({
      message: hasLiked ? "Post unliked" : "Post liked",
      liked: !hasLiked,
      likesCount: updatedPost?.likes?.length || 0,
      post: updatedPost,
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};

export const addCommentToPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const text = String(req.body?.text || "").trim();

    if (!text) {
      return res.status(400).json({
        message: "Comment text is required",
        success: false,
      });
    }

    if (text.length > 500) {
      return res.status(400).json({
        message: "Comment cannot exceed 500 characters",
        success: false,
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: "Post not found",
        success: false,
      });
    }

    post.comments.push({
      userId: req.id,
      text,
      createdAt: new Date(),
    });

    await post.save();

    const updatedPost = await populatePostById(postId);

    return res.status(201).json({
      message: "Comment added",
      post: updatedPost,
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId).select("userId");

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
        success: false,
      });
    }

    const isAdmin = String(req.userRole || "") === "Admin";
    const isPostOwner = String(post.userId) === String(req.id);

    if (!isAdmin && !isPostOwner) {
      return res.status(403).json({
        message: "Not authorized to delete this post",
        success: false,
      });
    }

    await Post.findByIdAndDelete(postId);

    return res.status(200).json({
      message: "Post deleted successfully",
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: "Post not found",
        success: false,
      });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
        success: false,
      });
    }

    const isAdmin = String(req.userRole || "") === "Admin";
    const isCommentOwner = String(comment.userId) === String(req.id);
    const isPostOwner = String(post.userId) === String(req.id);

    if (!isAdmin && !isCommentOwner && !isPostOwner) {
      return res.status(403).json({
        message: "Not authorized to delete this comment",
        success: false,
      });
    }

    comment.deleteOne();
    await post.save();

    const updatedPost = await populatePostById(postId);

    return res.status(200).json({
      message: "Comment deleted successfully",
      post: updatedPost,
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};
