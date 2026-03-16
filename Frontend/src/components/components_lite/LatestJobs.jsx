import React from "react";
import JobCards from "./JobCards";
import { useSelector } from "react-redux";

const LatestJobs = () => {
  const allJobs = useSelector((state) => state.jobs?.allJobs || []); // Safely access allJobs

  return (
    <div className="max-w-7xl mx-auto my-16 px-4 md:px-6">
      <h2 className="qh-display text-4xl md:text-5xl font-black text-slate-900">
        <span className="text-teal-700">Latest and Top</span> Openings
      </h2>
      <p className="text-slate-600 mt-2 max-w-2xl">
        Fresh roles updated daily.
      </p>

      {/* Job Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 my-6">
        {allJobs.length === 0 ? (
          <div className="qh-glass rounded-xl p-6 text-slate-600">
            No job available right now.
          </div>
        ) : (
          allJobs
            .slice(0, 6)
            .map((job) =>
              job?._id ? (
                <JobCards key={job._id} job={job}></JobCards>
              ) : (
                <span key={Math.random()}>Invalid Job Data</span>
              )
            )
        )}
      </div>
    </div>
  );
};

export default LatestJobs;
