import React, { useMemo, useState } from "react";
import Navbar from "./Navbar";
import { Avatar, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Contact, Download, Eye, Mail, Pen } from "lucide-react";
import { Badge } from "../ui/badge";
import AppliedJob from "./AppliedJob";
import EditProfileModal from "./EditProfileModal";
import { useSelector } from "react-redux";
import useGetAppliedJobs from "@/hooks/useGetAllAppliedJobs";
import { USER_API_ENDPOINT } from "@/utils/data";
import axios from "axios";
import { toast } from "sonner";

 
const hasResume = (user) => Boolean(user?.profile?.resume);

const metricTone = (value) => {
  if (value >= 80) return "text-green-700 bg-green-50 border-green-200";
  if (value >= 60) return "text-yellow-700 bg-yellow-50 border-yellow-200";
  return "text-red-700 bg-red-50 border-red-200";
};

const Profile = () => {
  useGetAppliedJobs();
  const [open, setOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const { allAppliedJobs } = useSelector((store) => store.job);
  const { user } = useSelector((store) => store.auth);

  const appliedJobs = useMemo(
    () =>
      (allAppliedJobs || [])
        .map((a) => a.job)
        .filter(Boolean)
        .filter((job, idx, arr) => arr.findIndex((j) => j._id === job._id) === idx),
    [allAppliedJobs]
  );

  const analyzeResume = async () => {
    if (!selectedJobId) {
      toast.error("Please select a job first.");
      return;
    }

    try {
      setAnalysisLoading(true);
      const res = await axios.get(`${USER_API_ENDPOINT}/resume/analyze/${selectedJobId}`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setAnalysis(res.data.analysis);
      }
    } catch (error) {
      const message = error.response?.data?.message || "Resume analysis failed";
      toast.error(message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const sectionEntries = Object.entries(analysis?.sectionChecks || {});
  const sectionPassCount = sectionEntries.filter(([, v]) => Boolean(v)).length;
  const sectionHealth = sectionEntries.length
    ? Math.round((sectionPassCount / sectionEntries.length) * 100)
    : 0;

  const matchedCount = analysis?.matchedKeywords?.length || 0;
  const missingCount = analysis?.missingKeywords?.length || 0;
  const keywordTotal = matchedCount + missingCount;
  const matchedRatio = keywordTotal ? Math.round((matchedCount / keywordTotal) * 100) : 0;

  const formatSectionLabel = (key) =>
    key
      .replace(/^has/, "")
      .replace(/([A-Z])/g, " $1")
      .trim();

  return (
    <div className="qh-page">
      <Navbar />

      <div className="max-w-4xl mx-auto qh-panel my-6">
        <div className="flex justify-between">
          <div className="flex items-center gap-5">
            <Avatar className="cursor-pointer h-24 w-24">
              <AvatarImage
                src={user?.profile?.profilePhoto}
                alt="@shadcn"
              />
            </Avatar>
            <div>
              <h1 className=" font-medium text-xl">{user?.fullname}</h1>
              <p>{user?.profile?.bio}</p>
            </div>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="text-right"
            variant="outline"
          >
            <Pen />
          </Button>
        </div>
        <div className="my-5">
          <div className="flex items-center gap-3 my-2">
            <Mail />
            <span className="">
              <a href={`mailto:${user?.email}`}>{user?.email}</a>
            </span>
          </div>
          <div className="flex items-center gap-3 my-2">
            <Contact />
            <span className="">
              <a href={`tel:${user?.phoneNumber}`}>{user?.phoneNumber}</a>
            </span>
          </div>
        </div>

        <div>
          <div className="my-5">
            <h1>Skills</h1>
            <div className="flex items-center gap-1">
              {user?.profile?.skills?.length !== 0 ? (
                user?.profile?.skills.map((item, index) => (
                  <Badge key={index}>{item}</Badge>
                ))
              ) : (
                <span>NA</span>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <label className="text-md font-bold"> Resume</label>
            <div>
              {hasResume(user) ? (
                <div className="flex items-center gap-3">
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`${USER_API_ENDPOINT}/resume/${user?._id}/download`}
                    download={user?.profile?.resumeOriginalname || "resume.pdf"}
                    className="text-blue-600 hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <Download className="h-4 w-4" />
                    Download
                    {user?.profile?.resumeOriginalname ? ` ${user?.profile?.resumeOriginalname}` : " Resume"}
                  </a>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`${USER_API_ENDPOINT}/resume/${user?._id}/preview`}
                    className="text-gray-700 dark:text-slate-300 hover:underline cursor-pointer inline-flex items-center"
                    title="Preview Resume"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                </div>
              ) : (
                <span>No Resume Found</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h2 className="font-semibold mb-2">Resume Analyzer</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">
            Analyze your uploaded resume against a target job and get ATS-style match score.
          </p>

          <div className="flex flex-col md:flex-row gap-2">
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
            >
              <option value="">Select a job to analyze against</option>
              {appliedJobs.map((job) => (
                <option key={job._id} value={job._id}>
                  {job.title} - {job.company?.name || "Company"}
                </option>
              ))}
            </select>
            <Button onClick={analyzeResume} disabled={analysisLoading || !hasResume(user)}>
              {analysisLoading ? "Analyzing..." : "Analyze Resume"}
            </Button>
          </div>

          {!hasResume(user) && (
            <p className="text-xs text-red-600 mt-2">Upload a PDF resume first to run analyzer.</p>
          )}

          {analysis && (
            <div className="mt-4 border border-gray-200 rounded-md p-3 bg-white">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                <h3 className="font-semibold text-gray-800 dark:text-slate-100">Resume Analysis Dashboard</h3>
                <Badge
                  className={`${
                    analysis.badge === "GREEN"
                      ? "bg-green-600"
                      : analysis.badge === "AMBER"
                      ? "bg-yellow-500"
                      : "bg-red-600"
                  } text-white`}
                >
                  {analysis.verdict}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                <div className={`rounded-md border p-2 ${metricTone(analysis.atsScore)}`}>
                  <p className="text-xs uppercase tracking-wide">ATS Score</p>
                  <p className="text-lg font-bold">{analysis.atsScore}%</p>
                </div>
                <div className={`rounded-md border p-2 ${metricTone(analysis.keywordCoverage)}`}>
                  <p className="text-xs uppercase tracking-wide">Keyword Coverage</p>
                  <p className="text-lg font-bold">{analysis.keywordCoverage}%</p>
                </div>
                <div className="rounded-md border p-2 bg-slate-50 border-slate-200 text-slate-700">
                  <p className="text-xs uppercase tracking-wide">Matched Terms</p>
                  <p className="text-lg font-bold">{matchedCount}</p>
                </div>
                <div className="rounded-md border p-2 bg-slate-50 border-slate-200 text-slate-700">
                  <p className="text-xs uppercase tracking-wide">Missing Terms</p>
                  <p className="text-lg font-bold">{missingCount}</p>
                </div>
              </div>

              <div className="rounded-md border border-slate-200 p-3 bg-slate-50 mb-3">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                  <span>Keyword Match Ratio</span>
                  <span>{matchedRatio}%</span>
                </div>
                <div className="h-2 w-full rounded bg-slate-200 overflow-hidden mb-2">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${matchedRatio}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                  <span>Section Health</span>
                  <span>{sectionHealth}%</span>
                </div>
                <div className="h-2 w-full rounded bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${sectionHealth}%` }}
                  />
                </div>
              </div>

              <div className="rounded-md border border-slate-200 overflow-hidden mb-3">
                <div className="grid grid-cols-12 bg-slate-100 text-xs font-semibold text-slate-700 px-3 py-2">
                  <span className="col-span-8">Section Signal</span>
                  <span className="col-span-4 text-right">Status</span>
                </div>
                {sectionEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="grid grid-cols-12 px-3 py-2 text-sm border-t border-slate-100"
                  >
                    <span className="col-span-8 text-slate-700">{formatSectionLabel(key)}</span>
                    <span className="col-span-4 text-right">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                          value
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {value ? "Detected" : "Missing"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Matched Keywords</h3>
                  <div className="flex gap-1 flex-wrap mt-1">
                  {analysis.matchedKeywords?.length ? (
                    analysis.matchedKeywords.map((k) => (
                      <Badge key={k} className="bg-green-100 text-green-700 hover:bg-green-100">
                        {k}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-slate-400">No matches found</span>
                  )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold">Missing Keywords</h3>
                  <div className="flex gap-1 flex-wrap mt-1">
                  {analysis.missingKeywords?.length ? (
                    analysis.missingKeywords.map((k) => (
                      <Badge key={k} className="bg-red-100 text-red-700 hover:bg-red-100">
                        {k}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-slate-400">No major keyword gaps</span>
                  )}
                  </div>
                </div>
              </div>

              <p className="text-xs mt-3 text-gray-500 dark:text-slate-400">{analysis.note}</p>
            </div>
          )}
        </div>
      </div>
      <div className="max-w-4xl mx-auto qh-panel mb-6">
        <h1 className="text-lg my-3 font-bold">Applied Jobs</h1>

        {/* Add Application Table */}
        <AppliedJob />
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal open={open} setOpen={setOpen} />
    </div>
  );
};

export default Profile;
