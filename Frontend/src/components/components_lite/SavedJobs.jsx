import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { BookMarked, Loader2, Trash2 } from "lucide-react";
import { JOB_API_ENDPOINT } from "@/utils/data";
import axios from "axios";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { setSavedJobIds } from "@/redux/jobSlice";
import { useNavigate } from "react-router-dom";

const SavedJobs = () => {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [workingJobId, setWorkingJobId] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const getCompanyInitials = (name) =>
    String(name || "C")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const fetchSavedJobs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${JOB_API_ENDPOINT}/saved`, {
        withCredentials: true,
      });

      if (res.data?.success) {
        const fetchedJobs = res.data.jobs || [];
        setJobs(fetchedJobs);
        dispatch(setSavedJobIds(res.data.savedJobIds || fetchedJobs.map((job) => String(job._id))));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load saved jobs");
      setJobs([]);
      dispatch(setSavedJobIds([]));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  const unsaveJob = async (jobId) => {
    try {
      setWorkingJobId(jobId);
      const res = await axios.post(
        `${JOB_API_ENDPOINT}/save/${jobId}`,
        {},
        { withCredentials: true }
      );

      if (res.data?.success) {
        setJobs((prev) => prev.filter((job) => String(job._id) !== String(jobId)));
        dispatch(setSavedJobIds(res.data.savedJobIds || []));
        toast.success("Removed from saved jobs");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to remove saved job");
    } finally {
      setWorkingJobId("");
    }
  };

  return (
    <div className="qh-page min-h-screen">
      <Navbar />
      <div className="qh-shell py-8">
        <div className="qh-panel">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="qh-title">Saved Jobs</h1>
              <p className="qh-subtitle mt-1">Track roles you bookmarked and apply when ready.</p>
            </div>
            <Button variant="outline" onClick={fetchSavedJobs} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          {loading ? (
            <div className="py-14 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
              <BookMarked className="h-7 w-7 mx-auto mb-2 text-slate-400" />
              No saved jobs yet. Go to Jobs and use bookmark icon to save roles.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
              {jobs.map((job) => (
                <div key={job._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-emerald-100 text-emerald-700">Saved</Badge>
                    <p className="text-xs text-slate-500">{String(job.createdAt || "").split("T")[0]}</p>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <Avatar>
                      <AvatarImage src={job?.company?.logo} />
                      <AvatarFallback className="bg-slate-200 text-slate-700 font-semibold">
                        {getCompanyInitials(job?.company?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-slate-900">{job?.company?.name || "Company"}</p>
                      <p className="text-xs text-slate-500">{job?.location || "NA"}</p>
                    </div>
                  </div>

                  <h3 className="qh-display text-lg font-bold text-slate-900">{job?.title}</h3>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{job?.description}</p>

                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <Badge className="bg-blue-50 text-blue-700">{job?.position} positions</Badge>
                    <Badge className="bg-amber-50 text-amber-700">{job?.salary} LPA</Badge>
                    <Badge className="bg-slate-100 text-slate-700">{job?.jobType}</Badge>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button className="flex-1" variant="outline" onClick={() => navigate(`/description/${job._id}`)}>
                      View Job
                    </Button>
                    <Button
                      className="flex-1"
                      variant="destructive"
                      onClick={() => unsaveJob(job._id)}
                      disabled={workingJobId === job._id}
                    >
                      {workingJobId === job._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedJobs;
