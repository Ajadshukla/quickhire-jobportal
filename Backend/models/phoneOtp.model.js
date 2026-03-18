import mongoose from "mongoose";

const phoneOtpSchema = new mongoose.Schema(
  {
    phoneNumber: {
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

phoneOtpSchema.index({ phoneNumber: 1, purpose: 1 }, { unique: true });
phoneOtpSchema.index({ recordExpiresAt: 1 }, { expireAfterSeconds: 0 });

export const PhoneOtp = mongoose.model("PhoneOtp", phoneOtpSchema);
