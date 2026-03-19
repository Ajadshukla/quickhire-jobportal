/* eslint-disable react/prop-types */
import { useMemo, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ImagePlus, Loader2, X } from "lucide-react";
import { POSTS_API_ENDPOINT } from "@/utils/data";

const getInitials = (name) =>
  String(name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const isRecruiter = (role) => String(role || "").toLowerCase() === "recruiter";

const CreatePost = ({ onPostCreated }) => {
  const { user } = useSelector((store) => store.auth);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => String(text || "").trim().length > 0, [text]);

  const handlePickImage = (event) => {
    const file = event.target.files?.[0] || null;
    setImageFile(file);

    if (!file) {
      setPreviewUrl("");
      return;
    }

    const nextPreview = URL.createObjectURL(file);
    setPreviewUrl(nextPreview);
  };

  const handleClearImage = () => {
    setImageFile(null);
    setPreviewUrl("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("text", text.trim());
      if (imageFile) {
        formData.append("file", imageFile);
      }

      const res = await axios.post(`${POSTS_API_ENDPOINT}/create`, formData, {
        withCredentials: true,
      });

      if (res.data?.success && res.data?.post) {
        setText("");
        setImageFile(null);
        setPreviewUrl("");
        onPostCreated?.(res.data.post);
        toast.success("Post published");
      } else {
        toast.error(res.data?.message || "Unable to create post");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="qh-panel">
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarImage src={user?.profile?.profilePhoto || ""} alt="profile" />
          <AvatarFallback>{getInitials(user?.fullname)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-sm ${isRecruiter(user?.role) ? "font-bold text-amber-700 dark:text-amber-300" : "font-semibold"}`}>
              {user?.fullname || "User"}
            </p>
            {isRecruiter(user?.role) && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                ⭐ Recruiter
              </span>
            )}
          </div>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Share an update, job tip, or hiring announcement..."
            className="mt-3 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-0 transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            maxLength={2000}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <ImagePlus className="h-4 w-4" />
              Add image
              <input type="file" accept="image/*" className="hidden" onChange={handlePickImage} />
            </label>

            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Post
            </Button>
          </div>

          {previewUrl && (
            <div className="relative mt-3 w-fit">
              <img src={previewUrl} alt="preview" className="max-h-64 rounded-xl border border-slate-200 object-cover dark:border-slate-700" />
              <button
                type="button"
                onClick={handleClearImage}
                className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white"
                aria-label="Remove selected image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </form>
  );
};

export default CreatePost;
