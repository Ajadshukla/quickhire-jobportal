import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";

dotenv.config();

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in Backend/.env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    await User.syncIndexes();
    console.log("User indexes synchronized with schema");

    const indexes = await User.collection.indexes();
    console.log("Current user indexes:");
    console.log(indexes);
  } catch (error) {
    console.error("Failed to sync user indexes:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
