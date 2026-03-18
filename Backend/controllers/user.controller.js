import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { PhoneOtp } from "../models/phoneOtp.model.js";
import { EmailOtp } from "../models/emailOtp.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfParseModule from "pdf-parse";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloud.js";
import { generateOTP } from "../utils/otp.js";
import { sendOTPEmail } from "../utils/sendEmail.js";

const PDFParse = pdfParseModule.PDFParse;

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const isProduction = process.env.NODE_ENV === "production";

const authCookieOptions = {
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
};

const clearAuthCookieOptions = {
  expires: new Date(0),
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
};

const OWNER_EMAIL = String(process.env.OWNER_EMAIL || "").trim().toLowerCase();
const isOwnerEmail = (email) => {
  const normalized = String(email || "").trim().toLowerCase();
  return Boolean(OWNER_EMAIL) && normalized === OWNER_EMAIL;
};

const resolveRoleByEmail = (requestedRole, email) => {
  return isOwnerEmail(email) ? "Admin" : requestedRole;
};

const OTP_PURPOSE_REGISTER = "register";
const OTP_PURPOSE_UPDATE_PHONE = "update_phone";
const OTP_PURPOSE_UPDATE_EMAIL = "update_email";
const SUPPORTED_OTP_PURPOSES = new Set([OTP_PURPOSE_REGISTER, OTP_PURPOSE_UPDATE_PHONE]);
const SUPPORTED_EMAIL_OTP_PURPOSES = new Set([OTP_PURPOSE_REGISTER, OTP_PURPOSE_UPDATE_EMAIL]);
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_SECONDS = 30;
const OTP_EXPIRY_MINUTES = Math.max(1, Number(process.env.OTP_EXPIRY_MINUTES || 5));
const OTP_TOKEN_TTL_MINUTES = Math.max(5, Number(process.env.OTP_TOKEN_TTL_MINUTES || 20));
const OTP_SECRET =
  String(process.env.OTP_SECRET || process.env.JWT_SECRET || "dev_otp_secret").trim();

const normalizePhoneNumber = (rawPhone) => {
  const value = String(rawPhone || "").trim().replace(/[\s()-]/g, "");
  if (!value) return "";

  if (value.startsWith("+")) {
    return /^\+[1-9]\d{7,14}$/.test(value) ? value : "";
  }

  const digitsOnly = value.replace(/\D/g, "");
  if (/^\d{10}$/.test(digitsOnly)) return `+91${digitsOnly}`;
  if (/^[1-9]\d{7,14}$/.test(digitsOnly)) return `+${digitsOnly}`;
  return "";
};

const normalizeEmailAddress = (rawEmail) => String(rawEmail || "").trim().toLowerCase();
const emailPattern = /^\S+@\S+\.\S+$/;

const hashOtp = (phoneNumber, otp) =>
  createHash("sha256").update(`${phoneNumber}:${otp}:${OTP_SECRET}`).digest("hex");

const hashVerificationToken = (token) =>
  createHash("sha256").update(`${token}:${OTP_SECRET}`).digest("hex");

const hashEmailOtp = (email, otp) =>
  createHash("sha256").update(`${email}:${otp}:${OTP_SECRET}`).digest("hex");

const smtpConfigured = () => {
  const smtpUser = String(process.env.SMTP_USER || "").trim();
  const smtpPass = String(process.env.SMTP_PASS || "").trim();
  const emailUser = String(process.env.EMAIL_USER || "").trim();
  const emailPass = String(process.env.EMAIL_PASS || "").trim();
  return Boolean((smtpUser && smtpPass) || (emailUser && emailPass));
};

const sendEmailOtpMessage = async (email, otpCode) => {
  if (!smtpConfigured()) {
    throw new Error("Email provider is not configured");
  }

  await sendOTPEmail(email, otpCode, OTP_EXPIRY_MINUTES);

  return { provider: "smtp", delivered: true };
};

const consumeEmailVerificationToken = async (email, verificationToken, purpose) => {
  if (!verificationToken) {
    return { ok: false, message: "Email verification token is required" };
  }

  const record = await EmailOtp.findOne({ email, purpose });
  if (!record || !record.isVerified || !record.verificationTokenHash) {
    return { ok: false, message: "Email is not verified. Please verify OTP first." };
  }

  if (!record.tokenExpiresAt || new Date(record.tokenExpiresAt).getTime() < Date.now()) {
    await EmailOtp.deleteOne({ _id: record._id });
    return { ok: false, message: "Email verification expired. Please verify OTP again." };
  }

  const tokenHash = hashVerificationToken(String(verificationToken));
  if (tokenHash !== record.verificationTokenHash) {
    return { ok: false, message: "Invalid email verification token" };
  }

  await EmailOtp.deleteOne({ _id: record._id });
  return { ok: true };
};

export const sendEmailOtp = async (req, res) => {
  try {
    const purpose = String(req.body?.purpose || OTP_PURPOSE_REGISTER).trim().toLowerCase();
    const email = normalizeEmailAddress(req.body?.email);

    if (!SUPPORTED_EMAIL_OTP_PURPOSES.has(purpose)) {
      return res.status(400).json({ success: false, message: "Unsupported OTP purpose" });
    }

    if (!email || !emailPattern.test(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address" });
    }

    const existingUser = await User.findOne({ email }).select("_id");
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const now = Date.now();
    const existingOtp = await EmailOtp.findOne({ email, purpose });
    if (existingOtp?.lastSentAt && now - new Date(existingOtp.lastSentAt).getTime() < OTP_COOLDOWN_SECONDS * 1000) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${OTP_COOLDOWN_SECONDS} seconds before requesting another OTP`,
      });
    }

    const otpCode = generateOTP();
    const otpHash = hashEmailOtp(email, otpCode);
    const expiresAt = new Date(now + OTP_EXPIRY_MINUTES * 60 * 1000);
    const recordExpiresAt = new Date(now + 24 * 60 * 60 * 1000);

    await EmailOtp.findOneAndUpdate(
      { email, purpose },
      {
        $set: {
          otpHash,
          attempts: 0,
          expiresAt,
          lastSentAt: new Date(now),
          isVerified: false,
          verificationTokenHash: "",
          tokenExpiresAt: undefined,
          recordExpiresAt,
        },
      },
      { upsert: true, new: true }
    );

    await sendEmailOtpMessage(email, otpCode);

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (error) {
    console.error(error);
    if (String(error?.message || "").includes("Email provider is not configured")) {
      return res.status(503).json({
        success: false,
        message: "Email OTP service is not configured on server. Set SMTP env variables.",
      });
    }
    return res.status(500).json({ success: false, message: "Unable to send OTP right now. Please try again." });
  }
};

export const verifyEmailOtp = async (req, res) => {
  try {
    const purpose = String(req.body?.purpose || OTP_PURPOSE_REGISTER).trim().toLowerCase();
    const email = normalizeEmailAddress(req.body?.email);
    const otp = String(req.body?.otp || "").trim();

    if (!SUPPORTED_EMAIL_OTP_PURPOSES.has(purpose)) {
      return res.status(400).json({ success: false, message: "Unsupported OTP purpose" });
    }

    if (!email || !emailPattern.test(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: "Invalid email or OTP" });
    }

    const record = await EmailOtp.findOne({ email, purpose });
    if (!record) {
      return res.status(400).json({ success: false, message: "OTP not found. Please request a new OTP." });
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      await EmailOtp.deleteOne({ _id: record._id });
      return res.status(400).json({ success: false, message: "OTP expired. Please request again." });
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new OTP.",
      });
    }

    const computedHash = hashEmailOtp(email, otp);
    if (computedHash !== record.otpHash) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const verificationToken = randomBytes(24).toString("hex");
    record.isVerified = true;
    record.verificationTokenHash = hashVerificationToken(verificationToken);
    record.tokenExpiresAt = new Date(Date.now() + OTP_TOKEN_TTL_MINUTES * 60 * 1000);
    record.recordExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await record.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      verificationToken,
      normalizedEmail: email,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Unable to verify OTP" });
  }
};

const twilioConfigured = () => {
  const sid = String(process.env.TWILIO_ACCOUNT_SID || "").trim();
  const auth = String(process.env.TWILIO_AUTH_TOKEN || "").trim();
  const from = String(process.env.TWILIO_FROM_NUMBER || "").trim();
  return Boolean(sid && auth && from);
};

const sendOtpMessage = async (phoneNumber, otpCode) => {
  const message = `Your QuickHire OTP is ${otpCode}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`;

  if (!twilioConfigured()) {
    throw new Error("SMS provider is not configured");
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  const payload = new URLSearchParams({
    To: phoneNumber,
    From: from,
    Body: message,
  });

  const authHeader = Buffer.from(`${sid}:${auth}`).toString("base64");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio send failed: ${errorText}`);
  }

  return { provider: "twilio", delivered: true };
};

const consumePhoneVerificationToken = async (phoneNumber, verificationToken, purpose) => {
  if (!verificationToken) {
    return { ok: false, message: "Phone verification token is required" };
  }

  const record = await PhoneOtp.findOne({ phoneNumber, purpose });
  if (!record || !record.isVerified || !record.verificationTokenHash) {
    return { ok: false, message: "Phone is not verified. Please verify OTP first." };
  }

  if (!record.tokenExpiresAt || new Date(record.tokenExpiresAt).getTime() < Date.now()) {
    await PhoneOtp.deleteOne({ _id: record._id });
    return { ok: false, message: "Phone verification expired. Please verify OTP again." };
  }

  const tokenHash = hashVerificationToken(String(verificationToken));
  if (tokenHash !== record.verificationTokenHash) {
    return { ok: false, message: "Invalid phone verification token" };
  }

  await PhoneOtp.deleteOne({ _id: record._id });
  return { ok: true };
};

export const sendPhoneOtp = async (req, res) => {
  try {
    const purpose = String(req.body?.purpose || OTP_PURPOSE_REGISTER).trim().toLowerCase();
    const phoneNumber = normalizePhoneNumber(req.body?.phoneNumber);

    if (!SUPPORTED_OTP_PURPOSES.has(purpose)) {
      return res.status(400).json({ success: false, message: "Unsupported OTP purpose" });
    }

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid phone number with country code (for example +919876543210)",
      });
    }

    const existingUser = await User.findOne({ phoneNumber }).select("_id");
    if (existingUser && (purpose === OTP_PURPOSE_REGISTER || purpose === OTP_PURPOSE_UPDATE_PHONE)) {
      return res.status(400).json({ success: false, message: "Phone number already exists" });
    }

    const now = Date.now();
    const existingOtp = await PhoneOtp.findOne({ phoneNumber, purpose });
    if (existingOtp?.lastSentAt && now - new Date(existingOtp.lastSentAt).getTime() < OTP_COOLDOWN_SECONDS * 1000) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${OTP_COOLDOWN_SECONDS} seconds before requesting another OTP`,
      });
    }

    const otpCode = generateOTP();
    const otpHash = hashOtp(phoneNumber, otpCode);
    const expiresAt = new Date(now + OTP_EXPIRY_MINUTES * 60 * 1000);
    const recordExpiresAt = new Date(now + 24 * 60 * 60 * 1000);

    await PhoneOtp.findOneAndUpdate(
      { phoneNumber, purpose },
      {
        $set: {
          otpHash,
          attempts: 0,
          expiresAt,
          lastSentAt: new Date(now),
          isVerified: false,
          verificationTokenHash: "",
          tokenExpiresAt: undefined,
          recordExpiresAt,
        },
      },
      { upsert: true, new: true }
    );

    await sendOtpMessage(phoneNumber, otpCode);

    return res.status(200).json({
      success: true,
      message: "OTP sent to your mobile number",
    });
  } catch (error) {
    console.error(error);
    if (String(error?.message || "").includes("SMS provider is not configured")) {
      return res.status(503).json({
        success: false,
        message: "SMS OTP service is not configured on server. Set Twilio env variables.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Unable to send OTP right now. Please try again.",
    });
  }
};

export const verifyPhoneOtp = async (req, res) => {
  try {
    const purpose = String(req.body?.purpose || OTP_PURPOSE_REGISTER).trim().toLowerCase();
    const phoneNumber = normalizePhoneNumber(req.body?.phoneNumber);
    const otp = String(req.body?.otp || "").trim();

    if (!SUPPORTED_OTP_PURPOSES.has(purpose)) {
      return res.status(400).json({ success: false, message: "Unsupported OTP purpose" });
    }

    if (!phoneNumber || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: "Invalid phone number or OTP" });
    }

    const record = await PhoneOtp.findOne({ phoneNumber, purpose });
    if (!record) {
      return res.status(400).json({ success: false, message: "OTP not found. Please request a new OTP." });
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      await PhoneOtp.deleteOne({ _id: record._id });
      return res.status(400).json({ success: false, message: "OTP expired. Please request again." });
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new OTP.",
      });
    }

    const computedHash = hashOtp(phoneNumber, otp);
    if (computedHash !== record.otpHash) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const verificationToken = randomBytes(24).toString("hex");
    record.isVerified = true;
    record.verificationTokenHash = hashVerificationToken(verificationToken);
    record.tokenExpiresAt = new Date(Date.now() + OTP_TOKEN_TTL_MINUTES * 60 * 1000);
    record.recordExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await record.save();

    return res.status(200).json({
      success: true,
      message: "Mobile number verified successfully",
      verificationToken,
      normalizedPhoneNumber: phoneNumber,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Unable to verify OTP" });
  }
};

const uploadProfilePhoto = async (dataUri) => {
  return cloudinary.uploader.upload(dataUri, {
    resource_type: "image",
    folder: "profile_photos",
    transformation: [
      { width: 320, height: 320, crop: "fill", gravity: "face" },
      { quality: "auto", fetch_format: "auto" },
    ],
  });
};

const isCloudinaryConfigured = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
  const cloudApi = process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API;
  const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.API_SECRET;

  if (!cloudName || !cloudApi || !apiSecret) return false;
  if (
    cloudName.toLowerCase().includes("replace") ||
    cloudApi.toLowerCase().includes("replace") ||
    apiSecret.toLowerCase().includes("replace")
  ) {
    return false;
  }

  return true;
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "with",
  "for",
  "from",
  "that",
  "this",
  "into",
  "your",
  "will",
  "have",
  "using",
  "build",
  "work",
  "role",
  "team",
  "years",
  "year",
  "experience",
  "job",
]);

const extractKeywords = (text) => {
  return Array.from(
    new Set(
      String(text || "")
        .toLowerCase()
        .split(/[^a-z0-9+.#-]+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    )
  );
};

const GEMINI_MODEL_CANDIDATES = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.toLowerCase().includes("replace")) {
    return null;
  }

  return new GoogleGenerativeAI(apiKey);
};

const parseJsonFromGemini = (rawText) => {
  const cleaned = String(rawText || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned);
};

const runGeminiJsonPrompt = async (prompt) => {
  const client = getGeminiClient();
  if (!client) {
    return { ok: false, reason: "missing_key" };
  }

  let lastError = null;

  for (const modelName of GEMINI_MODEL_CANDIDATES) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const parsed = parseJsonFromGemini(result.response.text());
      return { ok: true, parsed, model: modelName };
    } catch (error) {
      lastError = error;
      const msg = String(error?.message || "").toLowerCase();
      const status = Number(error?.status || 0);
      const isUnsupportedModel =
        status === 404 ||
        status === 400 ||
        msg.includes("not found") ||
        msg.includes("not supported") ||
        msg.includes("models/");

      if (isUnsupportedModel) {
        continue;
      }
    }
  }

  return { ok: false, reason: "api_error", error: lastError };
};

const ensureStudent = async (userId) => {
  const user = await User.findById(userId).select("role fullname");
  if (!user) {
    return { code: 404, error: "User not found" };
  }
  if (String(user.role || "").toLowerCase() !== "student") {
    return { code: 403, error: "Preparation tools are only available for students" };
  }
  return { user };
};

const getJobContext = async (jobId) => {
  const job = await Job.findById(jobId).populate("company", "name");
  if (!job) return null;

  const requirements = Array.isArray(job.requirements) ? job.requirements.join(", ") : "";
  return {
    _id: job._id,
    title: job.title,
    company: job.company?.name || "Unknown",
    description: job.description,
    requirements,
    location: job.location,
    experienceLevel: job.experienceLevel,
    jobType: job.jobType,
  };
};

const generatePreparationFallback = (jobContext, count) => {
  const base = extractKeywords(`${jobContext.title} ${jobContext.description} ${jobContext.requirements}`).slice(0, 12);
  const questions = Array.from({ length: count }).map((_, idx) => {
    const k = base[idx % Math.max(base.length, 1)] || "this role";
    return {
      question: `How would you apply ${k} in a ${jobContext.title} project?`,
      answer: `Explain a real example, your approach, trade-offs, and measurable outcome relevant to ${jobContext.company}.`,
    };
  });
  return {
    title: `${jobContext.title} Preparation Set`,
    questions,
  };
};

export const generatePreparationQuestions = async (req, res) => {
  try {
    const { jobId } = req.params;
    const count = Math.min(30, Math.max(20, Number(req.query.count) || 20));

    const studentCheck = await ensureStudent(req.id);
    if (studentCheck.error) {
      return res.status(studentCheck.code).json({ success: false, message: studentCheck.error });
    }

    const jobContext = await getJobContext(jobId);
    if (!jobContext) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const prompt = `Generate ${count} interview preparation Q&A items for a student applying to this job.
Return ONLY valid JSON with this exact shape:
{
  "title": "string",
  "questions": [
    {"question": "string", "answer": "string"}
  ]
}

Job context:
Title: ${jobContext.title}
Company: ${jobContext.company}
Description: ${jobContext.description}
Requirements: ${jobContext.requirements}
Experience level: ${jobContext.experienceLevel}
Job type: ${jobContext.jobType}
Location: ${jobContext.location}

Rules:
- Questions should be practical and role-specific.
- Answers should be concise model answers (3-6 lines).
- No markdown, no code fences, only JSON.`;

    const gemini = await runGeminiJsonPrompt(prompt);
    if (!gemini.ok) {
      const fallback = generatePreparationFallback(jobContext, count);
      return res.status(200).json({
        success: true,
        source: "fallback",
        message:
          gemini.reason === "missing_key"
            ? "Gemini key not configured. Showing local preparation set."
            : "Gemini unavailable right now. Showing local preparation set.",
        data: fallback,
      });
    }

    const parsed = gemini.parsed;

    if (!parsed?.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      const fallback = generatePreparationFallback(jobContext, count);
      return res.status(200).json({
        success: true,
        source: "fallback",
        message: "Unexpected AI response. Showing local preparation set.",
        data: fallback,
      });
    }

    return res.status(200).json({
      success: true,
      source: "gemini",
      data: {
        title: parsed.title || `${jobContext.title} Preparation Set`,
        questions: parsed.questions.slice(0, count),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error generating preparation questions",
    });
  }
};

export const generateMockInterviewSet = async (req, res) => {
  try {
    const { jobId } = req.params;
    const count = Math.min(12, Math.max(6, Number(req.query.count) || 8));

    const studentCheck = await ensureStudent(req.id);
    if (studentCheck.error) {
      return res.status(studentCheck.code).json({ success: false, message: studentCheck.error });
    }

    const jobContext = await getJobContext(jobId);
    if (!jobContext) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const prompt = `Create a realistic mock interview set for a student candidate.
Return ONLY valid JSON in this shape:
{
  "intro": "string",
  "tips": ["string"],
  "questions": ["string"]
}

Job context:
Title: ${jobContext.title}
Company: ${jobContext.company}
Description: ${jobContext.description}
Requirements: ${jobContext.requirements}
Experience level: ${jobContext.experienceLevel}

Rules:
- Provide ${count} questions.
- Mix: technical, scenario-based, behavioral, problem-solving.
- Keep questions interview-realistic and concise.
- No markdown, no code fences, JSON only.`;

    const gemini = await runGeminiJsonPrompt(prompt);
    if (!gemini.ok) {
      const fallback = {
        intro: `Mock interview for ${jobContext.title} at ${jobContext.company}`,
        tips: [
          "Keep answers structured: Situation, Task, Action, Result.",
          "Speak clearly and keep each answer between 45-90 seconds.",
          "Use one concrete project example per answer.",
        ],
        questions: generatePreparationFallback(jobContext, count).questions.map((q) => q.question),
      };

      return res.status(200).json({
        success: true,
        source: "fallback",
        message:
          gemini.reason === "missing_key"
            ? "Gemini key not configured. Showing local mock questions."
            : "Gemini unavailable right now. Showing local mock questions.",
        data: fallback,
      });
    }

    const parsed = gemini.parsed;

    if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
      const fallback = {
        intro: `Mock interview for ${jobContext.title} at ${jobContext.company}`,
        tips: [
          "Keep answers structured: Situation, Task, Action, Result.",
          "Speak clearly and keep each answer between 45-90 seconds.",
          "Use one concrete project example per answer.",
        ],
        questions: generatePreparationFallback(jobContext, count).questions.map((q) => q.question),
      };

      return res.status(200).json({
        success: true,
        source: "fallback",
        message: "Unexpected AI response. Showing local mock questions.",
        data: fallback,
      });
    }

    return res.status(200).json({
      success: true,
      source: "gemini",
      data: {
        intro: parsed.intro || `Mock interview for ${jobContext.title}`,
        tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 6) : [],
        questions: parsed.questions.slice(0, count),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error generating mock interview",
    });
  }
};

export const evaluateMockInterviewAnswers = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { answers } = req.body;

    const studentCheck = await ensureStudent(req.id);
    if (studentCheck.error) {
      return res.status(studentCheck.code).json({ success: false, message: studentCheck.error });
    }

    const jobContext = await getJobContext(jobId);
    if (!jobContext) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: "Interview answers are required" });
    }

    const sanitizedAnswers = answers
      .map((a) => ({
        question: String(a?.question || "").trim(),
        answer: String(a?.answer || "").trim(),
      }))
      .filter((a) => a.question && a.answer);

    if (sanitizedAnswers.length === 0) {
      return res.status(400).json({ success: false, message: "Provide at least one answered question" });
    }

    const prompt = `Evaluate this student's mock interview answers for job readiness.
Return ONLY valid JSON with exact structure:
{
  "overallScore": number,
  "verdict": "string",
  "strengths": ["string"],
  "improvements": ["string"],
  "perQuestion": [
    {"question": "string", "score": number, "feedback": "string"}
  ]
}

Score rules:
- overallScore: 0-100
- perQuestion.score: 1-10
- feedback should be actionable and concise.

Job context:
Title: ${jobContext.title}
Company: ${jobContext.company}
Description: ${jobContext.description}
Requirements: ${jobContext.requirements}

Answers:
${JSON.stringify(sanitizedAnswers)}

No markdown, no code fences, JSON only.`;

    const gemini = await runGeminiJsonPrompt(prompt);
    if (!gemini.ok) {
      return res.status(200).json({
        success: true,
        source: "fallback",
        data: {
          overallScore: 65,
          verdict: "Moderate interview readiness",
          strengths: [
            "You attempted answers for the selected role.",
            "Your responses include relevant role context.",
          ],
          improvements: [
            "Use STAR structure in each answer.",
            "Add measurable impact and outcomes.",
            "Be more concise and role-specific.",
          ],
          perQuestion: sanitizedAnswers.map((a) => ({
            question: a.question,
            score: 6,
            feedback: "Good start. Add clearer structure, impact metrics, and deeper technical detail.",
          })),
        },
        message: "Gemini key not configured. Showing local feedback template.",
      });
    }

    const parsed = gemini.parsed;

    if (typeof parsed?.overallScore !== "number" || !Array.isArray(parsed?.perQuestion)) {
      return res.status(200).json({
        success: true,
        source: "fallback",
        message: "Unexpected AI response. Showing local feedback template.",
        data: {
          overallScore: 65,
          verdict: "Moderate interview readiness",
          strengths: [
            "You attempted answers for the selected role.",
            "Your responses include relevant role context.",
          ],
          improvements: [
            "Use STAR structure in each answer.",
            "Add measurable impact and outcomes.",
            "Be more concise and role-specific.",
          ],
          perQuestion: sanitizedAnswers.map((a) => ({
            question: a.question,
            score: 6,
            feedback: "Good start. Add clearer structure, impact metrics, and deeper technical detail.",
          })),
        },
      });
    }

    return res.status(200).json({
      success: true,
      source: "gemini",
      data: {
        overallScore: Math.max(0, Math.min(100, Math.round(parsed.overallScore))),
        verdict: parsed.verdict || "Interview readiness generated",
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 8) : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 8) : [],
        perQuestion: parsed.perQuestion.slice(0, sanitizedAnswers.length),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error evaluating mock interview answers",
    });
  }
};

export const register = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, password, adharcard, pancard, role, emailVerificationToken } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const normalizedPan = pancard?.trim() || undefined;
    const normalizedAdhar = adharcard?.trim() || undefined;
    const assignedRole = resolveRoleByEmail(role, normalizedEmail);

    if (!fullname || !normalizedEmail || !password || !role || !emailVerificationToken) {
      return res.status(400).json({
        message: "Missing required fields or email verification",
        success: false,
      });
    }

    if (!String(phoneNumber || "").trim()) {
      return res.status(400).json({
        message: "Phone number is required",
        success: false,
      });
    }

    if (!normalizedPhone) {
      return res.status(400).json({
        message: "Enter a valid phone number with country code (for example +919876543210)",
        success: false,
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (user) {
      const provider = String(user.authProvider || "local").toLowerCase();
      const alreadyWithGoogle = provider === "google" || Boolean(user.googleId);
      return res.status(400).json({
        message: alreadyWithGoogle
          ? "This email is already registered with Google. Please use Continue with Google on Login."
          : "Email already exists. Please login instead.",
        success: false,
      });
    }

    const existingPhone = await User.findOne({ phoneNumber: normalizedPhone });
    if (existingPhone) {
      return res.status(400).json({
        message: "Phone number already exists",
        success: false,
      });
    }

    if (normalizedAdhar) {
      const existingAdharcard = await User.findOne({ adharcard: normalizedAdhar });
      if (existingAdharcard) {
        return res.status(400).json({
          message: "Adhar number already exists",
          success: false,
        });
      }
    }

    if (normalizedPan) {
      const existingPancard = await User.findOne({ pancard: normalizedPan });
      if (existingPancard) {
        return res.status(400).json({
          message: "Pan number already exists",
          success: false,
        });
      }
    }

    const file = req.file;
    let profilePhoto = "";

    if (file && isCloudinaryConfigured()) {
      const fileUri = getDataUri(file);
      const cloudResponse = await uploadProfilePhoto(fileUri.content);
      profilePhoto = cloudResponse.secure_url;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const emailVerification = await consumeEmailVerificationToken(
      normalizedEmail,
      String(emailVerificationToken || ""),
      OTP_PURPOSE_REGISTER
    );
    if (!emailVerification.ok) {
      return res.status(400).json({ success: false, message: emailVerification.message });
    }

    const newUser = new User({
      fullname,
      email: normalizedEmail,
      phoneNumber: normalizedPhone,
      adharcard: normalizedAdhar,
      pancard: normalizedPan,
      password: hashedPassword,
      role: assignedRole,
      authProvider: "local",
      profile: {
        profilePhoto,
      },
    });

    await newUser.save();

    return res.status(201).json({
      message: `Account created successfully for ${fullname}`,
      success: true,
    });
  } catch (error) {
    console.error(error);
    if (error?.code === 11000 && error?.keyPattern) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      const fieldLabels = {
        email: "Email",
        phoneNumber: "Phone number",
        pancard: "PAN number",
        adharcard: "Adhar number",
      };

      return res.status(400).json({
        message: `${fieldLabels[duplicateField] || duplicateField} already exists`,
        success: false,
      });
    }
    res.status(500).json({
      message: "Server Error registering user",
      success: false,
    });
  }
};

export const googleAuth = async (req, res) => {
  try {
    const { credential, role, phoneNumber } = req.body;

    if (!credential || !role) {
      return res.status(400).json({
        message: "Google credential and role are required",
        success: false,
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        message: "Google auth is not configured on server",
        success: false,
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({
        message: "Google email could not be verified",
        success: false,
      });
    }

    const googlePicture = String(payload.picture || "").trim().replace(/^http:\/\//i, "https://");

    const normalizedGoogleEmail = payload.email.trim().toLowerCase();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const assignedRole = resolveRoleByEmail(role, normalizedGoogleEmail);
    let user = await User.findOne({ email: normalizedGoogleEmail });
    let createdNewUser = false;

    if (!user) {
      if (!String(phoneNumber || "").trim() || !normalizedPhone) {
        return res.status(400).json({
          message: "Valid phone number is required for signup",
          success: false,
        });
      }

      const existingPhone = await User.findOne({ phoneNumber: normalizedPhone }).select("_id");
      if (existingPhone) {
        return res.status(400).json({
          message: "Phone number already exists",
          success: false,
        });
      }

      const randomPassword = randomUUID();
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await User.create({
        fullname: payload.name || payload.email.split("@")[0],
        email: normalizedGoogleEmail,
        phoneNumber: normalizedPhone,
        password: hashedPassword,
        role: assignedRole,
        authProvider: "google",
        googleId: payload.sub,
        profile: {
          profilePhoto: googlePicture,
        },
      });
      createdNewUser = true;
    } else if (user.isBlocked) {
      return res.status(403).json({
        message: "Your account is blocked by admin",
        success: false,
      });
    } else if (user.role !== role && user.role !== "Admin") {
      return res.status(403).json({
        message: `This account is registered as ${user.role}. Please select that role.`,
        success: false,
      });
    } else {
      let shouldSave = false;

      if (!user.phoneNumber) {
        if (!String(phoneNumber || "").trim() || !normalizedPhone) {
          return res.status(400).json({
            message: "Valid phone number is required to complete Google sign in",
            success: false,
          });
        }

        const existingPhone = await User.findOne({
          phoneNumber: normalizedPhone,
          _id: { $ne: user._id },
        }).select("_id");
        if (existingPhone) {
          return res.status(400).json({
            message: "Phone number already exists",
            success: false,
          });
        }

        user.phoneNumber = normalizedPhone;
        shouldSave = true;
      }

      if (!user.googleId && payload.sub) {
        user.googleId = payload.sub;
        shouldSave = true;
      }

      if (googlePicture && user.profile?.profilePhoto !== googlePicture) {
        user.profile.profilePhoto = googlePicture;
        shouldSave = true;
      }

      if (!user.fullname && payload.name) {
        user.fullname = payload.name;
        shouldSave = true;
      }

      if (!user.authProvider) {
        user.authProvider = "google";
        shouldSave = true;
      }

      if (isOwnerEmail(normalizedGoogleEmail) && user.role !== "Admin") {
        user.role = "Admin";
        shouldSave = true;
      }

      if (shouldSave) {
        await user.save();
      }
    }
    const tokenData = {
      userId: user._id,
    };
    const token = jwt.sign(tokenData, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const sanitizedUser = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      adharcard: user.adharcard,
      pancard: user.pancard,
      role: user.role,
      profile: user.profile,
    };

    return res
      .status(200)
      .cookie("token", token, authCookieOptions)
      .json({
        message: createdNewUser
          ? `Account created successfully with Google for ${user.fullname}`
          : `This email is already registered. Logged in as ${user.fullname}`,
        user: sanitizedUser,
        success: true,
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Google authentication failed",
      success: false,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password || !role) {
      return res.status(400).json({
        message: "Missing required fields",
        success: false,
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        message: "Incorrect email or password",
        success: false,
      });
    }

    if (user.authProvider === "google") {
      return res.status(400).json({
        message: "This account was created with Google. Please use Continue with Google.",
        success: false,
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        message: "Your account is blocked by admin",
        success: false,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Incorrect email or password",
        success: false,
      });
    }

    if (isOwnerEmail(normalizedEmail) && user.role !== "Admin") {
      user.role = "Admin";
      await user.save();
    }

    if (user.role !== role && user.role !== "Admin") {
      return res.status(403).json({
        message: "You don't have the necessary role to access this resource",
        success: false,
      });
    }

    const tokenData = {
      userId: user._id,
    };
    const token = jwt.sign(tokenData, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const sanitizedUser = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      adharcard: user.adharcard,
      pancard: user.pancard,
      role: user.role,
      profile: user.profile,
    };

    return res
      .status(200)
      .cookie("token", token, authCookieOptions)
      .json({
        message: `Welcome back ${user.fullname}`,
        user: sanitizedUser,
        success: true,
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error login failed",
      success: false,
    });
  }
};

export const logout = async (req, res) => {
  try {
    return res
      .status(200)
      .cookie("token", "", clearAuthCookieOptions)
      .json({
      message: "Logged out successfully",
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error logging out",
      success: false,
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const sanitizedUser = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      adharcard: user.adharcard,
      pancard: user.pancard,
      role: user.role,
      profile: user.profile,
    };

    return res.status(200).json({
      user: sanitizedUser,
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error getting current user",
      success: false,
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, bio, skills, emailVerificationToken } = req.body;
    const file = req.file;

    const userId = req.id; // Assuming authentication middleware sets req.id
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    if (fullname) user.fullname = fullname;

    const normalizedIncomingEmail = normalizeEmailAddress(email);
    const currentEmail = normalizeEmailAddress(user.email);
    const hasEmailChanged = Boolean(normalizedIncomingEmail) && normalizedIncomingEmail !== currentEmail;

    if (hasEmailChanged) {
      if (!emailPattern.test(normalizedIncomingEmail)) {
        return res.status(400).json({
          message: "Enter a valid email address",
          success: false,
        });
      }

      const existingEmailUser = await User.findOne({ email: normalizedIncomingEmail }).select("_id");
      if (existingEmailUser && String(existingEmailUser._id) !== String(user._id)) {
        return res.status(400).json({
          message: "Email already exists",
          success: false,
        });
      }

      const emailVerification = await consumeEmailVerificationToken(
        normalizedIncomingEmail,
        String(emailVerificationToken || ""),
        OTP_PURPOSE_UPDATE_EMAIL
      );

      if (!emailVerification.ok) {
        return res.status(400).json({
          message: emailVerification.message,
          success: false,
        });
      }

      user.email = normalizedIncomingEmail;
    }

    if (phoneNumber) {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      if (!normalizedPhone) {
        return res.status(400).json({
          message: "Enter a valid phone number with country code",
          success: false,
        });
      }

      const hasPhoneChanged = String(normalizedPhone) !== String(user.phoneNumber || "");
      if (hasPhoneChanged) {
        const existingPhone = await User.findOne({ phoneNumber: normalizedPhone }).select("_id");
        if (existingPhone && String(existingPhone._id) !== String(user._id)) {
          return res.status(400).json({
            message: "Phone number already exists",
            success: false,
          });
        }
      }

      user.phoneNumber = normalizedPhone;
    }

    if (bio) user.profile.bio = bio;
    if (skills) user.profile.skills = String(skills).split(",");

    if (file && !isCloudinaryConfigured()) {
      return res.status(400).json({
        message: "Cloudinary is not configured. Remove resume upload or add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in Backend/.env.",
        success: false,
      });
    }

    if (file) {
      const fileUri = getDataUri(file);
      const isImageFile = file.mimetype?.startsWith("image/");

      if (isImageFile) {
        const cloudResponse = await uploadProfilePhoto(fileUri.content);
        user.profile.profilePhoto = cloudResponse.secure_url;
      } else {
        const baseName = file.originalname.replace(/\.[^/.]+$/, "");
        const safeBaseName = baseName
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .slice(0, 80);
        const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
          resource_type: "raw",
          folder: "resumes",
          public_id: `${Date.now()}_${safeBaseName}`,
          unique_filename: true,
        });
        user.profile.resume = cloudResponse.secure_url;
        user.profile.resumeOriginalname = file.originalname;
      }
    }

    await user.save();

    const updatedUser = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profile: user.profile,
    };

    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error updating profile",
      success: false,
    });
  }
};

const streamResumeFile = async (res, resumeUrl, fileName, inline = false) => {
  const response = await fetch(resumeUrl);
  if (!response.ok) {
    return res.status(502).json({
      message: "Unable to fetch resume file",
      success: false,
    });
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const rawContentType = response.headers.get("content-type") || "application/pdf";
  const isPdfByName = (fileName || "").toLowerCase().endsWith(".pdf");
  const contentType = inline && isPdfByName ? "application/pdf" : rawContentType;
  const safeFileName = fileName || "resume.pdf";

  res.setHeader("Content-Type", contentType);
  res.setHeader(
    "Content-Disposition",
    `${inline ? "inline" : "attachment"}; filename=\"${safeFileName}\"`
  );
  return res.status(200).send(buffer);
};

export const downloadResume = async (req, res) => {
  try {
    const user = await User.findById(req.id);

    if (!user || !user.profile?.resume) {
      return res.status(404).json({
        message: "Resume not found",
        success: false,
      });
    }

    return streamResumeFile(
      res,
      user.profile.resume,
      user.profile.resumeOriginalname || "resume.pdf",
      false
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error downloading resume",
      success: false,
    });
  }
};

const getTargetResumeUser = async (req) => {
  const requester = await User.findById(req.id).select("role");
  if (!requester) return { error: "User not found", code: 404 };

  const targetUserId = req.params.userId || req.id;

  if (requester.role !== "Recruiter" && String(targetUserId) !== String(req.id)) {
    return { error: "Access denied", code: 403 };
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser || !targetUser.profile?.resume) {
    return { error: "Resume not found", code: 404 };
  }

  return { targetUser };
};

export const downloadResumeByUserId = async (req, res) => {
  try {
    const result = await getTargetResumeUser(req);
    if (result.error) {
      return res.status(result.code).json({ message: result.error, success: false });
    }

    const { targetUser } = result;
    return streamResumeFile(
      res,
      targetUser.profile.resume,
      targetUser.profile.resumeOriginalname || "resume.pdf",
      false
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error downloading resume",
      success: false,
    });
  }
};

export const previewResumeByUserId = async (req, res) => {
  try {
    const result = await getTargetResumeUser(req);
    if (result.error) {
      return res.status(result.code).json({ message: result.error, success: false });
    }

    const { targetUser } = result;
    const response = await fetch(targetUser.profile.resume);
    if (!response.ok) {
      return res.status(502).json({
        message: "Unable to fetch resume file",
        success: false,
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Pdf = buffer.toString("base64");
    const displayName = targetUser.profile.resumeOriginalname || "resume.pdf";

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Resume Preview</title>
    <style>
      html, body { margin: 0; height: 100%; background: #0f172a; }
      .bar {
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 14px;
        color: #e2e8f0;
        font-family: Arial, sans-serif;
        font-size: 13px;
        background: #111827;
        border-bottom: 1px solid #1f2937;
      }
      .viewer { width: 100%; height: calc(100% - 44px); border: 0; }
      a { color: #93c5fd; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="bar">
      <span>${displayName}</span>
      <a href="/api/user/resume/${targetUser._id}/download" target="_blank" rel="noreferrer">Download</a>
    </div>
    <iframe class="viewer" src="data:application/pdf;base64,${base64Pdf}"></iframe>
  </body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error previewing resume",
      success: false,
    });
  }
};

export const analyzeResumeByJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const user = await User.findById(req.id);

    if (!user || !user.profile?.resume) {
      return res.status(404).json({
        message: "Resume not found. Upload a PDF resume first.",
        success: false,
      });
    }

    const job = await Job.findById(jobId).populate("company", "name");
    if (!job) {
      return res.status(404).json({
        message: "Job not found",
        success: false,
      });
    }

    const resumeResponse = await fetch(user.profile.resume);
    if (!resumeResponse.ok) {
      return res.status(502).json({
        message: "Could not fetch resume file for analysis",
        success: false,
      });
    }

    const resumeBuffer = Buffer.from(await resumeResponse.arrayBuffer());
    let resumeText = "";

    try {
      const parser = new PDFParse({ data: resumeBuffer });
      const parsed = await parser.getText();
      await parser.destroy();
      resumeText = (parsed?.text || "").toLowerCase();
    } catch (parseError) {
      return res.status(400).json({
        message: "Resume could not be parsed. Please upload a valid PDF resume.",
        success: false,
      });
    }

    if (!resumeText.trim()) {
      return res.status(400).json({
        message: "Resume text could not be extracted. Please upload a clean PDF.",
        success: false,
      });
    }

    const requirementText = [job.title, job.description, ...(job.requirements || [])].join(" ");
    const keywords = extractKeywords(requirementText).slice(0, 60);

    const matchedKeywords = keywords.filter((k) => resumeText.includes(k));
    const missingKeywords = keywords.filter((k) => !resumeText.includes(k));

    const keywordCoverage = keywords.length
      ? Math.round((matchedKeywords.length / keywords.length) * 100)
      : 0;

    const sectionChecks = {
      hasEmail: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(resumeText),
      hasPhone: /(\+\d{1,3}[\s-]?)?\d{10}/.test(resumeText),
      hasGithub: /github\.com\//i.test(resumeText),
      hasLinkedin: /linkedin\.com\//i.test(resumeText),
      hasSkillsSection: /skills?/i.test(resumeText),
    };

    const sectionScore =
      Object.values(sectionChecks).filter(Boolean).length / Object.keys(sectionChecks).length;

    const atsScore = Math.round(keywordCoverage * 0.8 + sectionScore * 20);

    const verdict =
      atsScore >= 80
        ? "Strong match"
        : atsScore >= 60
        ? "Moderate match"
        : "Needs improvement";

    return res.status(200).json({
      success: true,
      analysis: {
        atsScore,
        verdict,
        badge: atsScore >= 80 ? "GREEN" : atsScore >= 60 ? "AMBER" : "RED",
        keywordCoverage,
        matchedKeywords: matchedKeywords.slice(0, 20),
        missingKeywords: missingKeywords.slice(0, 20),
        sectionChecks,
        job: {
          _id: job._id,
          title: job.title,
          company: job.company?.name || "Unknown",
          location: job.location,
          experienceLevel: job.experienceLevel,
        },
        note:
          "This is an ATS-style estimate based on keyword and section checks. External platforms use their own proprietary scoring.",
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error analyzing resume",
      success: false,
    });
  }
};



















































































// import { User } from "../models/user.model.js";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import getDataUri from "../utils/datauri.js";
// import cloudinary from "../utils/cloud.js";

// export const register = async (req, res) => {
//   try {
//     const { fullname, email, phoneNumber, password, adharcard, pancard, role } =
//       req.body;

//     if (
//       !fullname ||
//       !email ||
//       !phoneNumber ||
//       !password ||
//       !role ||
//       !pancard ||
//       !adharcard
//     ) {
//       return res.status(404).json({
//         message: "Missing required fields",
//         success: false,
//       });
//     }
//     const file = req.file;
//     const fileUri = getDataUri(file);
//     const cloudResponse = await cloudinary.uploader.upload(fileUri.content);

//     const user = await User.findOne({ email });
//     if (user) {
//       return res.status(400).json({
//         message: "Email already exists",
//         success: false,
//       });
//     }
//     const user = await User.findOne({ adharcard });
//     if (adharcard) {
//       return res.status(400).json({
//         message: "Adharnumber already exists",
//         success: false,
//       });
//     }
//     const user = await User.findOne({ pancard });
//     if (pancard) {
//       return res.status(400).json({
//         message: "Pan number already exists",
//         success: false,
//       });
//     }
//     //convert passwords to hashes
//     const hashedPassword = await bcrypt.hash(password, 10);

//     const newUser = new User({
//       fullname,
//       email,
//       phoneNumber,
//       adharcard,
//       pancard,
//       password: hashedPassword,
//       role,
//       profile: {
//         profilePhoto: cloudResponse.secure_url,
//       },
//     });

//     await newUser.save();

//     return res.status(200).json({
//       message: `Account created successfully ${fullname}`,
//       success: true,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: "Server Error registering user",
//       success: false,
//     });
//   }
// };

// export const login = async (req, res) => {
//   try {
//     const { email, password, role } = req.body;

//     if (!email || !password || !adharcard || !role) {
//       return res.status(404).json({
//         message: "Missing required fields",
//         success: false,
//       });
//     }
//     let user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({
//         message: "Incorrect email or password",
//         success: false,
//       });
//     }
//     let user = await User.findOne({ adharcard });
//     if (adharcard) {
//       return res.status(404).json({
//         message: "Incorrect Adhar Number",
//         success: false,
//       });
//     }
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(404).json({
//         message: "Incorrect email or password",
//         success: false,
//       });
//     }
//     //check role correctly or not
//     if (user.role !== role) {
//       return res.status(403).json({
//         message: "You don't have the necessary role to access this resource",
//         success: false,
//       });
//     }

//     //generate token
//     const tokenData = {
//       userId: user._id,
//     };
//     const token = await jwt.sign(tokenData, process.env.JWT_SECRET, {
//       expiresIn: "1d",
//     });

//     user = {
//       _id: user._id,
//       fullname: user.fullname,
//       email: user.email,
//       phoneNumber: user.phoneNumber,
//       adharcard: user.adharcard,
//       pancard: user.pancard,
//       role: user.role,
//       profile: user.profile,
//     };

//     return res
//       .status(200)
//       .cookie("token", token, {
//         maxAge: 1 * 24 * 60 * 60 * 1000,
//         httpOnly: true,
//         sameSite: "Strict",
//       })
//       .json({
//         message: `Welcome back ${user.fullname}`,
//         user,
//         success: true,
//       });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: "Server Error login failed",
//       success: false,
//     });
//   }
// };

// export const logout = async (req, res) => {
//   try {
//     return res.status(200).cookie("token", "", { maxAge: 0 }).json({
//       message: "Logged out successfully.",
//       success: true,
//     });
//   } catch (error) {
//     console.log(error);
//   }
// };

// export const updateProfile = async (req, res) => {
//   try {
//     console.log("Uploaded file:", req.file);
//     console.log("Request body:", req.body);

//     const { fullname, email, phoneNumber, bio, skills } = req.body;
//     const file = req.file;

//     // Check if file is uploaded

//     //cloudinary upload
//     const fileUri = getDataUri(file);
//     const cloudResponse = await cloudinary.uploader.upload(fileUri.content);

//     // Initialize userId at the beginning
//     const userId = req.id; // middleware authentication

//     // Check if userId is valid
//     let user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({
//         message: "User  not found",
//         success: false,
//       });
//     }

//     // Process skills if provided
//     let skillsArray;
//     if (skills) {
//       skillsArray = skills.split(",");
//     }

//     // Update user profile
//     if (fullname) {
//       user.fullname = fullname;
//     }
//     if (email) {
//       user.email = email;
//     }
//     if (phoneNumber) {
//       user.phoneNumber = phoneNumber;
//     }
//     if (bio) {
//       user.profile.bio = bio;
//     }
//     if (skills) {
//       user.profile.skills = skillsArray;
//     }
//     //resume
//     if (cloudResponse) {
//       user.profile.resume = cloudResponse.secure_url;
//       user.profile.resumeOriginalName = file.originalname;
//     }

//     // Save updated user
//     await user.save();

//     user = {
//       _id: user._id,
//       fullname: user.fullname,
//       email: user.email,
//       phoneNumber: user.phoneNumber,
//       role: user.role,
//       profile: user.profile,
//     };

//     return res.status(200).json({
//       message: "Profile updated successfully",
//       user,
//       success: true,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: "Server Error updating profile",
//       success: false,
//     });
//   }
// };
