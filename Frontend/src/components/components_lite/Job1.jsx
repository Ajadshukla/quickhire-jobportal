import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { BookMarked, Bookmark, Loader2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { JOB_API_ENDPOINT } from "@/utils/data";
import axios from "axios";
import { setSavedJobIds } from "@/redux/jobSlice";
import { toast } from "sonner";

const Job1 = ({ job }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const savedJobIds = useSelector((store) =>
    Array.isArray(store?.job?.savedJobIds) ? store.job.savedJobIds : []
  );
  const { user } = useSelector((store) => store.auth);
  const [saving, setSaving] = React.useState(false);
  const isSaved = savedJobIds.includes(String(job?._id || ""));

  const companyInitials = String(job?.company?.name || "C")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const daysAgoFunction = (mongodbTime) => {
    const createdAt = new Date(mongodbTime);
    const currentTime = new Date();
    const timeDifference = currentTime - createdAt;
    return Math.floor(timeDifference / (1000 * 24 * 60 * 60));
  };

  const toggleSaveHandler = async () => {
    if (!user) {
      toast.error("Please login to save jobs");
      navigate("/login");
      return;
    }

    if (String(user.role || "") !== "Student") {
      toast.error("Only students can save jobs");
      return;
    }

    try {
      setSaving(true);
      const res = await axios.post(
        `${JOB_API_ENDPOINT}/save/${job?._id}`,
        {},
        { withCredentials: true }
      );

      if (res.data?.success) {
        dispatch(setSavedJobIds(res.data.savedJobIds || []));
        toast.success(res.data.message || (res.data.isSaved ? "Job saved" : "Job unsaved"));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update saved jobs");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="qh-panel p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_30px_rgba(15,23,42,0.12)]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {daysAgoFunction(job?.createdAt) === 0
            ? "Today"
            : `${daysAgoFunction(job?.createdAt)} days ago`}
        </p>
        <Button
          variant="outline"
          className="rounded-full"
          size="icon"
          onClick={toggleSaveHandler}
          disabled={saving}
          title={isSaved ? "Remove bookmark" : "Save job"}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSaved ? (
            <BookMarked className="h-4 w-4 text-emerald-700" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2 my-2">
        <Button className="p-6" variant="outline" size="icon">
          <Avatar>
            <AvatarImage src={job?.company?.logo} />
            <AvatarFallback className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100 font-semibold">
              {companyInitials}
            </AvatarFallback>
          </Avatar>
        </Button>
        <div>
          <h1 className="qh-display font-medium text-lg text-slate-900">{job?.company?.name}</h1>
          <p className="text-sm text-slate-500">India</p>
        </div>
      </div>

      <div>
        <h1 className="qh-display font-bold text-lg my-2 text-slate-900">{job?.title}</h1>
        <p className="text-sm text-slate-600 line-clamp-3">{job?.description}</p>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <Badge className={"bg-blue-50 text-blue-700 border border-blue-100 font-semibold"}>
          {job?.position} Positions
        </Badge>
        <Badge className={"bg-rose-50 text-rose-700 border border-rose-100 font-semibold"}>
          {job?.jobType}
        </Badge>
        <Badge className={"bg-amber-50 text-amber-700 border border-amber-100 font-semibold qh-code"}>
          {job?.salary}LPA
        </Badge>
      </div>
      <div className="flex items-center gap-4 mt-4">
        <Button
          onClick={() => navigate(`/description/${job?._id}`)}
          variant="outline"
        >
          Details
        </Button>
        <Button
          className={isSaved ? "bg-emerald-700 hover:bg-emerald-600" : "bg-slate-900 hover:bg-slate-800"}
          onClick={toggleSaveHandler}
          disabled={saving}
        >
          {saving ? "Saving..." : isSaved ? "Saved" : "Save"}
        </Button>
      </div>
    </div>
  );
};

export default Job1;














// import React from "react";
// import { Button } from "../ui/button";
// import { Bookmark, BookMarked } from "lucide-react";
// import { Avatar, AvatarImage } from "../ui/avatar";
// import { Badge } from "../ui/badge";
// import { useNavigate } from "react-router-dom";

// const Job1 = ({ job }) => {
//   // Destructure properties from the job object.
//   const {
//     company,
//     title,
//     description,
//     position,
//     salary,
//     location,
//     jobType,
//     _id,
//   } = job;

//   // For bookmarking feature
//   const [isBookmarked, setIsBookmarked] = React.useState(false);

//   // Navigation hook
//   const navigate = useNavigate();
//   const daysAgo = (mongodbTime) => {
//     const createdAt = new Date(mongodbTime);
//     const currentTime = new Date();
//     const timeDiff = currentTime - createdAt;
//     return Math.floor(timeDiff / (1000 * 24 * 60 * 60));
//   };

//   return (
//     <div className="p-5 rounded-md shadow-xl bg-white border border-gray-200 cursor-pointer hover:shadow-2xl hover:shadow-blue-200 hover:p-3">
//       {/* Job time and bookmark button */}
//       <div className="flex items-center justify-between">
//         <p className="text-sm text-gray-600">
//           {daysAgo(job?.createdAt) === 0
//             ? "Today"
//             : `${daysAgo(job?.createdAt)} days ago`}
//         </p>
//         <Button
//           variant="outline"
//           className="rounded-full"
//           size="icon"
//           onClick={() => setIsBookmarked(!isBookmarked)}
//         >
//           {isBookmarked ? <BookMarked /> : <Bookmark />}
//         </Button>
//       </div>

//       {/* Company info and avatar */}
//       <div className="flex items-center gap-2 my-2">
//         <Button className="p-6" variant="outline" size="icon">
//           <Avatar>
//             <AvatarImage
//               src={job?.company?.logo}
//             />
//           </Avatar>
//         </Button>
//         <div>
//           <h1 className="text-lg font-medium">{job?.company?.name}</h1>
//           <p className="text-sm text-gray-600">India</p>
//         </div>
//       </div>

//       {/* Job title, description, and job details */}
//       <div>
//         <h2 className="font-bold text-lg my-2">{title}</h2>
//         <p className="text-sm text-gray-600">{description}</p>
//         <div className="flex gap-2 items-center mt-4">
//           <Badge className="text-blue-600 font-bold" variant="ghost">
//             {position} Open Positions
//           </Badge>
//           <Badge className="text-[#FA4F09] font-bold" variant="ghost">
//             {salary} LPA
//           </Badge>
//           <Badge className="text-[#6B3AC2] font-bold" variant="ghost">
//             {location}
//           </Badge>
//           <Badge className="text-black font-bold" variant="ghost">
//             {jobType}
//           </Badge>
//         </div>
//       </div>

//       {/* Actions: Details and Save for Later */}
//       <div className="flex items-center gap-4 mt-4">
//         <Button
//           onClick={() => navigate(`/description/${_id}`)}
//           variant="outline"
//           className="font-bold rounded-sm"
//         >
//           Details
//         </Button>
//         <Button
//           variant="outline"
//           className="bg-[#6B3AC2] text-white font-bold rounded-sm"
//         >
//           Save For Later
//         </Button>
//       </div>
//     </div>
//   );
// };

// export default Job1;
