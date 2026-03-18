import { Company } from "../models/company.model.js";
import getDataUri from "../utils/datauri.js";
import cloudinary from '../utils/cloud.js';

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


export const registerCompany = async (req, res) => {
  try {
    if (String(req.userRole || "") !== "Recruiter") {
      return res.status(403).json({
        message: "Only recruiters can create companies",
        success: false,
      });
    }

    const { companyName } = req.body;
    if (!companyName) {
      return res.status(401).json({
        message: "Company name is required",
        success: false,
      });
    }
    let company = await Company.findOne({ name: companyName });
    if (company) {
      return res.status(401).json({
        message: "Company already exists",
        success: false,
      });
    }
    company = await Company.create({
      name: companyName,
      userId: req.id,
    });
    return res.status(201).json({
      message: "Company registered successfully.",
      company,
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server Error", success: false });
  }
};

export const getAllCompanies = async (req, res) => {
  try {
    const userId = req.id; // loggedin user id
    const companies =
      String(req.userRole || "") === "Admin"
        ? await Company.find({}).sort({ createdAt: -1 })
        : await Company.find({ userId }).sort({ createdAt: -1 });
    if (!companies) {
      return res.status(404).json({ message: "No companies found" });
    }
    return res.status(200).json({
      companies,
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", success: false });
  }
};

//get company by id
export const getCompanyById = async (req, res) => {
  try {
    const companyId = req.params.id;
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    if (String(company.userId) !== String(req.id)) {
      return res.status(403).json({ message: "Not authorized to view this company", success: false });
    }

    return res.status(200).json({ company, success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", success: false });
  }
};

//update company details
export const updateCompany = async (req, res) => {
  try {
    const { name, description, website, location } = req.body;
    const file = req.file;
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "Company not found", success: false });
    }

    if (String(company.userId) !== String(req.id)) {
      return res.status(403).json({ message: "Not authorized to update this company", success: false });
    }

    const normalizeText = (value) => String(value || "").trim();
    const normalizedIncoming = {
      name: normalizeText(name),
      description: normalizeText(description),
      website: normalizeText(website),
      location: normalizeText(location),
    };

    const normalizedCurrent = {
      name: normalizeText(company.name),
      description: normalizeText(company.description),
      website: normalizeText(company.website),
      location: normalizeText(company.location),
    };

    const updateData = {};
    if (normalizedIncoming.name && normalizedIncoming.name !== normalizedCurrent.name) {
      updateData.name = normalizedIncoming.name;
    }
    if (normalizedIncoming.description !== normalizedCurrent.description) {
      updateData.description = normalizedIncoming.description;
    }
    if (normalizedIncoming.website !== normalizedCurrent.website) {
      updateData.website = normalizedIncoming.website;
    }
    if (normalizedIncoming.location !== normalizedCurrent.location) {
      updateData.location = normalizedIncoming.location;
    }

    if (file && !isCloudinaryConfigured()) {
      return res.status(400).json({
        message: "Cloudinary is not configured. Remove logo upload or add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in Backend/.env.",
        success: false,
      });
    }

    if (file) {
      const fileUri = getDataUri(file);
      const cloudResponse = await cloudinary.uploader.upload(fileUri.content);
      updateData.logo = cloudResponse.secure_url;
    }

    const hasActualChanges = Object.keys(updateData).length > 0;
    if (!hasActualChanges) {
      return res.status(200).json({
        message: "No changes detected. Company profile is unchanged.",
        success: true,
        changed: false,
        reviewStatus: company.verificationStatus,
      });
    }

    const wasRejected = company.verificationStatus === "rejected";
    if (wasRejected) {
      updateData.verificationStatus = "pending";
      updateData.verifiedBy = undefined;
      updateData.verifiedAt = undefined;
      updateData.verificationNote = "Resubmitted by recruiter after profile updates";
    }

    const updatedCompany = await Company.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    return res.status(200).json({
      message: wasRejected
        ? "Company updated and resubmitted for owner review"
        : "Company updated",
      success: true,
      changed: true,
      reviewStatus: wasRejected ? "pending" : updatedCompany?.verificationStatus || company.verificationStatus,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", success: false });
  }
};
