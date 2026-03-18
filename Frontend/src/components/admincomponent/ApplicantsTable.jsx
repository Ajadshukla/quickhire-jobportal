import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Download, Eye, MoreHorizontal } from "lucide-react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import axios from "axios";
import { APPLICATION_API_ENDPOINT } from "@/utils/data";
import { USER_API_ENDPOINT } from "@/utils/data";
import { setAllApplicants } from "@/redux/applicationSlice";

const shortlistingStatus = ["Accepted", "Rejected"];

const ApplicantsTable = () => {
  const { applicants } = useSelector((store) => store.application);
  const dispatch = useDispatch();
  const [updatingId, setUpdatingId] = useState("");

  const confirmAction = (message) => {
    if (typeof window === "undefined") return true;
    return window.confirm(message);
  };

  const statusHandler = async (status, id) => {
    const normalized = String(status || "").toLowerCase();
    const currentStatus = (applicants?.applications || []).find((item) => item._id === id)?.status;
    if (String(currentStatus || "") === normalized) {
      toast.info(`Already marked as ${normalized}`);
      return;
    }

    const proceed = confirmAction(`Mark this applicant as ${normalized}?`);
    if (!proceed) return;

    try {
      setUpdatingId(id);
      axios.defaults.withCredentials = true;
      const res = await axios.post(
        `${APPLICATION_API_ENDPOINT}/status/${id}/update`,
        { status }
      );
      if (res.data.success) {
        toast.success(res.data.message);
        const updatedApplicants = {
          ...applicants,
          applications: (applicants?.applications || []).map((item) =>
            item._id === id ? { ...item, status: status.toLowerCase() } : item
          ),
        };
        dispatch(setAllApplicants(updatedApplicants));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <div>
      <Table>
        <TableCaption className="text-slate-500">Recent applicants</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>FullName</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Resume</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!applicants?.applications?.length ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-slate-500 py-4">
                No applicants yet for this job.
              </TableCell>
            </TableRow>
          ) : (
            applicants?.applications?.map((item) => (
              <TableRow key={item._id}>
                <TableCell>{item?.applicant?.fullname}</TableCell>
                <TableCell>{item?.applicant?.email}</TableCell>
                <TableCell>{item?.applicant?.phoneNumber}</TableCell>
                <TableCell>
                  {item.applicant?.profile?.resume ? (
                    <div className="flex items-center gap-3">
                      <a
                        className="text-blue-600 cursor-pointer inline-flex items-center gap-1"
                        href={`${USER_API_ENDPOINT}/resume/${item?.applicant?._id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Download Resume"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                      <a
                        className="text-gray-700 cursor-pointer inline-flex items-center"
                        href={`${USER_API_ENDPOINT}/resume/${item?.applicant?._id}/preview`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Preview Resume"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                    </div>
                  ) : (
                    <span>NA</span>
                  )}
                </TableCell>
                <TableCell>{item?.createdAt?.split("T")[0] || "NA"}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${
                      item?.status === "accepted"
                        ? "bg-emerald-100 text-emerald-700"
                        : item?.status === "rejected"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {item?.status || "pending"}
                  </span>
                </TableCell>
                <TableCell className="text-right cursor-pointer">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="rounded-md p-1 hover:bg-slate-100">
                      <MoreHorizontal />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-32">
                       {shortlistingStatus.map((status, index) => {
                          return (
                            <div
                              onClick={() => statusHandler(status, item?._id)}
                              key={index}
                              className={`flex w-fit items-center my-2 cursor-pointer ${
                                updatingId === item?._id ? "opacity-50 pointer-events-none" : ""
                              }`}
                            >
                              <input
                                type="radio"
                                name={`shortlistingStatus-${item?._id}`}
                                value={status}
                                checked={String(item?.status || "") === status.toLowerCase()}
                                readOnly
                                className="mr-1"
                              />{" "}
                              {status}
                            </div>
                          );
                        })}
                      </PopoverContent>
                  </Popover>
                </TableCell>
              </TableRow>
            )))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ApplicantsTable;
