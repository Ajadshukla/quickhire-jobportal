/* eslint-disable react/prop-types */
import { useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Heart, Loader2, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { POSTS_API_ENDPOINT } from "@/utils/data";

const getInitials = (name) =>
  String(name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const isRecruiter = (role) => String(role || "").toLowerCase() === "recruiter";

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const PostCard = ({ post, currentUserId, currentUserRole, onPostUpdated, onPostDeleted }) => {
  const navigate = useNavigate();
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);

  const comments = Array.isArray(post?.comments) ? post.comments : [];
  const visibleComments = showAllComments ? comments : comments.slice(0, 2);

  const likedByMe = useMemo(() => {
    return Array.isArray(post?.likes)
      ? post.likes.some((likeUser) => {
          const likeUserId = likeUser?._id || likeUser;
          return String(likeUserId) === String(currentUserId || "");
        })
      : false;
  }, [currentUserId, post?.likes]);

  const canDeletePost = useMemo(() => {
    const isAdmin = String(currentUserRole || "") === "Admin";
    const isOwner = String(post?.userId?._id || "") === String(currentUserId || "");
    return isAdmin || isOwner;
  }, [currentUserId, currentUserRole, post?.userId?._id]);

  const ensureAuthenticated = () => {
    if (currentUserId) return true;
    toast.error("Please login to interact with posts");
    navigate("/login");
    return false;
  };

  const handleToggleLike = async () => {
    if (!ensureAuthenticated()) return;
    if (isLiking) return;
    setIsLiking(true);
    try {
      const res = await axios.put(`${POSTS_API_ENDPOINT}/like/${post._id}`, {}, { withCredentials: true });
      if (res.data?.success && res.data?.post) {
        onPostUpdated?.(res.data.post);
      } else {
        toast.error(res.data?.message || "Unable to update like");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to update like");
    } finally {
      setIsLiking(false);
    }
  };

  const handleAddComment = async (event) => {
    event.preventDefault();
    if (!ensureAuthenticated()) return;
    const value = String(commentText || "").trim();
    if (!value || isCommenting) return;

    setIsCommenting(true);
    try {
      const res = await axios.post(
        `${POSTS_API_ENDPOINT}/comment/${post._id}`,
        { text: value },
        { withCredentials: true }
      );

      if (res.data?.success && res.data?.post) {
        onPostUpdated?.(res.data.post);
        setCommentText("");
      } else {
        toast.error(res.data?.message || "Unable to add comment");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to add comment");
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!canDeletePost || isDeletingPost) return;
    setIsDeletingPost(true);
    try {
      const res = await axios.delete(`${POSTS_API_ENDPOINT}/${post._id}`, {
        withCredentials: true,
      });
      if (res.data?.success) {
        onPostDeleted?.(post._id);
        toast.success(res.data?.message || "Post deleted");
      } else {
        toast.error(res.data?.message || "Unable to delete post");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to delete post");
    } finally {
      setIsDeletingPost(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!commentId || deletingCommentId) return;
    setDeletingCommentId(commentId);
    try {
      const res = await axios.delete(`${POSTS_API_ENDPOINT}/${post._id}/comment/${commentId}`, {
        withCredentials: true,
      });
      if (res.data?.success && res.data?.post) {
        onPostUpdated?.(res.data.post);
        toast.success(res.data?.message || "Comment deleted");
      } else {
        toast.error(res.data?.message || "Unable to delete comment");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to delete comment");
    } finally {
      setDeletingCommentId("");
    }
  };

  return (
    <article className="qh-panel">
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarImage src={post?.userId?.profile?.profilePhoto || ""} alt="author" />
          <AvatarFallback>{getInitials(post?.userId?.fullname)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-sm ${isRecruiter(post?.userId?.role) ? "font-bold text-amber-700 dark:text-amber-300" : "font-semibold"}`}>
              {post?.userId?.fullname || "Unknown User"}
            </p>
            {isRecruiter(post?.userId?.role) && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                ⭐ Recruiter
              </span>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(post?.createdAt)}</span>
          </div>

          <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-200">{post?.text}</p>

          {post?.image ? (
            <img
              src={post.image}
              alt="post"
              className="mt-3 max-h-[28rem] w-full rounded-xl border border-slate-200 object-cover dark:border-slate-700"
            />
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={likedByMe ? "default" : "outline"}
              onClick={handleToggleLike}
              disabled={isLiking || !currentUserId}
              className={likedByMe ? "bg-rose-600 hover:bg-rose-500" : ""}
            >
              {isLiking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Heart className="mr-2 h-4 w-4" />}
              {likedByMe ? "Liked" : "Like"}
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-300">
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="font-medium text-slate-700 underline-offset-2 hover:underline dark:text-slate-200"
                  >
                    {post?.likes?.length || 0} like{(post?.likes?.length || 0) === 1 ? "" : "s"}
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Liked by</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {Array.isArray(post?.likes) && post.likes.length > 0 ? (
                      post.likes.map((likedUser) => (
                        <div key={likedUser?._id || String(likedUser)} className="flex items-center justify-between rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                          <div className="flex min-w-0 items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={likedUser?.profile?.profilePhoto || ""} alt="liked user" />
                              <AvatarFallback>{getInitials(likedUser?.fullname)}</AvatarFallback>
                            </Avatar>
                            <p className={`truncate text-sm ${isRecruiter(likedUser?.role) ? "font-bold text-amber-700 dark:text-amber-300" : "font-medium text-slate-700 dark:text-slate-200"}`}>
                              {likedUser?.fullname || "User"}
                            </p>
                          </div>
                          {isRecruiter(likedUser?.role) ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                              ⭐ Recruiter
                            </span>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-600 dark:text-slate-300">No likes yet.</p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </span>
            <span className="inline-flex items-center text-sm text-slate-600 dark:text-slate-300">
              <MessageCircle className="mr-1 h-4 w-4" />
              {post?.comments?.length || 0} comments
            </span>
            {canDeletePost ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleDeletePost}
                disabled={isDeletingPost}
                className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/20"
              >
                {isDeletingPost ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete Post
              </Button>
            ) : null}
          </div>

          <form onSubmit={handleAddComment} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder={currentUserId ? "Write a comment" : "Login to comment"}
              maxLength={500}
              disabled={!currentUserId}
              className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
            <Button type="submit" disabled={!currentUserId || !String(commentText || "").trim() || isCommenting}>
              {isCommenting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Comment
            </Button>
          </form>

          {comments.length > 0 ? (
            <div className="mt-4 space-y-3">
              {visibleComments.map((comment) => (
                <div key={comment._id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`text-xs ${isRecruiter(comment?.userId?.role) ? "font-bold text-amber-700 dark:text-amber-300" : "font-semibold text-slate-700 dark:text-slate-200"}`}
                    >
                      {comment?.userId?.fullname || "User"}
                    </p>
                    {isRecruiter(comment?.userId?.role) && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        ⭐ Recruiter
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatDate(comment?.createdAt)}</span>
                    {(String(currentUserRole || "") === "Admin" || String(comment?.userId?._id || "") === String(currentUserId || "") || String(post?.userId?._id || "") === String(currentUserId || "")) ? (
                      <button
                        type="button"
                        className="ml-auto text-[11px] font-semibold text-rose-700 hover:underline dark:text-rose-300"
                        onClick={() => handleDeleteComment(comment?._id)}
                        disabled={deletingCommentId === comment?._id}
                      >
                        {deletingCommentId === comment?._id ? "Deleting..." : "Delete"}
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{comment?.text}</p>
                </div>
              ))}

              {comments.length > 2 ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-teal-700 hover:underline dark:text-teal-300"
                  onClick={() => setShowAllComments((prev) => !prev)}
                >
                  {showAllComments ? "Show less comments" : `View all ${comments.length} comments`}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export default PostCard;
