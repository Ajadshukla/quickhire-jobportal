import { Announcement } from "../models/announcement.model.js";

const priorityRank = (priority) => {
  if (priority === "critical") return 3;
  if (priority === "important") return 2;
  return 1;
};

export const getStudentAnnouncements = async (req, res) => {
  try {
    if (String(req.userRole || "") !== "Student") {
      return res.status(200).json({ success: true, announcements: [] });
    }

    const now = new Date();

    const announcements = await Announcement.find({
      isActive: true,
      audience: "Student",
      publishAt: { $lte: now },
      $or: [{ expireAt: { $exists: false } }, { expireAt: null }, { expireAt: { $gte: now } }],
    })
      .sort({ publishAt: -1, createdAt: -1 })
      .limit(10)
      .lean();

    announcements.sort((a, b) => {
      const rankDiff = priorityRank(b.priority) - priorityRank(a.priority);
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime();
    });

    return res.status(200).json({ success: true, announcements });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error loading announcements" });
  }
};
