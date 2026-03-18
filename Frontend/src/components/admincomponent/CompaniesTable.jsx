import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Edit2, MoreHorizontal } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const statusBadgeClass = {
  verified: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-rose-100 text-rose-700",
};

const CompaniesTable = () => {
  const { companies, searchCompanyByText } = useSelector(
    (store) => store.company
  );
  const { user } = useSelector((store) => store.auth);
  const navigate = useNavigate();
  const [filterCompany, setFilterCompany] = useState(companies);

  const getCompanyInitials = (name) =>
    String(name || "C")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  useEffect(() => {
    const filteredCompany =
      companies.length >= 0 &&
      companies.filter((company) => {
        if (!searchCompanyByText) {
          return true;
        }
        return company.name
          ?.toLowerCase()
          .includes(searchCompanyByText.toLowerCase());
      });
    setFilterCompany(filteredCompany);
  }, [companies, searchCompanyByText]);

  if (!companies) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Table>
        <TableCaption className="text-slate-500">Recent registered companies</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Logo</TableHead>
            <TableHead>Company Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filterCompany.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-slate-500">No companies added</TableCell>
            </TableRow>
          ) : (
            filterCompany?.map((company) => (
              <TableRow key={company._id}>
                <TableCell>
                  <Avatar>
                    <AvatarImage
                      src={company.logo || "default-logo-url"}
                      alt={`${company.name} logo`}
                    />
                    <AvatarFallback className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100 font-semibold">
                      {getCompanyInitials(company?.name)}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell>{company.name}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${statusBadgeClass[company.verificationStatus] || "bg-slate-100 text-slate-700"}`}
                  >
                    {company.verificationStatus || "pending"}
                  </span>
                  {company.verificationStatus === "rejected" && company.verificationNote && (
                    <p className="mt-1 text-xs text-rose-700 max-w-[220px]">
                      Reason: {company.verificationNote}
                    </p>
                  )}
                </TableCell>
                <TableCell>{company.createdAt.split("T")[0]}</TableCell>
                <TableCell className="text-right cursor-pointer">
                  {String(user?.role || "") === "Recruiter" ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="rounded-md p-1 hover:bg-slate-100">
                        <MoreHorizontal />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-32">
                        <div
                          onClick={() => navigate(`/admin/companies/${company._id}`)}
                          className="flex items-center gap-2 w-fit cursor-pointer"
                        >
                          <Edit2 className="w-4" />
                          <span>Edit</span>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span className="text-xs text-slate-500">View only</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default CompaniesTable;
