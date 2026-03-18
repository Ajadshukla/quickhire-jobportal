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
    <div className="max-w-5xl mx-auto px-4 mt-1 md:mt-2">
      <div className="qh-glass rounded-2xl p-4 md:p-5">
        <h1 className="qh-display text-2xl md:text-3xl font-black text-center text-slate-900">
          Categories
        </h1>
        <p className="text-center text-sm md:text-base text-slate-600 mt-1.5">
          Choose a role path.
        </p>
      </div>
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
