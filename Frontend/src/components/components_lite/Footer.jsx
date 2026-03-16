import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <div className="mt-14 border-t border-slate-200/80 dark:border-slate-700/70 bg-white/80 dark:bg-slate-950/60 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="qh-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              <span className="text-teal-700">Quick</span>
              <span className="text-amber-600">Hire</span>
              <span className="text-slate-900 dark:text-slate-100"> Job Portal</span>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Fast hiring, simple flow.
            </p>
          </div>

          <div className="text-center md:text-right text-sm text-slate-600 dark:text-slate-300">
            <p>© 2026 QuickHire Job Portal. All rights reserved.</p>
            <p className="mt-1">
              <Link className="hover:text-slate-900 dark:hover:text-white" to={"/PrivacyPolicy"}>Privacy Policy</Link>
              <span className="mx-2">|</span>
              <Link className="hover:text-slate-900 dark:hover:text-white" to={"/TermsofService"}>Terms of Service</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
