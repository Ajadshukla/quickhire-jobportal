import { v2 as cloudinary } from "cloudinary";

import dotenv from "dotenv";
dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
const cloudApiKey = process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API;
const cloudApiSecret = process.env.CLOUDINARY_API_SECRET || process.env.API_SECRET;

cloudinary.config({
  cloud_name: cloudName,
  api_key: cloudApiKey,
  api_secret: cloudApiSecret,
});

export default cloudinary;
