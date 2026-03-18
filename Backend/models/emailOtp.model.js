import mongoose from "mongoose";

const emailOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ["register"],
      default: "register",
    },
    otpHash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationTokenHash: {
      type: String,
      default: "",
    },
    tokenExpiresAt: {
      type: Date,
    },
    recordExpiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

emailOtpSchema.index({ email: 1, purpose: 1 }, { unique: true });
emailOtpSchema.index({ recordExpiresAt: 1 }, { expireAfterSeconds: 0 });

export const EmailOtp = mongoose.model("EmailOtp", emailOtpSchema);
