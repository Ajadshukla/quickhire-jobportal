import { User } from "../models/user.model.js";
import { Company } from "../models/company.model.js";
import { Job } from "../models/job.model.js";
import { Application } from "../models/application.model.js";
import { Announcement } from "../models/announcement.model.js";

const ensureOwner = (req, res) => {
  if (String(req.userRole || "") !== "Admin") {
    res.status(403).json({ success: false, message: "Owner access required" });
    return false;
  }
  return true;
};

export const getOwnerDashboard = async (req, res) => {
  try {
    if (!ensureOwner(req, res)) return;

    const [
      totalUsers,
      students,
      recruiters,
      blockedUsers,
      totalCompanies,
      verifiedCompanies,
      pendingCompanies,
      rejectedCompanies,
      totalJobs,
      totalApplications,
      recentUsers,
      recentCompanies,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "Student" }),
      User.countDocuments({ role: "Recruiter" }),
      User.countDocuments({ isBlocked: true }),
      Company.countDocuments({}),
      Company.countDocuments({ verificationStatus: "verified" }),
      Company.countDocuments({ verificationStatus: "pending" }),
      Company.countDocuments({ verificationStatus: "rejected" }),
      Job.countDocuments({}),
      Application.countDocuments({}),
      User.find({}).select("fullname email role isBlocked createdAt").sort({ createdAt: -1 }).limit(6),
      Company.find({}).select("name verificationStatus createdAt userId").populate("userId", "fullname email").sort({ createdAt: -1 }).limit(6),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        students,
        recruiters,
        blockedUsers,
        totalCompanies,
        verifiedCompanies,
        pendingCompanies,
        rejectedCompanies,
        totalJobs,
        totalApplications,
      },
      recentUsers,
      recentCompanies,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error loading owner dashboard" });
  }
};

export const getAllUsersForOwner = async (req, res) => {
  try {
    if (!ensureOwner(req, res)) return;

    const role = String(req.query.role || "").trim();
    const status = String(req.query.status || "").trim();
    const search = String(req.query.search || "").trim();

    const query = {};

    if (["Student", "Recruiter", "Admin"].includes(role)) {
      query.role = role;
    }

    if (status === "blocked") query.isBlocked = true;
    if (status === "active") query.isBlocked = false;

    if (search) {
      query.$or = [
        { fullname: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("fullname email role isBlocked blockedReason createdAt phoneNumber authProvider")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error fetching users" });
  }
};

export const updateUserBlockStatus = async (req, res) => {
  try {
    if (!ensureOwner(req, res)) return;

    const targetUserId = req.params.userId;
    const { isBlocked, reason } = req.body;

    const owner = await User.findById(req.id).select("_id");
    if (!owner) return res.status(404).json({ success: false, message: "Owner account not found" });

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (String(targetUser._id) === String(owner._id)) {
      return res.status(400).json({ success: false, message: "You cannot block your own owner account" });
    }

    if (targetUser.role === "Admin") {
      return res.status(400).json({ success: false, message: "Admin account cannot be blocked" });
    }

    targetUser.isBlocked = Boolean(isBlocked);
    targetUser.blockedAt = Boolean(isBlocked) ? new Date() : undefined;
    targetUser.blockedReason = Boolean(isBlocked) ? String(reason || "Blocked by owner") : "";

    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: targetUser.isBlocked ? "User blocked successfully" : "User unblocked successfully",
      user: {
        _id: targetUser._id,
        fullname: targetUser.fullname,
        email: targetUser.email,
        role: targetUser.role,
        isBlocked: targetUser.isBlocked,
        blockedReason: targetUser.blockedReason,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error updating user status" });
  }
};

export const getCompaniesForVerification = async (req, res) => {
  try {
    if (!ensureOwner(req, res)) return;

    const status = String(req.query.status || "").trim();
    const search = String(req.query.search || "").trim();

    const query = {};

    if (["pending", "verified", "rejected"].includes(status)) {
      query.verificationStatus = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    const companies = await Company.find(query)
      .populate("userId", "fullname email")
      .populate("verifiedBy", "fullname email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, companies });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error fetching companies" });
  }
};

export const updateCompanyVerification = async (req, res) => {
  try {
    if (!ensureOwner(req, res)) return;

    const companyId = req.params.companyId;
    const { status, note } = req.body;

    if (!["pending", "verified", "rejected"].includes(String(status || ""))) {
      return res.status(400).json({ success: false, message: "Invalid verification status" });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    company.verificationStatus = status;
    company.verificationNote = String(note || "").trim();

    if (status === "verified") {
      company.verifiedBy = req.id;
      company.verifiedAt = new Date();
    } else {
      company.verifiedBy = undefined;
      company.verifiedAt = undefined;
    }

    await company.save();

    return res.status(200).json({
      success: true,
      message:
        status === "verified"
          ? "Company verified successfully"
          : status === "rejected"
          ? "Company rejected"
          : "Company moved to pending",
      company,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error updating company verification" });
  }
};

const normalizeAudience = (value) => {
  const v = String(value || "").trim().toLowerCase();
  if (["student", "students", "all", "everyone", "both"].includes(v)) return "Student";
  return "";
};

const normalizePriority = (value) => {
  const v = String(value || "").trim().toLowerCase();
  const map = {
    normal: "normal",
    important: "important",
    critical: "critical",
  };
  return map[v] || "normal";
};

export const getOwnerAnnouncements = async (req, res) => {
  try {
    if (!ensureOwner(req, res)) return;

    const announcements = await Announcement.find({})
      .populate("createdBy", "fullname email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, announcements });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error loading announcements" });
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    if (!ensureOwner(req, res)) return;

    const title = String(req.body?.title || "").trim();
    const message = String(req.body?.message || "").trim();
    const audience = "Student";
    const priority = normalizePriority(req.body?.priority);
    const isActive = req.body?.isActive !== false;

    const publishAt = req.body?.publishAt ? new Date(req.body.publishAt) : new Date();
    const expireAt = req.body?.expireAt ? new Date(req.body.expireAt) : undefined;

    if (!title || !message || !audience) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required. Announcements are student-only.",
      });
    }

    if (Number.isNaN(publishAt.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid publish date" });
    }

    if (expireAt && Number.isNaN(expireAt.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid expiry date" });
    }

    if (expireAt && expireAt <= publishAt) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be after publish date",
      });
    }

    const announcement = await Announcement.create({
      title,
      message,
      audience,
      priority,
      isActive,
      publishAt,
      expireAt,
      createdBy: req.id,
    });

    return res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      announcement,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error creating announcement" });
  }
};

export const updateAnnouncement = async (req, res) => {
  try {
    if (!ensureOwner(req, res)) return;

    const announcement = await Announcement.findById(req.params.announcementId);
    if (!announcement) {
      return res.status(404).json({ success: false, message: "Announcement not found" });
    }

    const nextTitle = req.body?.title !== undefined ? String(req.body.title || "").trim() : announcement.title;
    const nextMessage =
      req.body?.message !== undefined ? String(req.body.message || "").trim() : announcement.message;
    const nextAudience = "Student";

    if (!nextTitle || !nextMessage || !nextAudience) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required. Announcements are student-only.",
      });
    }

    announcement.title = nextTitle;
    announcement.message = nextMessage;
    announcement.audience = nextAudience;
    announcement.priority =
      req.body?.priority !== undefined ? normalizePriority(req.body.priority) : announcement.priority;

    if (req.body?.isActive !== undefined) {
      announcement.isActive = Boolean(req.body.isActive);
    }

    if (req.body?.publishAt !== undefined) {
      const publishAt = req.body.publishAt ? new Date(req.body.publishAt) : new Date();
      if (Number.isNaN(publishAt.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid publish date" });
      }
      announcement.publishAt = publishAt;
    }

    if (req.body?.expireAt !== undefined) {
      if (!req.body.expireAt) {
        announcement.expireAt = undefined;
      } else {
        const expireAt = new Date(req.body.expireAt);
        if (Number.isNaN(expireAt.getTime())) {
          return res.status(400).json({ success: false, message: "Invalid expiry date" });
        }
        announcement.expireAt = expireAt;
      }
    }

    if (announcement.expireAt && announcement.expireAt <= announcement.publishAt) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be after publish date",
      });
    }

    await announcement.save();

    return res.status(200).json({
      success: true,
      message: "Announcement updated successfully",
      announcement,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error updating announcement" });
  }
};
