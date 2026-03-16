import React, { useEffect } from "react";
import Navbar from "./Navbar";
import Job1 from "./Job1";
import { useDispatch, useSelector } from "react-redux";
import { setSearchedQuery } from "@/redux/jobSlice";
import useGetAllJobs from "@/hooks/useGetAllJobs";

const Browse = () => {
  useGetAllJobs();
  const { allJobs } = useSelector((store) => store.job);
  const dispatch = useDispatch();
  useEffect(() => {
    return () => {
      dispatch(setSearchedQuery(""));
    };
  }, []);
  return (
    <div className="qh-page">
      <Navbar />
      <div className="qh-shell my-10">
        <h1 className="qh-title my-6">
          Search Results {allJobs.length}
        </h1>
        {allJobs.length === 0 ? (
          <p className="qh-panel text-slate-600">
            No jobs available yet. Recruiters can add jobs from Admin / Jobs / Create.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {allJobs.map((job) => {
              return <Job1 key={job._id} job={job} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;
