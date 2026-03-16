import React, { useState } from "react";
import { Button } from "../ui/button";
import { ArrowRight, Search } from "lucide-react";
import { PiBuildingOfficeBold } from "react-icons/pi";
import { useDispatch } from "react-redux";
import { setSearchedQuery } from "@/redux/jobSlice";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const [query, setQuery] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const searchjobHandler = () => {
    dispatch(setSearchedQuery(query));
    navigate("/browse");
  };
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-12 -left-24 h-72 w-72 rounded-full bg-amber-200/30 dark:bg-amber-400/20 blur-3xl" />
      <div className="pointer-events-none absolute top-10 -right-24 h-80 w-80 rounded-full bg-teal-200/30 dark:bg-teal-400/20 blur-3xl" />

      <div className="text-center max-w-5xl mx-auto px-4 py-14 md:py-20">
        <div className="flex flex-col gap-6">
          <span className="px-5 mx-auto inline-flex justify-center items-center py-2 gap-2 rounded-full bg-white/90 border border-amber-200 text-amber-700 font-semibold shadow-sm qh-chip">
            <span className="text-amber-900">
              <PiBuildingOfficeBold />
            </span>
            For students and recruiters
          </span>

          <h2 className="qh-display text-4xl md:text-6xl font-black leading-tight text-slate-900 dark:text-slate-100">
            Find Jobs Faster with
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-700 via-cyan-600 to-amber-500">
              QuickHire Job Portal
            </span>
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg max-w-3xl mx-auto">
            Search roles, apply quickly, and track progress.
          </p>

          <div className="flex w-full max-w-3xl shadow-xl border border-slate-300/70 dark:border-slate-700/70 pr-2 pl-4 py-2 rounded-full items-center gap-3 mx-auto bg-white/95 dark:bg-slate-900/70">
            <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search roles, skills, or companies"
              className="outline-none border-none w-full bg-transparent text-slate-700 dark:text-slate-200"
            />
            <Button onClick={searchjobHandler} className="rounded-full bg-slate-900 hover:bg-slate-800 px-5">
              Search
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
            <div className="qh-glass rounded-xl p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Students</p>
              <p className="text-slate-800 dark:text-slate-200 font-semibold mt-1">Build profile and apply</p>
            </div>
            <div className="qh-glass rounded-xl p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Recruiters</p>
              <p className="text-slate-800 dark:text-slate-200 font-semibold mt-1">Post and shortlist fast</p>
            </div>
            <div className="qh-glass rounded-xl p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Data Signals</p>
              <p className="text-slate-800 dark:text-slate-200 font-semibold mt-1">Built-in resume score</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
