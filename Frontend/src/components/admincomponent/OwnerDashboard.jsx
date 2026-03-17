import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components_lite/Navbar";
import axios from "axios";
import { OWNER_API_ENDPOINT } from "@/utils/data";
import { toast } from "sonner";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const metricCards = (stats) => [
  { label: "Total Users", value: stats.totalUsers ?? 0 },
  { label: "Students", value: stats.students ?? 0 },
  { label: "Recruiters", value: stats.recruiters ?? 0 },
  { label: "Blocked Users", value: stats.blockedUsers ?? 0 },
  { label: "Companies", value: stats.totalCompanies ?? 0 },
  { label: "Pending Verification", value: stats.pendingCompanies ?? 0 },
  { label: "Verified Companies", value: stats.verifiedCompanies ?? 0 },
  { label: "Applications", value: stats.totalApplications ?? 0 },
];

const OwnerDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyTab, setCompanyTab] = useState("queue");
  const [verificationNotes, setVerificationNotes] = useState({});

  const [userSearch, setUserSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");

  const confirmAction = (message) => {
    if (typeof window === "undefined") return true;
    return window.confirm(message);
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const [statsRes, usersRes, companiesRes] = await Promise.all([
        axios.get(`${OWNER_API_ENDPOINT}/dashboard`, { withCredentials: true }),
        axios.get(`${OWNER_API_ENDPOINT}/users`, { withCredentials: true }),
        axios.get(`${OWNER_API_ENDPOINT}/companies`, { withCredentials: true }),
      ]);

      if (statsRes.data?.success) setStats(statsRes.data.stats || {});
      if (usersRes.data?.success) setUsers(usersRes.data.users || []);
      if (companiesRes.data?.success) setCompanies(companiesRes.data.companies || []);
    } catch (error) {
      const msg = error.response?.data?.message || "Unable to load owner dashboard";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.fullname || ""} ${u.email || ""} ${u.role || ""}`.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const filteredCompanies = useMemo(() => {
    const q = companySearch.trim().toLowerCase();
    const base =
      companyTab === "queue"
        ? companies.filter((c) => ["pending", "rejected"].includes(c.verificationStatus))
        : companyTab === "verified"
        ? companies.filter((c) => c.verificationStatus === "verified")
        : companies;

    if (!q) return base;
    return base.filter((c) =>
      `${c.name || ""} ${c.location || ""} ${c.verificationStatus || ""} ${c.website || ""} ${c.description || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [companies, companySearch, companyTab]);

  const toggleBlock = async (user) => {
    const nextBlocked = !user.isBlocked;

    const proceed = confirmAction(
      nextBlocked
        ? `Block ${user.fullname}? They will not be able to login.`
        : `Unblock ${user.fullname}? They can login again.`
    );
    if (!proceed) return;

    try {
      const res = await axios.put(
        `${OWNER_API_ENDPOINT}/users/${user._id}/block`,
        {
          isBlocked: nextBlocked,
          reason: nextBlocked ? "Policy/Trust violation" : "Access restored by owner",
        },
        { withCredentials: true }
      );

      if (res.data?.success) {
        toast.success(res.data.message);
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, isBlocked: nextBlocked } : u))
        );
        setStats((prev) => ({
          ...prev,
          blockedUsers: Math.max(0, (prev.blockedUsers || 0) + (nextBlocked ? 1 : -1)),
        }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update user status");
    }
  };

  const updateCompanyStatus = async (companyId, status) => {
    const typedNote = String(verificationNotes[companyId] || "").trim();
    const note =
      status === "rejected"
        ? typedNote
        : status === "verified"
        ? "Verified by owner"
        : "Moved back to review queue";

    if (status === "rejected" && !note) {
      toast.error("Please enter rejection reason so recruiter can update and resubmit");
      return;
    }

    const proceed = confirmAction(
      status === "verified"
        ? "Verify this company now? Recruiter can start posting jobs."
        : status === "rejected"
        ? "Reject this company? Recruiter will need to update and resubmit."
        : "Move this company back to pending review queue?"
    );
    if (!proceed) return;

    try {
      const res = await axios.put(
        `${OWNER_API_ENDPOINT}/companies/${companyId}/verify`,
        {
          status,
          note,
        },
        { withCredentials: true }
      );

      if (res.data?.success) {
        toast.success(res.data.message);
        setVerificationNotes((prev) => ({ ...prev, [companyId]: "" }));
        fetchDashboard();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update company verification");
    }
  };

  return (
    <div className="qh-page min-h-screen">
      <Navbar />
      <div className="qh-shell py-8 space-y-6">
        <div className="qh-panel">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="qh-title">Owner Control Center</h1>
              <p className="qh-subtitle mt-1">
                Verify companies, block suspicious accounts, and maintain trust across the portal.
              </p>
            </div>
            <Button onClick={fetchDashboard} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            {metricCards(stats).map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 p-4"
              >
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  {item.label}
                </p>
                <p className="qh-display text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="qh-panel">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="qh-display text-xl font-bold">Users Moderation</h2>
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users by name/email/role"
              className="w-full md:w-80"
            />
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2">{user.fullname}</td>
                    <td className="py-2">{user.email}</td>
                    <td className="py-2">{user.role}</td>
                    <td className="py-2">
                      {user.isBlocked ? (
                        <Badge className="bg-red-100 text-red-700">Blocked</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {user.role === "Admin" ? (
                        <Badge className="bg-slate-200 text-slate-700">Owner</Badge>
                      ) : (
                        <Button
                          variant={user.isBlocked ? "outline" : "destructive"}
                          onClick={() => toggleBlock(user)}
                        >
                          {user.isBlocked ? "Unblock" : "Block"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="qh-panel">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="qh-display text-xl font-bold">Company Verification Queue</h2>
            <div className="flex gap-2">
              <Button
                variant={companyTab === "queue" ? "default" : "outline"}
                onClick={() => setCompanyTab("queue")}
              >
                Pending + Rejected
              </Button>
              <Button
                variant={companyTab === "verified" ? "default" : "outline"}
                onClick={() => setCompanyTab("verified")}
              >
                Verified
              </Button>
              <Button
                variant={companyTab === "all" ? "default" : "outline"}
                onClick={() => setCompanyTab("all")}
              >
                All
              </Button>
            </div>
            <Input
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="Search by company, location, website or description"
              className="w-full md:w-80"
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Queue size: {filteredCompanies.length} {companyTab === "queue" ? "companies needing attention" : "records"}
          </p>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2">Company</th>
                  <th className="py-2">Owner</th>
                  <th className="py-2">Data For Verification</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Owner Note</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-500">
                      No companies found for this view.
                    </td>
                  </tr>
                ) : (
                filteredCompanies.map((company) => (
                  <tr key={company._id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2">
                      <p className="font-medium">{company.name}</p>
                      <p className="text-xs text-slate-500">{company.location || "NA"}</p>
                    </td>
                    <td className="py-2">
                      {company.userId?.fullname || "Unknown"}
                      <p className="text-xs text-slate-500">{company.userId?.email || "NA"}</p>
                    </td>
                    <td className="py-2">
                      <p className="text-xs text-slate-700 break-all">
                        <span className="font-semibold">Website:</span> {company.website || "NA"}
                      </p>
                      <p className="text-xs text-slate-700 mt-1 line-clamp-2">
                        <span className="font-semibold">Description:</span> {company.description || "NA"}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Last updated: {company.updatedAt ? String(company.updatedAt).split("T")[0] : "NA"}
                      </p>
                    </td>
                    <td className="py-2">
                      {company.verificationStatus === "verified" && (
                        <>
                          <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge>
                          <p className="text-[11px] mt-1 text-slate-500">
                            {company.verifiedBy?.fullname ? `By ${company.verifiedBy.fullname}` : "By owner"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {company.verifiedAt ? String(company.verifiedAt).split("T")[0] : ""}
                          </p>
                        </>
                      )}
                      {company.verificationStatus === "pending" && (
                        <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
                      )}
                      {company.verificationStatus === "rejected" && (
                        <Badge className="bg-rose-100 text-rose-700">Rejected</Badge>
                      )}
                    </td>
                    <td className="py-2">
                      <p className="text-xs text-slate-600 max-w-[240px] line-clamp-3">
                        {company.verificationNote || "No note yet"}
                      </p>
                      {company.verificationStatus !== "verified" && (
                        <Input
                          className="mt-2"
                          placeholder="Rejection reason for recruiter"
                          value={verificationNotes[company._id] || ""}
                          onChange={(e) =>
                            setVerificationNotes((prev) => ({
                              ...prev,
                              [company._id]: e.target.value,
                            }))
                          }
                        />
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          variant="outline"
                          disabled={company.verificationStatus === "pending"}
                          onClick={() => updateCompanyStatus(company._id, "pending")}
                        >
                          Pending
                        </Button>
                        <Button
                          disabled={company.verificationStatus === "verified"}
                          onClick={() => updateCompanyStatus(company._id, "verified")}
                        >
                          Verify
                        </Button>
                        <Button
                          variant="destructive"
                          disabled={company.verificationStatus === "rejected"}
                          onClick={() => updateCompanyStatus(company._id, "rejected")}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
