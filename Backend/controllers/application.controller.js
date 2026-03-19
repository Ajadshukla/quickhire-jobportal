import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import { Company } from "../models/company.model.js";

const cleanupOrphanApplications = async (applicationIds = []) => {
  const ids = Array.from(new Set((applicationIds || []).map((id) => String(id)).filter(Boolean)));
  if (ids.length === 0) return;

  await Application.deleteMany({ _id: { $in: ids } });
  await Job.updateMany({}, { $pull: { applications: { $in: ids } } });
};

export const applyJob = async (req, res) => {
  try {
    const userId = req.id;
    const jobId = req.params.id;

    const user = await User.findById(userId).select("role");
    if (!user || String(user.role || "") !== "Student") {
      return res.status(403).json({ message: "Only students can apply for jobs", success: false });
    }

    if (!jobId) {
      return res
        .status(400)
        .json({ message: "Invalid job id", success: false });
    }
    // check if the user already has applied for this job
    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: userId,
    });
    if (existingApplication) {
      return res.status(400).json({
        message: "You have already applied for this job",
        success: false,
      });
    }
    //check if the job exists or not
    const job = await Job.findById(jobId).select("company created_by");
    if (!job) {
      return res.status(404).json({ message: "Job not found", success: false });
    }

    if (String(job.created_by) === String(userId)) {
      return res.status(400).json({ message: "You cannot apply to your own job", success: false });
    }

    const company = await Company.findById(job.company).select("verificationStatus");
    if (!company || company.verificationStatus !== "verified") {
      return res.status(400).json({ message: "This job is not available for applications", success: false });
    }
    // create a new application

    const newApplication = await Application.create({
      job: jobId,
      applicant: userId,
    });
    job.applications.push(newApplication._id);
    await job.save();

    return res
      .status(201)
      .json({ message: "Application submitted", success: true });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        message: "You have already applied for this job",
        success: false,
      });
    }

    console.error(error);
    res.status(500).json({ message: "Server error", success: false });
  }
};

export const getAppliedJobs = async (req, res) => {
  try {
    const userId = req.id;
    const application = await Application.find({ applicant: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "job",
        options: { sort: { createdAt: -1 } },
        populate: { path: "company", options: { sort: { createdAt: -1 } } },
      });

    const orphaned = application.filter((item) => !item?.job).map((item) => item?._id);
    if (orphaned.length > 0) {
      await cleanupOrphanApplications(orphaned);
    }

    const validApplications = application.filter((item) => Boolean(item?.job));

    if (!application) {
      return res
        .status(404)
        .json({ message: "No applications found", success: false });
    }

    return res.status(200).json({ application: validApplications, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", success: false });
  }
};

export const getApplicants = async (req, res) => {
  try {
    const jobId = req.params.id;
    const currentUser = await User.findById(req.id).select("role");
    if (!currentUser) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    const job = await Job.findById(jobId).select("created_by title company applications");
    if (!job) {
      return res.status(404).json({ message: "Job not found", success: false });
    }

    const isOwnerAdmin = String(currentUser.role || "") === "Admin";
    if (!isOwnerAdmin && String(job.created_by) !== String(req.id)) {
      return res.status(403).json({ message: "Not authorized to view applicants", success: false });
    }

    // Query applications directly so applicants still appear even if job.applications got stale.
    const applications = await Application.find({ job: jobId })
      .sort({ createdAt: -1 })
      .populate({ path: "applicant", options: { sort: { createdAt: -1 } } });

    const orphaned = (applications || [])
      .filter((item) => !item?.applicant)
      .map((item) => item?._id);

    if (orphaned.length > 0) {
      await cleanupOrphanApplications(orphaned);
    }

    const validApplications = (applications || []).filter((item) => Boolean(item?.applicant));

    const missingRefs = validApplications
      .map((item) => String(item?._id || ""))
      .filter((id) => id && !(job.applications || []).some((existingId) => String(existingId) === id));

    if (missingRefs.length > 0) {
      await Job.findByIdAndUpdate(jobId, { $addToSet: { applications: { $each: missingRefs } } });
    }

    const jobResponse = {
      ...job.toObject(),
      applications: validApplications,
    };

    return res.status(200).json({ job: jobResponse, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", success: false });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const applicationId = req.params.id;
    if (!status) {
      return res.status(400).json({
        message: "status is required",
        success: false,
      });
    }

    // find the application by applicantion id
    const application = await Application.findOne({ _id: applicationId });
    if (!application) {
      return res.status(404).json({
        message: "Application not found.",
        success: false,
      });
    }

    const currentUser = await User.findById(req.id).select("role");
    if (!currentUser) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    const job = await Job.findById(application.job).select("created_by");
    if (!job) {
      return res.status(404).json({ message: "Job not found", success: false });
    }

    const isOwnerAdmin = String(currentUser.role || "") === "Admin";
    if (!isOwnerAdmin && String(job.created_by) !== String(req.id)) {
      return res.status(403).json({ message: "Not authorized to update applicant status", success: false });
    }

    // update the status
    application.status = status.toLowerCase();
    await application.save();

    return res
      .status(200)
      .json({ message: "Application status updated", success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", success: false });
  }
};
