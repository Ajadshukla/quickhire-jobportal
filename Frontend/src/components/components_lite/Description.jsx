import React, { useEffect, useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useParams } from "react-router-dom";
import { JOB_API_ENDPOINT, APPLICATION_API_ENDPOINT } from "@/utils/data";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setSingleJob } from "@/redux/jobSlice";
import { toast } from "sonner";
import Navbar from "./Navbar";

const Description = () => {
  const params = useParams();
  const jobId = params.id;

  const { singleJob } = useSelector((store) => store.job);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useSelector((store) => store.auth);

  const isIntiallyApplied =
    singleJob?.application?.some(
      (application) => application.applicant === user?._id
    ) || false;
  const [isApplied, setIsApplied] = useState(isIntiallyApplied);

  const applyJobHandler = async () => {
    try {
      const res = await axios.get(
        `${APPLICATION_API_ENDPOINT}/apply/${jobId}`,
        { withCredentials: true }
      );
      if (res.data.success) {
        setIsApplied(true);
        const updateSingleJob = {
          ...singleJob,
          applications: [...singleJob.applications, { applicant: user?._id }],
        };
        dispatch(setSingleJob(updateSingleJob));
        console.log(res.data);
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error.message);
      toast.error(error.response.data.message);
    }
  };

  useEffect(() => {
    const fetchSingleJobs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${JOB_API_ENDPOINT}/get/${jobId}`, {
          withCredentials: true,
        });
        console.log("API Response:", res.data);
        if (res.data.status) {
          dispatch(setSingleJob(res.data.job));
          setIsApplied(
            res.data.job.applications.some(
              (application) => application.applicant === user?._id
            )
          );
        } else {
          setError("Failed to fetch jobs.");
        }
      } catch (error) {
        console.error("Fetch Error:", error);
        setError(error.message || "An error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchSingleJobs();
  }, [jobId, dispatch, user?._id]);
  console.log("single jobs", singleJob);

  if (!singleJob) {
    return <div className="qh-page"><Navbar /><div className="qh-shell py-10">Loading...</div></div>;
  }

  return (
    <div className="qh-page">
      <Navbar />
      <div className="qh-shell py-8">
        <div className="qh-panel">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="qh-title text-xl md:text-2xl">{singleJob?.title}</h1>
            <div className="flex gap-2 items-center mt-4 flex-wrap">
              <Badge className={"bg-blue-50 text-blue-700 border border-blue-100 font-semibold"}>
                {singleJob?.position} Open Positions
              </Badge>
              <Badge className={"bg-amber-50 text-amber-700 border border-amber-100 font-semibold qh-code"}>
                {singleJob?.salary}LPA
              </Badge>
              <Badge className={"bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold"}>
                {singleJob?.location}
              </Badge>
              <Badge className={"bg-slate-100 text-slate-700 border border-slate-200 font-semibold"}>
                {singleJob?.jobType}
              </Badge>
            </div>
          </div>
          <div>
            <Button
              onClick={isApplied ? null : applyJobHandler}
              disabled={isApplied}
              className={`rounded-lg ${
                isApplied
                  ? "bg-slate-500 cursor-not-allowed"
                  : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              {isApplied ? "Already Applied" : "Apply"}
            </Button>
          </div>
        </div>
        <h1 className="border-b border-b-slate-300 font-medium py-4 text-slate-700">
          {singleJob?.description}
        </h1>
        <div className="my-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          <h1 className="font-bold my-1">
            Role:{" "}
            <span className="pl-2 font-normal text-slate-700">
              {singleJob?.position} Open Positions
            </span>
          </h1>
          <h1 className="font-bold my-1">
            Location:{" "}
            <span className="pl-2 font-normal text-slate-700">
              {" "}
              {singleJob?.location}
            </span>
          </h1>
          <h1 className="font-bold my-1">
            Salary:{" "}
            <span className="pl-2 font-normal text-slate-700 qh-code">
              {singleJob?.salary} LPA
            </span>
          </h1>
          <h1 className="font-bold my-1">
            Experience:{" "}
            <span className="pl-2 font-normal text-slate-700">
              {singleJob?.experienceLevel} Year
            </span>
          </h1>
          <h1 className="font-bold my-1">
            Total Applicants:{" "}
            <span className="pl-2 font-normal text-slate-700">
              {singleJob?.applications?.length}
            </span>
          </h1>
          <h1 className="font-bold my-1">
            Job Type:
            <span className="pl-2 font-normal text-slate-700">
              {singleJob?.jobType}
            </span>
          </h1>
          <h1 className="font-bold my-1">
            Post Date:
            <span className="pl-2 font-normal text-slate-700 qh-code">
              {singleJob?.createdAt.split("T")[0]}
            </span>
          </h1>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Description;
