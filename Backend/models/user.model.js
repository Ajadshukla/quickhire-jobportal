import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      required: true,
    },
    pancard: {
      type: String,
      unique: true,
      sparse: true,
    },
    adharcard: {
      type: String,
      unique: true,
      sparse: true,
    },
    role: {
      type: String,
      enum: ["Student", "Recruiter", "Admin"],
      default: "Student",
      required: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedAt: {
      type: Date,
    },
    blockedReason: {
      type: String,
      default: "",
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    profile: {
      bio: {
        type: String,
      },
      skills: [{ type: String }],
      resume: {
        type: String, // URL to resume file
      },
      resumeOriginalname: {
        type: String, // Original name of resume file
      },
      company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
      },
      profilePhoto: {
        type: String, // URL to profile photo file
        default: "",
      },
      savedJobs: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Job",
        },
      ],
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
