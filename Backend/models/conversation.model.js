import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      unique: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    unlockedByRecruiter: {
      type: Boolean,
      default: false,
    },
    lastMessageText: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

conversationSchema.index({ recruiter: 1, lastMessageAt: -1 });
conversationSchema.index({ student: 1, lastMessageAt: -1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);
