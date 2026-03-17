import React from "react";
import { Badge } from "../ui/badge";
import { useNavigate } from "react-router-dom";


const JobCards = ({job}) => {
  const navigate = useNavigate();
 
  return (
    <div
      onClick={() => navigate(`/description/${job._id}`)}
      className="group p-5 rounded-2xl qh-glass cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_30px_rgba(15,23,42,0.15)]"
    >
      <div>
        <h1 className="qh-display text-lg font-semibold text-slate-900"> {job?.company?.name || "Company"} </h1>
        <p className="text-sm text-slate-500">India</p>
      </div>
      <div>
        <h2 className="qh-display font-bold text-xl my-2 text-slate-900 group-hover:text-teal-700 transition-colors">{job.title}</h2>
        <p className="text-sm text-slate-600 line-clamp-3">
          {
            job.description
          }
        </p>
      </div>
      <div className="flex gap-2 items-center mt-4 flex-wrap">
        <Badge className={"bg-blue-50 text-blue-700 border border-blue-100 font-semibold"}>
          {job.position} Open Positions
        </Badge>
        <Badge className={"bg-amber-50 text-amber-700 border border-amber-100 font-semibold qh-code"}>
          {job.salary}LPA
        </Badge>
        <Badge className={"bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold"}>
          {job.location}
        </Badge>
        <Badge className={"bg-slate-100 text-slate-700 border border-slate-200 font-semibold"}>
          {job.jobType}
        </Badge>
      </div>
    </div>
  );
};

export default JobCards;
