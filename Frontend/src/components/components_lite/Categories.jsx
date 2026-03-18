import React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import { Button } from "../ui/button";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setSearchedQuery } from "@/redux/jobSlice";
 

 
const Category = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Mern Developer",
  "Data Scientist",
  "DevOps Engineer",
  "Machine Learning Engineer",
  "Artificial Intelligence Engineer",
  "Cybersecurity Engineer",
  "Product Manager",
  "UX/UI Designer",
  "Graphics Engineer",
  "Graphics Designer",
  "Video Editor",
];


const Categories = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const searchjobHandler = (query) => {
      dispatch(setSearchedQuery(query));
      navigate("/browse");
  }
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 mt-4 md:mt-6">
      <h2 className="qh-display text-4xl md:text-5xl font-black text-slate-900">
        <span className="text-teal-700">Categories</span>
      </h2>
      <p className="text-slate-600 mt-2 max-w-2xl">
        Choose a role path.
      </p>
      <Carousel className="w-full max-w-4xl mx-auto my-4 md:my-5 px-8 md:px-10">
        <CarouselContent>
          {Category.map((category, index) => {
            return (
              <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                <Button
                  onClick={() => searchjobHandler(category)}
                  className="w-full bg-slate-900 hover:bg-slate-800 rounded-full h-10 text-sm md:text-base"
                >
                  {category}
                </Button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="border-slate-300 h-8 w-8 md:h-10 md:w-10 left-0" />
        <CarouselNext className="border-slate-300 h-8 w-8 md:h-10 md:w-10 right-0" />
      </Carousel>
    </div>
  );
};

export default Categories;
