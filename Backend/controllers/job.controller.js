import { Job } from "../models/job.model.js";
import { Company } from "../models/company.model.js";
import { User } from "../models/user.model.js";
//Admin job posting
export const postJob = async (req, res) => {
  try {
    const {
      title,
      description,
      requirements,
      salary,
      location,
      jobType,
      experience,
      position,
      companyId,
    } = req.body;
    const userId = req.id;

    if (
      !title ||
      !description ||
      !requirements ||
      !salary ||
      !location ||
      !jobType ||
      !experience ||
      !position ||
      !companyId
    ) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }

    const company = await Company.findById(companyId).select("userId verificationStatus");
    if (!company) {
      return res.status(404).json({ message: "Company not found", success: false });
    }

    if (String(company.userId) !== String(userId)) {
      return res.status(403).json({ message: "You can only post jobs for your own company", success: false });
    }

    if (company.verificationStatus !== "verified") {
      return res.status(403).json({
        message: "Company is not verified by owner yet. Job posting is disabled until verification.",
        success: false,
      });
    }

    const job = await Job.create({
      title,
      description,
      requirements: requirements.split(","),
      salary: Number(salary),
      location,
      jobType,
      experienceLevel: experience,
      position,
      company: companyId,
      created_by: userId,
    });
    res.status(201).json({
      message: "Job posted successfully.",
      job,
      status: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", status: false });
  }
};

//Users
export const getAllJobs = async (req, res) => {
  try {
    const keyword = req.query.keyword || "";
    const query = {
      $or: [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ],
    };
    const jobs = await Job.find(query)
      .populate({
        path: "company",
        match: { verificationStatus: "verified" },
      })
      .sort({ createdAt: -1 });

    const visibleJobs = jobs.filter((job) => Boolean(job.company));

    if (!visibleJobs) {
      return res.status(404).json({ message: "No jobs found", status: false });
    }
    return res.status(200).json({ jobs: visibleJobs, status: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", status: false });
  }
};

//Users
export const getJobById = async (req, res) => {
  try {
    const jobId = req.params.id;
    const job = await Job.findById(jobId)
      .populate({ path: "applications" })
      .populate({ path: "company", select: "verificationStatus" });

    if (!job) {
      return res.status(404).json({ message: "Job not found", status: false });
    }

    const isAdmin = String(req.userRole || "") === "Admin";
    const isCreator = String(job.created_by || "") === String(req.id || "");
    const isVerified = String(job?.company?.verificationStatus || "") === "verified";

    if (!isVerified && !isAdmin && !isCreator) {
      return res.status(404).json({ message: "Job not available", status: false });
    }

    return res.status(200).json({ job, status: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", status: false });
  }
};

//Admin job created

export const getAdminJobs = async (req, res) => {
  try {
    const adminId = req.id;
    const jobs = await Job.find({ created_by: adminId }).populate({
      path: "company",
      sort: { createdAt: -1 },
    });
    if (!jobs) {
      return res.status(404).json({ message: "No jobs found", status: false });
    }
    return res.status(200).json({ jobs, status: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", status: false });
  }
};

export const toggleSaveJob = async (req, res) => {
  try {
    const user = await User.findById(req.id).select("role profile");
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    if (String(user.role || "") !== "Student") {
      return res.status(403).json({ message: "Only students can save jobs", success: false });
    }

    const jobId = req.params.id;
    const job = await Job.findById(jobId).populate({
      path: "company",
      select: "verificationStatus",
    });

    if (!job || !job.company || job.company.verificationStatus !== "verified") {
      return res.status(404).json({ message: "Job not available", success: false });
    }

    if (!user.profile) user.profile = {};
    if (!Array.isArray(user.profile.savedJobs)) user.profile.savedJobs = [];

    const existingIndex = user.profile.savedJobs.findIndex(
      (savedJobId) => String(savedJobId) === String(jobId)
    );

    let isSaved = false;
    if (existingIndex >= 0) {
      user.profile.savedJobs.splice(existingIndex, 1);
      isSaved = false;
    } else {
      user.profile.savedJobs.push(jobId);
      isSaved = true;
    }

    user.markModified("profile");
    await user.save();

    const savedJobIds = user.profile.savedJobs.map((id) => String(id));

    return res.status(200).json({
      success: true,
      isSaved,
      message: isSaved ? "Job saved successfully" : "Job removed from saved list",
      savedJobIds,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", success: false });
  }
};

export const getSavedJobs = async (req, res) => {
  try {
    const user = await User.findById(req.id)
      .select("role profile.savedJobs")
      .populate({
        path: "profile.savedJobs",
        populate: {
          path: "company",
          match: { verificationStatus: "verified" },
        },
      });

    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    if (String(user.role || "") !== "Student") {
      return res.status(403).json({ message: "Only students can view saved jobs", success: false });
    }

    const jobs = (user.profile?.savedJobs || []).filter((job) => Boolean(job && job.company));
    const savedJobIds = jobs.map((job) => String(job._id));

    return res.status(200).json({ success: true, jobs, savedJobIds });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", success: false });
  }
};
