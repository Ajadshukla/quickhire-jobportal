import { useEffect, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Navbar from "./Navbar";
import CreatePost from "./CreatePost";
import PostCard from "./PostCard";
import { Loader2 } from "lucide-react";
import { POSTS_API_ENDPOINT } from "@/utils/data";

const Feed = () => {
  const { user } = useSelector((store) => store.auth);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await axios.get(`${POSTS_API_ENDPOINT}/feed`, {
        withCredentials: true,
      });

      if (res.data?.success) {
        setPosts(Array.isArray(res.data.posts) ? res.data.posts : []);
      } else {
        setPosts([]);
      }
    } catch {
      setPosts([]);
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handlePostCreated = (newPost) => {
    if (!newPost?._id) return;
    setPosts((prev) => [newPost, ...prev.filter((item) => String(item._id) !== String(newPost._id))]);
  };

  const handlePostUpdated = (updatedPost) => {
    if (!updatedPost?._id) return;
    setPosts((prev) =>
      prev.map((item) => (String(item._id) === String(updatedPost._id) ? updatedPost : item))
    );
  };

  const handlePostDeleted = (deletedPostId) => {
    if (!deletedPostId) return;
    setPosts((prev) => prev.filter((item) => String(item._id) !== String(deletedPostId)));
  };

  return (
    <div className="qh-page">
      <Navbar />
      <div className="qh-shell py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="qh-title">Social Feed</h1>
          <button
            type="button"
            onClick={() => fetchFeed({ silent: true })}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4">
          {user ? (
            <CreatePost onPostCreated={handlePostCreated} />
          ) : (
            <div className="qh-panel flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Join the conversation</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">Login to create posts, like, and comment.</p>
              </div>
              <Link
                to="/login"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Login to interact
              </Link>
            </div>
          )}

          {loading ? (
            <div className="qh-panel flex items-center justify-center py-10 text-slate-600 dark:text-slate-300">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading feed...
            </div>
          ) : posts.length === 0 ? (
            <div className="qh-panel py-10 text-center text-slate-600 dark:text-slate-300">
              No posts yet. Be the first one to share an update.
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                currentUserId={user?._id}
                currentUserRole={user?.role}
                onPostUpdated={handlePostUpdated}
                onPostDeleted={handlePostDeleted}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Feed;
