import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import FilterCard from "./Filtercard";
import Job1 from "./Job1";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import axios from "axios";
import { JOB_API_ENDPOINT } from "@/utils/data";
import { setSavedJobIds } from "@/redux/jobSlice";
import { useDispatch } from "react-redux";
import { Button } from "../ui/button";

const Jobs = () => {
  const { allJobs, searchedQuery, savedJobIds, selectedFilters } = useSelector((store) => store.job);
  const { user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const [filterJobs, setFilterJobs] = useState(allJobs);
  const [viewMode, setViewMode] = useState("all");

  const matchLocation = (job, location) => {
    if (!location) return true;
    const current = String(job?.location || "").toLowerCase();
    const target = String(location).toLowerCase();
    if (target === "bengaluru") return current.includes("bengaluru") || current.includes("bangalore");
    return current.includes(target);
  };

  const matchTechnology = (job, technology) => {
    if (!technology) return true;
    const target = String(technology).toLowerCase();
    const bag = [
      String(job?.title || ""),
      String(job?.description || ""),
      ...(Array.isArray(job?.requirements) ? job.requirements : []),
    ]
      .join(" ")
      .toLowerCase();

    if (target === "mern") {
      return ["mongodb", "express", "react", "node"].every((k) => bag.includes(k));
    }
    if (target === "full stack") {
      return bag.includes("full stack") || (bag.includes("frontend") && bag.includes("backend"));
    }
    if (target === "node") return bag.includes("node");
    if (target === "data scientist") return bag.includes("data scientist") || bag.includes("ml");
    return bag.includes(target);
  };

  const matchExperience = (job, selectedExperience) => {
    if (!selectedExperience) return true;
    const exp = Number(job?.experienceLevel || 0);
    if (selectedExperience === "0-3 years") return exp >= 0 && exp < 3;
    if (selectedExperience === "3-5 years") return exp >= 3 && exp < 5;
    if (selectedExperience === "5-7 years") return exp >= 5 && exp < 7;
    if (selectedExperience === "7+ years") return exp >= 7;
    return true;
  };

  const matchSalary = (job, selectedSalary) => {
    if (!selectedSalary) return true;
    const salary = Number(job?.salary || 0);
    if (selectedSalary === "0-10 LPA") return salary >= 0 && salary < 10;
    if (selectedSalary === "10-15 LPA") return salary >= 10 && salary < 15;
    if (selectedSalary === "15-20 LPA") return salary >= 15 && salary < 20;
    if (selectedSalary === "20+ LPA") return salary >= 20;
    return true;
  };

  useEffect(() => {
    const textQuery = String(searchedQuery || "").trim().toLowerCase();

    const filteredJobs = allJobs.filter((job) => {
      const textOk = !textQuery || (() => {
      const query = searchedQuery.toLowerCase();
      const salaryText = String(job.salary ?? "").toLowerCase();
      const experienceText = String(job.experienceLevel ?? "").toLowerCase();
      return (
        job.title?.toLowerCase().includes(query) ||
        job.description?.toLowerCase().includes(query) ||
        job.location?.toLowerCase().includes(query) ||
        (Array.isArray(job.requirements) && job.requirements.join(" ").toLowerCase().includes(query)) ||
        experienceText.includes(query) ||
        salaryText.includes(query)
      );
      })();

      const locationOk = matchLocation(job, selectedFilters?.location);
      const technologyOk = matchTechnology(job, selectedFilters?.technology);
      const experienceOk = matchExperience(job, selectedFilters?.experience);
      const salaryOk = matchSalary(job, selectedFilters?.salary);

      return textOk && locationOk && technologyOk && experienceOk && salaryOk;
    });

    setFilterJobs(filteredJobs);
  }, [allJobs, searchedQuery, selectedFilters]);

  useEffect(() => {
    const fetchSavedJobIds = async () => {
      if (String(user?.role || "") !== "Student") {
        dispatch(setSavedJobIds([]));
        return;
      }

      try {
        const res = await axios.get(`${JOB_API_ENDPOINT}/saved`, {
          withCredentials: true,
        });

        if (res.data?.success) {
          dispatch(setSavedJobIds(res.data.savedJobIds || []));
        }
      } catch {
        dispatch(setSavedJobIds([]));
      }
    };

    fetchSavedJobIds();
  }, [dispatch, user?.role]);

  const normalizedSavedIds = Array.isArray(savedJobIds) ? savedJobIds : [];
  const visibleJobs =
    viewMode === "saved"
      ? filterJobs.filter((job) => normalizedSavedIds.includes(String(job?._id || "")))
      : filterJobs;

  return (
    <div className="qh-page">
      <Navbar />
      <div className="qh-shell mt-6 pb-8">
        {String(user?.role || "") === "Student" && (
          <div className="qh-panel mb-4 flex flex-wrap items-center gap-2">
            <Button
              variant={viewMode === "all" ? "default" : "outline"}
              onClick={() => setViewMode("all")}
            >
              All Jobs
            </Button>
            <Button
              variant={viewMode === "saved" ? "default" : "outline"}
              onClick={() => setViewMode("saved")}
            >
              Saved Jobs ({normalizedSavedIds.length})
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {viewMode !== "saved" && (
            <div className="lg:col-span-3">
              <FilterCard />
            </div>
          )}

          {visibleJobs.length <= 0 ? (
            <span className={`qh-panel ${viewMode === "saved" ? "lg:col-span-12" : "lg:col-span-9"}`}>
              {viewMode === "saved"
                ? "No saved jobs yet. Use Save or bookmark button on job cards."
                : "No jobs found. Ask a recruiter to post jobs from the admin panel."}
            </span>
          ) : (
            <div className={`${viewMode === "saved" ? "lg:col-span-12" : "lg:col-span-9"} h-[88vh] overflow-y-auto pb-5 pr-1`}>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {visibleJobs.map((job) => (
                  <motion.div
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.4 }}
                    key={job._id}
                  >
                    <Job1 job={job} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Jobs;
