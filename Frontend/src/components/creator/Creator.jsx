import React from "react";
import Navbar from "../components_lite/Navbar";

const Creator = () => {
  return (
    <div className="qh-page">
      <Navbar />
      <div className="qh-shell py-10">
        <div className="qh-panel p-8">
          <p className="inline-block rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            About This Project
          </p>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-slate-100">QuickHire Job Portal - Major Project</h1>
          <p className="mt-4 text-gray-700 dark:text-slate-300 leading-7">
            This project is maintained and customized by me as my major project work.
            I have set up the complete MERN stack locally and connected it to my own MongoDB database.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="qh-panel p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">My Role</h2>
            <ul className="mt-3 list-disc pl-5 text-gray-700 dark:text-slate-300 space-y-2">
              <li>Backend setup and MongoDB integration</li>
              <li>Frontend fixes and UI improvements</li>
              <li>Authentication, job and application flow testing</li>
              <li>Feature customization for final submission</li>
            </ul>
          </div>

          <div className="qh-panel p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Project Stack</h2>
            <ul className="mt-3 list-disc pl-5 text-gray-700 dark:text-slate-300 space-y-2">
              <li>React + Vite + Redux Toolkit</li>
              <li>Node.js + Express.js</li>
              <li>MongoDB + Mongoose</li>
              <li>Tailwind CSS</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-amber-900">Attribution Note</h2>
          <p className="mt-2 text-amber-900">
            This work was initialized from an open repository and then adapted, configured,
            debugged and extended by me for academic use.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Creator;
