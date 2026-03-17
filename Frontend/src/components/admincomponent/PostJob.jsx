import React, { useState } from "react";
import Navbar from "../components_lite/Navbar";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useSelector } from "react-redux";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import axios from "axios";
import { JOB_API_ENDPOINT } from "@/utils/data";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const PostJob = () => {
  const [input, setInput] = useState({
    title: "",
    description: "",
    requirements: "",
    salary: "",
    location: "",
    jobType: "",
    experience: "",
    position: 0,
    companyId: "",
  });
  const navigate = useNavigate();
  const { companies } = useSelector((store) => store.company);
  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };
  const [loading, setLoading] = useState(false);
  const verifiedCompanies = (companies || []).filter(
    (company) => company.verificationStatus === "verified"
  );
  const pendingCompanies = (companies || []).filter(
    (company) => company.verificationStatus === "pending"
  );
  const rejectedCompanies = (companies || []).filter(
    (company) => company.verificationStatus === "rejected"
  );

  const selectChangeHandler = (value) => {
    setInput({ ...input, companyId: value });
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await axios.post(`${JOB_API_ENDPOINT}/post`, input, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      });
      if (res.data.success || res.data.status) {
        toast.success(res.data.message);
        navigate("/admin/jobs");
      } else {
        toast.error(res.data.message);
        navigate("/admin/jobs");
      }
    } catch (error) {
      if (error.response && error.response.data) {
        toast.error(error.response.data.message || "Something went wrong");
      } else {
        toast.error("An unexpected error occurred");
      }
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="qh-page">
      <Navbar />
      <div className="qh-shell flex items-center justify-center py-8">
        <form
          onSubmit={submitHandler}
          className="p-8 max-w-5xl w-full qh-panel"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label>Title</Label>
              <Input
                type="text"
                name="title"
                value={input.title}
                placeholder="Enter job title"
                className="focus-visible:ring-offset-0 focus-visible:ring-0 my-1 hover:shadow-blue-400"
                onChange={changeEventHandler}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                name="description"
                value={input.description}
                placeholder="Enter job description"
                className="focus-visible:ring-offset-0 focus-visible:ring-0 my-1 hover:shadow-blue-400 "
                onChange={changeEventHandler}
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                type="text"
                name="location"
                value={input.location}
                placeholder="Enter job location"
                className="focus-visible:ring-offset-0 focus-visible:ring-0 my-1 hover:shadow-blue-400"
                onChange={changeEventHandler}
              />
            </div>
            <div>
              <Label>Salary</Label>
              <Input
                type="number"
                name="salary"
                value={input.salary}
                placeholder="Enter job salary"
                className="focus-visible:ring-offset-0 focus-visible:ring-0 my-1 hover:shadow-blue-400"
                onChange={changeEventHandler}
              />
            </div>
            <div>
              <Label>Position</Label>
              <Input
                type="number"
                name="position"
                value={input.position}
                placeholder="Enter job position"
                className="focus-visible:ring-offset-0 focus-visible:ring-0 my-1 hover:shadow-blue-400"
                onChange={changeEventHandler}
              />
            </div>
            <div>
              <Label>Requirements</Label>
              <Input
                type="text"
                name="requirements"
                value={input.requirements}
                placeholder="Enter job requirements"
                className="focus-visible:ring-offset-0 focus-visible:ring-0 my-1 hover:shadow-blue-400"
                onChange={changeEventHandler}
              />
            </div>

            <div>
              <Label>Experience</Label>
              <Input
                type="number"
                name="experience"
                value={input.experience}
                placeholder="Enter job experience"
                className="focus-visible:ring-offset-0 focus-visible:ring-0 my-1 hover:shadow-blue-400"
                onChange={changeEventHandler}
              />
            </div>
            <div>
              <Label>Job Type</Label>
              <Input
                type="text"
                name="jobType"
                value={input.jobType}
                placeholder="Enter job type"
                className="focus-visible:ring-offset-0 focus-visible:ring-0 my-1 hover:shadow-blue-400"
                onChange={changeEventHandler}
              />
            </div>

            <div>
              {verifiedCompanies.length > 0 && (
                <Select onValueChange={selectChangeHandler}>
                  <SelectTrigger className="w-full md:w-[260px]">
                    <SelectValue placeholder="Select a Verified Company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {verifiedCompanies.map((company) => (
                        <SelectItem
                          key={company._id}
                          value={company._id}
                        >
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center mt-5">
            {loading ? (
              <Button className="w-full px-4 py-2 text-sm text-white bg-black rounded-md ">
                {" "}
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait{" "}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={verifiedCompanies.length === 0}
                className="w-full px-4 py-2 text-sm text-white bg-black rounded-md hover:bg-blue-600"
              >
                Post Job
              </Button>
            )}
          </div>
          {verifiedCompanies.length === 0 && (
            <p className="text-sm font-bold my-3 text-center text-red-600">
              *No verified company available. Owner verification is required before posting jobs.*
            </p>
          )}
          {(pendingCompanies.length > 0 || rejectedCompanies.length > 0) && (
            <div className="mt-2 text-center text-sm text-slate-600">
              {pendingCompanies.length > 0 && <p>{pendingCompanies.length} company is pending owner review.</p>}
              {rejectedCompanies.length > 0 && (
                <p className="text-rose-600">
                  {rejectedCompanies.length} company is rejected. Update company details to resubmit for review.
                </p>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default PostJob;
