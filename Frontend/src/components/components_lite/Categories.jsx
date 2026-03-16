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
    <div className="max-w-5xl mx-auto px-4 mt-2">
      <div className="qh-glass rounded-2xl p-6 md:p-8">
        <h1 className="qh-display text-3xl font-black text-center text-slate-900">
          Categories
        </h1>
        <p className="text-center text-slate-600 mt-2">
          Choose a role path.
        </p>
      </div>
      <Carousel className="w-full max-w-3xl mx-auto my-8">
        <CarouselContent>
          {Category.map((category, index) => {
            return (
              <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                <Button onClick={() => searchjobHandler(category)} className="w-full bg-slate-900 hover:bg-slate-800 rounded-full">
                  {category}
                </Button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="border-slate-300" />
        <CarouselNext className="border-slate-300" />
      </Carousel>
    </div>
  );
};

export default Categories;
