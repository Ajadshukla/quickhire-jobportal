import { Application } from "../models/application.model.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";

const normalizeRole = (role) => String(role || "").trim().toLowerCase();

const findAcceptedApplicationForUser = async (applicationId, userId) => {
  const application = await Application.findById(applicationId)
    .populate({
      path: "job",
      select: "title created_by",
      populate: {
        path: "created_by",
        select: "fullname role profile.profilePhoto",
      },
    })
    .populate({
      path: "applicant",
      select: "fullname role profile.profilePhoto",
    });

  if (!application) {
    return { error: { code: 404, message: "Application not found" } };
  }

  if (String(application.status || "") !== "accepted") {
    return {
      error: {
        code: 403,
        message: "Messaging is enabled only for accepted applications",
      },
    };
  }

  const recruiterId = application?.job?.created_by?._id || application?.job?.created_by;
  const studentId = application?.applicant?._id || application?.applicant;

  const isRecruiter = String(recruiterId || "") === String(userId || "");
  const isStudent = String(studentId || "") === String(userId || "");

  if (!isRecruiter && !isStudent) {
    return {
      error: {
        code: 403,
        message: "Not authorized for this application conversation",
      },
    };
  }

  return {
    application,
    recruiterId,
    studentId,
    isRecruiter,
    isStudent,
  };
};

const emitMessageEvent = async (req, conversationId, messageId) => {
  const io = req.app.get("io");
  if (!io) return;

  const message = await Message.findById(messageId).populate({
    path: "sender",
    select: "fullname role profile.profilePhoto",
  });

  io.to(`conversation:${conversationId}`).emit("message:new", {
    conversationId: String(conversationId),
    message,
  });
};

const buildThreadPayload = (application, conversation, currentUserId) => {
  const recruiter = application?.job?.created_by;
  const student = application?.applicant;
  const isRecruiter = String(recruiter?._id || recruiter || "") === String(currentUserId || "");

  const peer = isRecruiter ? student : recruiter;

  return {
    applicationId: application?._id,
    job: {
      id: application?.job?._id,
      title: application?.job?.title || "Untitled Job",
    },
    conversationId: conversation?._id || null,
    unlockedByRecruiter: Boolean(conversation?.unlockedByRecruiter),
    lastMessageText: conversation?.lastMessageText || "",
    lastMessageAt: conversation?.lastMessageAt || null,
    peer: {
      _id: peer?._id || null,
      fullname: peer?.fullname || "",
      role: peer?.role || "",
      profile: peer?.profile || {},
    },
  };
};

export const getMessageThreads = async (req, res) => {
  try {
    const role = normalizeRole(req.userRole);
    if (role !== "student" && role !== "recruiter") {
      return res.status(403).json({
        message: "Only students and recruiters can access messages",
        success: false,
      });
    }

    let applications = [];

    if (role === "student") {
      applications = await Application.find({
        applicant: req.id,
        status: "accepted",
      })
        .populate({
          path: "job",
          select: "title created_by",
          populate: {
            path: "created_by",
            select: "fullname role profile.profilePhoto",
          },
        })
        .populate({
          path: "applicant",
          select: "fullname role profile.profilePhoto",
        })
        .sort({ updatedAt: -1 });
    } else {
      applications = await Application.find({
        status: "accepted",
      })
        .populate({
          path: "job",
          select: "title created_by",
          populate: {
            path: "created_by",
            select: "fullname role profile.profilePhoto",
          },
        })
        .populate({
          path: "applicant",
          select: "fullname role profile.profilePhoto",
        })
        .sort({ updatedAt: -1 });

      applications = applications.filter(
        (item) => String(item?.job?.created_by?._id || "") === String(req.id)
      );
    }

    const applicationIds = applications.map((item) => item._id);
    const conversations = await Conversation.find({
      application: { $in: applicationIds },
    }).select("application unlockedByRecruiter lastMessageText lastMessageAt");

    const conversationMap = new Map(
      conversations.map((conversation) => [String(conversation.application), conversation])
    );

    const threads = applications
      .map((application) =>
        buildThreadPayload(
          application,
          conversationMap.get(String(application._id)),
          req.id
        )
      )
      .sort((a, b) => {
        const left = new Date(a.lastMessageAt || 0).getTime();
        const right = new Date(b.lastMessageAt || 0).getTime();
        return right - left;
      });

    return res.status(200).json({
      threads,
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};

export const getConversationByApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const access = await findAcceptedApplicationForUser(applicationId, req.id);
    if (access.error) {
      return res.status(access.error.code).json({
        message: access.error.message,
        success: false,
      });
    }

    const conversation = await Conversation.findOne({
      application: access.application._id,
    }).select("application student recruiter unlockedByRecruiter lastMessageAt lastMessageText");

    const messages = conversation
      ? await Message.find({ conversation: conversation._id })
          .populate({
            path: "sender",
            select: "fullname role profile.profilePhoto",
          })
          .sort({ createdAt: 1 })
      : [];

    return res.status(200).json({
      thread: buildThreadPayload(access.application, conversation, req.id),
      conversation,
      messages,
      canStudentInteract: Boolean(conversation?.unlockedByRecruiter),
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};

export const initiateConversation = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const text = String(req.body?.text || "").trim();

    if (!text) {
      return res.status(400).json({
        message: "First message is required",
        success: false,
      });
    }

    const access = await findAcceptedApplicationForUser(applicationId, req.id);
    if (access.error) {
      return res.status(access.error.code).json({
        message: access.error.message,
        success: false,
      });
    }

    if (!access.isRecruiter) {
      return res.status(403).json({
        message: "Only recruiter can send the first message",
        success: false,
      });
    }

    let conversation = await Conversation.findOne({
      application: access.application._id,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        application: access.application._id,
        student: access.studentId,
        recruiter: access.recruiterId,
        unlockedByRecruiter: true,
      });
    } else if (!conversation.unlockedByRecruiter) {
      conversation.unlockedByRecruiter = true;
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.id,
      text,
    });

    conversation.lastMessageText = text;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    await emitMessageEvent(req, conversation._id, message._id);

    const messages = await Message.find({ conversation: conversation._id })
      .populate({
        path: "sender",
        select: "fullname role profile.profilePhoto",
      })
      .sort({ createdAt: 1 });

    return res.status(201).json({
      message: "Conversation started",
      conversation,
      messages,
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const text = String(req.body?.text || "").trim();

    if (!text) {
      return res.status(400).json({
        message: "Message text is required",
        success: false,
      });
    }

    const conversation = await Conversation.findById(conversationId).populate({
      path: "application",
      select: "status",
    });

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
        success: false,
      });
    }

    if (String(conversation?.application?.status || "") !== "accepted") {
      return res.status(403).json({
        message: "Messaging is disabled because application is not accepted",
        success: false,
      });
    }

    const isRecruiter = String(conversation.recruiter || "") === String(req.id || "");
    const isStudent = String(conversation.student || "") === String(req.id || "");

    if (!isRecruiter && !isStudent) {
      return res.status(403).json({
        message: "Not authorized for this conversation",
        success: false,
      });
    }

    if (isStudent && !conversation.unlockedByRecruiter) {
      return res.status(403).json({
        message: "Student can reply only after recruiter sends the first message",
        success: false,
      });
    }

    if (isRecruiter && !conversation.unlockedByRecruiter) {
      conversation.unlockedByRecruiter = true;
    }

    const newMessage = await Message.create({
      conversation: conversation._id,
      sender: req.id,
      text,
    });

    conversation.lastMessageText = text;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    await emitMessageEvent(req, conversation._id, newMessage._id);

    const message = await Message.findById(newMessage._id).populate({
      path: "sender",
      select: "fullname role profile.profilePhoto",
    });

    return res.status(201).json({
      message,
      conversation,
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};
