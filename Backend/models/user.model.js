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
      set: (value) => {
        const normalized = String(value || "").trim().toLowerCase();
        if (normalized === "student") return "Student";
        if (normalized === "recruiter") return "Recruiter";
        if (normalized === "admin") return "Admin";
        return value;
      },
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
    settings: {
      notifications: {
        applicationUpdates: { type: Boolean, default: true },
        messageAlerts: { type: Boolean, default: true },
        announcementAlerts: { type: Boolean, default: true },
        jobRecommendations: { type: Boolean, default: true },
        weeklyDigest: { type: Boolean, default: true },
        marketingEmails: { type: Boolean, default: false },
      },
      privacy: {
        profileVisibility: {
          type: String,
          enum: ["public", "recruiters", "private"],
          default: "recruiters",
        },
        showEmailToRecruiters: { type: Boolean, default: false },
        showPhoneToRecruiters: { type: Boolean, default: false },
        allowRecruiterMessages: { type: Boolean, default: true },
      },
      preferences: {
        theme: {
          type: String,
          enum: ["light", "dark", "system"],
          default: "system",
        },
        compactMode: { type: Boolean, default: false },
        autoPlayVideos: { type: Boolean, default: true },
        language: { type: String, default: "en" },
        timezone: { type: String, default: "Asia/Kolkata" },
      },
      jobPreferences: {
        preferredRoles: [{ type: String }],
        preferredLocations: [{ type: String }],
        openToRemote: { type: Boolean, default: true },
        minSalaryLPA: { type: Number, default: 0 },
      },
      recruiterPreferences: {
        focusHiringFor: [{ type: String }],
        preferredWorkRegions: [{ type: String }],
        autoArchiveRejected: { type: Boolean, default: true },
        candidateResponseSLAHours: { type: Number, default: 48 },
      },
      adminPreferences: {
        strictModerationMode: { type: Boolean, default: true },
        autoHideReportedPosts: { type: Boolean, default: true },
        verificationAlerts: { type: Boolean, default: true },
        ownerDigestFrequency: {
          type: String,
          enum: ["daily", "weekly", "off"],
          default: "weekly",
        },
      },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
