import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200,
    },
    audience: {
      type: String,
      enum: ["Student"],
      default: "Student",
      required: true,
    },
    priority: {
      type: String,
      enum: ["normal", "important", "critical"],
      default: "normal",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    publishAt: {
      type: Date,
      default: Date.now,
    },
    expireAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

announcementSchema.index({ isActive: 1, audience: 1, publishAt: -1, expireAt: 1 });

export const Announcement = mongoose.model("Announcement", announcementSchema);
