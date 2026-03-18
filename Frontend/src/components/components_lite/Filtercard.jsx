import React from "react";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedFilters } from "@/redux/jobSlice";
import { Button } from "../ui/button";

const filterData = [
  {
    filterType: "Location",
    array: [
      "Delhi",
      "Mumbai",
      "Kolhapur",
      "Pune",
      "Bengaluru",
      "Hyderabad",
      "Chennai",
      "Remote",
    ],
  },
  {
    filterType: "Technology",
    array: [
      "MERN",
      "React",
      "Data Scientist",
      "Full Stack",
      "Node",
      "Python",
      "Java",
      "Frontend",
      "Backend",
      "Mobile",
      "Desktop",
    ],
  },
  {
    filterType: "Experience",
    array: ["0-3 years", "3-5 years", "5-7 years", "7+ years"],
  },
  {
    filterType: "Salary",
    array: ["0-10 LPA", "10-15 LPA", "15-20 LPA", "20+ LPA"],
  },
];

const Filter = () => {
  const reduxSelectedFilters = useSelector((store) => store.job.selectedFilters);
  const selectedFilters = {
    location: reduxSelectedFilters?.location || "",
    technology: reduxSelectedFilters?.technology || "",
    experience: reduxSelectedFilters?.experience || "",
    salary: reduxSelectedFilters?.salary || "",
  };

  const dispatch = useDispatch();

  const handleChange = (filterType, value) => {
    const key = String(filterType || "").toLowerCase();
    dispatch(
      setSelectedFilters({
        ...selectedFilters,
        [key]: selectedFilters[key] === value ? "" : value,
      })
    );
  };

  const clearFilters = () => {
    dispatch(
      setSelectedFilters({
        location: "",
        technology: "",
        experience: "",
        salary: "",
      })
    );
  };

  return (
    <div className="w-full qh-panel sticky top-24">
      <div className="flex items-center justify-between gap-2">
        <h1 className="qh-display font-bold text-lg">Filter Jobs</h1>
        <Button variant="outline" size="sm" onClick={clearFilters}>
          Clear
        </Button>
      </div>
      <hr className="mt-3 border-slate-200" />
      {filterData.map((data, index) => (
          <div key={index}>
            <h2 className="font-semibold text-slate-800 mt-3">{data.filterType}</h2>

            <RadioGroup
              value={selectedFilters[String(data.filterType).toLowerCase()]}
              onValueChange={(value) => handleChange(data.filterType, value)}
            >

            {data.array.map((item, indx) => {
              const itemId = `Id${index}-${indx}`;
              return (
                <div key={itemId} className="flex items-center space-x-2 my-2 text-slate-700">
                  <RadioGroupItem value={item} id={itemId}></RadioGroupItem>
                  <label htmlFor={itemId}>{item}</label>
                </div>
              );
            })}
            </RadioGroup>
          </div>
        ))}
    </div>
  );
};

export default Filter;
