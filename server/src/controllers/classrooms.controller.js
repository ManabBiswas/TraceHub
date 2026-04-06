import mongoose from "mongoose";
import Classroom from "../models/Classroom.js";
import ClassPost from "../models/ClassPost.js";
import Submission from "../models/Submission.js";
import { mintVersionProof } from "../services/algorand.service.js";
import { uploadToDuality } from "../services/storage.service.js";

const generateJoinCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const isTeacherInClassroom = (classroom, userId) => {
  const id = String(userId);
  return (
    String(classroom.ownerId) === id ||
    classroom.teacherIds.some((teacherId) => String(teacherId) === id)
  );
};

const isStudentInClassroom = (classroom, userId) => {
  const id = String(userId);
  return classroom.studentIds.some((studentId) => String(studentId) === id);
};

const canAccessClassroom = (classroom, userId) => {
  return (
    isTeacherInClassroom(classroom, userId) ||
    isStudentInClassroom(classroom, userId)
  );
};

const ensureTeacherSubscriptionActive = (user) => {
  if (user.role === "HOD") {
    return true;
  }

  if (user.role !== "PROFESSOR") {
    return false;
  }

  return user.hasActiveTeacherSubscription();
};

const parseAllowedSubmissionTypes = (value) => {
  if (!Array.isArray(value) || value.length === 0) {
    return ["LINK", "FILE"];
  }

  const normalized = value
    .map((entry) => String(entry).toUpperCase())
    .filter((entry) => entry === "LINK" || entry === "FILE");

  return normalized.length > 0 ? [...new Set(normalized)] : ["LINK", "FILE"];
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
};

const parseNullableNumber = (value) => {
  if (value === null || typeof value === "undefined" || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseAttachmentsInput = (attachments) => {
  if (!attachments) return [];
  if (Array.isArray(attachments)) return attachments;

  if (typeof attachments === "string") {
    try {
      const parsed = JSON.parse(attachments);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  return [];
};

const toVersionAttachments = (attachments = []) => {
  return attachments.map((attachment) => ({
    title: attachment?.title || "",
    fileName: attachment?.fileName || "",
    mimeType: attachment?.mimeType || "",
    size: Number(attachment?.size || 0),
    hasBinaryData: Boolean(attachment?.data),
    url: attachment?.url || "",
  }));
};

const createPostVersionSnapshot = ({
  post,
  versionNumber,
  action,
  user,
  algorandTxId,
}) => {
  return {
    versionNumber,
    action,
    title: post.title,
    body: post.body,
    type: post.type,
    dueDate: post.dueDate,
    points: post.points,
    allowStudentSubmissions: post.allowStudentSubmissions,
    allowedSubmissionTypes: post.allowedSubmissionTypes,
    attachments: toVersionAttachments(post.attachments || []),
    updatedByUserId: user._id,
    updatedByName: user.name,
    updatedByRole: user.role,
    updatedAt: new Date(),
    algorandTxId: algorandTxId || "",
  };
};

const toSubmissionVersionFiles = (files = []) => {
  return files.map((file) => ({
    fileName: file?.fileName || "",
    mimeType: file?.mimeType || "",
    size: Number(file?.size || 0),
    hasBinaryData: Boolean(file?.data),
  }));
};

const createSubmissionVersionSnapshot = ({
  submission,
  versionNumber,
  action,
  user,
  algorandTxId,
}) => {
  return {
    versionNumber,
    action,
    contentType: submission.contentType,
    link: submission.link || "",
    text: submission.text || "",
    files: toSubmissionVersionFiles(submission.files || []),
    status: submission.status,
    marks: submission.marks,
    feedback: submission.feedback || "",
    updatedByUserId: user._id,
    updatedByName: user.name,
    updatedByRole: user.role,
    updatedAt: new Date(),
    algorandTxId: algorandTxId || "",
  };
};

export const createClassroom = async (req, res) => {
  try {
    const { name, section, subject, room, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Classroom name is required" });
    }

    if (!ensureTeacherSubscriptionActive(req.user)) {
      return res.status(403).json({
        error:
          "Teacher subscription inactive. Renew your subscription to create classrooms.",
      });
    }

    let joinCode = generateJoinCode();
    while (await Classroom.exists({ joinCode })) {
      joinCode = generateJoinCode();
    }

    const classroom = await Classroom.create({
      name,
      section: section || "",
      subject: subject || "",
      room: room || "",
      description: description || "",
      joinCode,
      ownerId: req.user._id,
      teacherIds: [req.user._id],
      studentIds: [],
    });

    return res.status(201).json({
      message: "Classroom created",
      classroom,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const fetchClassrooms = async (req, res) => {
  try {
    const userId = req.user._id;
    const classrooms = await Classroom.find({
      $or: [
        { ownerId: userId },
        { teacherIds: userId },
        { studentIds: userId },
      ],
    })
      .populate("ownerId", "name email role")
      .sort({ createdAt: -1 });

    return res.json({ classrooms });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const joinClassroom = async (req, res) => {
  try {
    const { joinCode } = req.body;

    if (!joinCode) {
      return res.status(400).json({ error: "joinCode is required" });
    }

    const classroom = await Classroom.findOne({
      joinCode: String(joinCode).toUpperCase(),
    });
    if (!classroom) {
      return res
        .status(404)
        .json({ error: "Classroom not found for this join code" });
    }

    if (
      isTeacherInClassroom(classroom, req.user._id) ||
      isStudentInClassroom(classroom, req.user._id)
    ) {
      return res.status(200).json({
        message: "Already joined this classroom",
        classroom,
      });
    }

    classroom.studentIds.push(req.user._id);
    await classroom.save();

    return res.json({
      message: "Classroom joined successfully",
      classroom,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const createPost = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const {
      title,
      body,
      type,
      dueDate,
      points,
      attachments,
      allowStudentSubmissions,
      allowedSubmissionTypes,
    } = req.body;
    const uploadedFiles = Array.isArray(req.files) ? req.files : [];

    if (!isValidObjectId(classroomId)) {
      return res.status(400).json({ error: "Invalid classroomId" });
    }

    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    if (!isTeacherInClassroom(classroom, req.user._id)) {
      return res
        .status(403)
        .json({ error: "Only classroom teachers can create posts" });
    }

    if (!ensureTeacherSubscriptionActive(req.user)) {
      return res.status(403).json({
        error:
          "Teacher subscription inactive. Renew your subscription to create posts.",
      });
    }

    const postType = type || "ANNOUNCEMENT";
    const resolvedAllowStudentSubmissions =
      typeof allowStudentSubmissions !== "undefined"
        ? parseBoolean(allowStudentSubmissions)
        : postType === "ASSIGNMENT" || postType === "PROJECT";

    const resolvedSubmissionTypes = parseAllowedSubmissionTypes(
      typeof allowedSubmissionTypes === "string"
        ? parseAttachmentsInput(allowedSubmissionTypes)
        : allowedSubmissionTypes,
    );

    const parsedAttachments = parseAttachmentsInput(attachments).filter(
      (entry) =>
        entry &&
        typeof entry.title === "string" &&
        typeof entry.url === "string" &&
        entry.url.length > 0,
    );

    const uploadedAttachments = uploadedFiles.map((file) => ({
      title: file.originalname,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      data: file.buffer,
      url: "",
    }));

    // Upload files to Pinata and populate URLs
    for (let i = 0; i < uploadedAttachments.length; i += 1) {
      try {
        const url = await uploadToDuality(
          uploadedAttachments[i].data,
          uploadedAttachments[i].fileName,
        );
        uploadedAttachments[i].url = url;
        // Remove data field after uploading to Pinata (data is now in IPFS)
        delete uploadedAttachments[i].data;
      } catch (error) {
        console.error(
          `Failed to upload ${uploadedAttachments[i].fileName}:`,
          error.message,
        );
        // Keep the data field as fallback if Pinata upload fails
      }
    }

    const mergedAttachments = [...parsedAttachments, ...uploadedAttachments];

    const post = new ClassPost({
      classroomId,
      authorId: req.user._id,
      title,
      body: body || "",
      type: postType,
      dueDate: dueDate || null,
      points: parseNullableNumber(points),
      allowStudentSubmissions: resolvedAllowStudentSubmissions,
      allowedSubmissionTypes: resolvedSubmissionTypes,
      attachments: mergedAttachments,
      versionNumber: 1,
      versionHistory: [],
    });

    let versionTxId = "";
    try {
      versionTxId = await mintVersionProof({
        entityType: "CLASS_POST",
        entityId: String(post._id),
        versionNumber: 1,
        action: "CREATE",
        actor: req.user.name,
        payload: {
          title: post.title,
          type: post.type,
          classroomId: String(classroomId),
        },
      });
    } catch (_error) {
      versionTxId = process.env.DEMO_FALLBACK_TXID || "";
    }

    post.versionHistory.push(
      createPostVersionSnapshot({
        post,
        versionNumber: 1,
        action: "CREATE",
        user: req.user,
        algorandTxId: versionTxId,
      }),
    );

    await post.save();

    return res.status(201).json({ message: "Post created", post });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const fetchClassroomPosts = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    if (!isValidObjectId(classroomId)) {
      return res.status(400).json({ error: "Invalid classroomId" });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    if (!canAccessClassroom(classroom, req.user._id)) {
      return res
        .status(403)
        .json({ error: "You are not a member of this classroom" });
    }

    const posts = await ClassPost.find({ classroomId })
      .populate("authorId", "name email role")
      .sort({ createdAt: -1 });

    const sanitizedPosts = posts.map((post) => {
      const plain = post.toObject();
      plain.attachments = (plain.attachments || []).map((attachment, index) => {
        const hasBinaryData = Boolean(attachment?.data);
        if (!hasBinaryData) {
          return {
            title: attachment?.title || "",
            url: attachment?.url || "",
          };
        }

        return {
          title:
            attachment?.title ||
            attachment?.fileName ||
            `Attachment ${index + 1}`,
          url: `${baseUrl}/api/classrooms/${classroomId}/posts/${plain._id}/attachments/${index}`,
        };
      });
      return plain;
    });

    return res.json({ posts: sanitizedPosts });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const fetchPostHistory = async (req, res) => {
  try {
    const { classroomId, postId } = req.params;

    if (!isValidObjectId(classroomId) || !isValidObjectId(postId)) {
      return res.status(400).json({ error: "Invalid classroomId or postId" });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    if (!canAccessClassroom(classroom, req.user._id)) {
      return res
        .status(403)
        .json({ error: "You are not a member of this classroom" });
    }

    const post = await ClassPost.findOne({ _id: postId, classroomId }).select(
      "_id title versionNumber versionHistory",
    );
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const versions = [...(post.versionHistory || [])].sort(
      (a, b) => Number(b.versionNumber || 0) - Number(a.versionNumber || 0),
    );

    return res.json({
      postId: post._id,
      title: post.title,
      currentVersion: post.versionNumber || 1,
      count: versions.length,
      versions,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const downloadPostAttachment = async (req, res) => {
  try {
    const { classroomId, postId, attachmentIndex } = req.params;

    if (!isValidObjectId(classroomId) || !isValidObjectId(postId)) {
      return res.status(400).json({ error: "Invalid classroomId or postId" });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    if (!canAccessClassroom(classroom, req.user._id)) {
      return res
        .status(403)
        .json({ error: "You are not a member of this classroom" });
    }

    const post = await ClassPost.findOne({ _id: postId, classroomId });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const index = Number(attachmentIndex);
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= post.attachments.length
    ) {
      return res.status(400).json({ error: "Invalid attachment index" });
    }

    const attachment = post.attachments[index];

    if (!attachment?.data) {
      return res.status(404).json({ error: "Attachment data not found" });
    }

    const fileName =
      attachment.fileName || attachment.title || `attachment-${index + 1}`;
    const mimeType = attachment.mimeType || "application/octet-stream";

    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(fileName)}"`,
    );
    return res.send(attachment.data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { classroomId, postId } = req.params;
    const uploadedFiles = Array.isArray(req.files) ? req.files : [];
    const {
      title,
      body,
      dueDate,
      points,
      attachments,
      allowStudentSubmissions,
      allowedSubmissionTypes,
    } = req.body;

    if (!isValidObjectId(classroomId) || !isValidObjectId(postId)) {
      return res.status(400).json({ error: "Invalid classroomId or postId" });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    if (!isTeacherInClassroom(classroom, req.user._id)) {
      return res
        .status(403)
        .json({ error: "Only classroom teachers can update posts" });
    }

    if (!ensureTeacherSubscriptionActive(req.user)) {
      return res.status(403).json({
        error:
          "Teacher subscription inactive. Renew your subscription to update posts.",
      });
    }

    const post = await ClassPost.findOne({ _id: postId, classroomId });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const beforeSnapshot = {
      title: post.title,
      body: post.body,
      dueDate: post.dueDate ? new Date(post.dueDate).toISOString() : null,
      points: post.points,
      allowStudentSubmissions: post.allowStudentSubmissions,
      allowedSubmissionTypes: [...post.allowedSubmissionTypes],
      attachments: JSON.stringify(post.attachments || []),
    };

    if (typeof title === "string") post.title = title;
    if (typeof body === "string") post.body = body;
    if (typeof dueDate !== "undefined") post.dueDate = dueDate || null;
    if (typeof points !== "undefined") post.points = points;
    if (typeof allowStudentSubmissions === "boolean") {
      post.allowStudentSubmissions = allowStudentSubmissions;
    }
    if (typeof allowedSubmissionTypes !== "undefined") {
      post.allowedSubmissionTypes = parseAllowedSubmissionTypes(
        typeof allowedSubmissionTypes === "string"
          ? parseAttachmentsInput(allowedSubmissionTypes)
          : allowedSubmissionTypes,
      );
    }

    const parsedAttachments = parseAttachmentsInput(attachments).filter(
      (entry) =>
        entry &&
        typeof entry.title === "string" &&
        typeof entry.url === "string" &&
        entry.url.length > 0,
    );

    const uploadedAttachments = uploadedFiles.map((file) => ({
      title: file.originalname,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      data: file.buffer,
      url: "",
    }));

    // Upload files to Pinata and populate URLs
    for (let i = 0; i < uploadedAttachments.length; i += 1) {
      try {
        const url = await uploadToDuality(
          uploadedAttachments[i].data,
          uploadedAttachments[i].fileName,
        );
        uploadedAttachments[i].url = url;
        // Remove data field after uploading to Pinata (data is now in IPFS)
        delete uploadedAttachments[i].data;
      } catch (error) {
        console.error(
          `Failed to upload ${uploadedAttachments[i].fileName}:`,
          error.message,
        );
        // Keep the data field as fallback if Pinata upload fails
      }
    }

    if (typeof attachments !== "undefined" || uploadedAttachments.length > 0) {
      const baseAttachments =
        parsedAttachments.length > 0
          ? parsedAttachments
          : post.attachments || [];
      post.attachments = [...baseAttachments, ...uploadedAttachments];
    }

    const afterSnapshot = {
      title: post.title,
      body: post.body,
      dueDate: post.dueDate ? new Date(post.dueDate).toISOString() : null,
      points: post.points,
      allowStudentSubmissions: post.allowStudentSubmissions,
      allowedSubmissionTypes: [...post.allowedSubmissionTypes],
      attachments: JSON.stringify(post.attachments || []),
    };

    const hasChanges =
      JSON.stringify(beforeSnapshot) !== JSON.stringify(afterSnapshot);

    if (!hasChanges) {
      return res.json({
        message: "No changes detected",
        post,
      });
    }

    const nextVersion = Number(post.versionNumber || 1) + 1;
    let versionTxId = "";
    try {
      versionTxId = await mintVersionProof({
        entityType: "CLASS_POST",
        entityId: String(post._id),
        versionNumber: nextVersion,
        action: "UPDATE",
        actor: req.user.name,
        payload: {
          title: post.title,
          type: post.type,
          classroomId: String(classroomId),
        },
      });
    } catch (_error) {
      versionTxId = process.env.DEMO_FALLBACK_TXID || "";
    }

    post.versionNumber = nextVersion;
    post.versionHistory = post.versionHistory || [];
    post.versionHistory.push(
      createPostVersionSnapshot({
        post,
        versionNumber: nextVersion,
        action: "UPDATE",
        user: req.user,
        algorandTxId: versionTxId,
      }),
    );

    await post.save();

    return res.json({
      message: "Post updated and version tracked on blockchain",
      post,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const submitLink = async (req, res) => {
  try {
    const { classroomId, postId } = req.params;
    const { link } = req.body;

    if (!isValidObjectId(classroomId) || !isValidObjectId(postId)) {
      return res.status(400).json({ error: "Invalid classroomId or postId" });
    }

    if (!link || typeof link !== "string") {
      return res.status(400).json({ error: "Valid link is required" });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    if (!isStudentInClassroom(classroom, req.user._id)) {
      return res
        .status(403)
        .json({ error: "Only enrolled students can submit" });
    }

    const post = await ClassPost.findOne({ _id: postId, classroomId });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.type === "ANNOUNCEMENT") {
      return res
        .status(400)
        .json({ error: "Submissions are not allowed for announcements" });
    }

    if (!post.allowStudentSubmissions) {
      return res.status(403).json({
        error: "Submissions are disabled by the teacher for this post",
      });
    }

    if (!post.allowedSubmissionTypes.includes("LINK")) {
      return res
        .status(403)
        .json({ error: "Link submissions are disabled for this assignment" });
    }

    let submission = await Submission.findOne({
      classroomId,
      postId,
      studentId: req.user._id,
    });

    const action = submission ? "UPDATE" : "CREATE";
    if (!submission) {
      submission = new Submission({
        classroomId,
        postId,
        studentId: req.user._id,
        contentType: "LINK",
        link: link.trim(),
        text: "",
        files: [],
        status: "TURNED_IN",
        versionNumber: 1,
        versionHistory: [],
      });
    } else {
      submission.contentType = "LINK";
      submission.link = link.trim();
      submission.text = "";
      submission.files = [];
      submission.status = "TURNED_IN";
    }

    const nextVersion = submission.versionHistory?.length
      ? Number(submission.versionNumber || 1) + 1
      : 1;

    let versionTxId = "";
    try {
      versionTxId = await mintVersionProof({
        entityType: "SUBMISSION",
        entityId: String(submission._id),
        versionNumber: nextVersion,
        action,
        actor: req.user.name,
        payload: {
          classroomId: String(classroomId),
          postId: String(postId),
          studentId: String(req.user._id),
          contentType: "LINK",
        },
      });
    } catch (_error) {
      versionTxId = process.env.DEMO_FALLBACK_TXID || "";
    }

    submission.versionNumber = nextVersion;
    submission.versionHistory = submission.versionHistory || [];
    submission.versionHistory.push(
      createSubmissionVersionSnapshot({
        submission,
        versionNumber: nextVersion,
        action,
        user: req.user,
        algorandTxId: versionTxId,
      }),
    );

    await submission.save();

    return res.status(201).json({
      message: "Link submitted successfully",
      submission,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const submitAssignment = async (req, res) => {
  try {
    const { classroomId, postId } = req.params;
    const { link = "", text = "", githubUrl = "" } = req.body;
    const files = Array.isArray(req.files) ? req.files : [];

    if (!isValidObjectId(classroomId) || !isValidObjectId(postId)) {
      return res.status(400).json({ error: "Invalid classroomId or postId" });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    if (!isStudentInClassroom(classroom, req.user._id)) {
      return res
        .status(403)
        .json({ error: "Only enrolled students can submit" });
    }

    const post = await ClassPost.findOne({ _id: postId, classroomId });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.type === "ANNOUNCEMENT") {
      return res
        .status(400)
        .json({ error: "Submissions are not allowed for announcements" });
    }

    if (!post.allowStudentSubmissions) {
      return res.status(403).json({
        error: "Submissions are disabled by the teacher for this post",
      });
    }

    // For PROJECT posts, store githubUrl instead of link
    const effectiveLink = post.type === "PROJECT" ? githubUrl : link;
    const hasLink =
      typeof effectiveLink === "string" && effectiveLink.trim().length > 0;
    const hasText = typeof text === "string" && text.trim().length > 0;
    const hasFiles = files.length > 0;

    if (!hasLink && !hasText && !hasFiles) {
      return res.status(400).json({
        error: "Provide at least one submission input: link, text, or file",
      });
    }

    if (hasLink && !post.allowedSubmissionTypes.includes("LINK")) {
      return res
        .status(403)
        .json({ error: "Link submissions are disabled for this assignment" });
    }

    if (hasFiles && !post.allowedSubmissionTypes.includes("FILE")) {
      return res
        .status(403)
        .json({ error: "File submissions are disabled for this assignment" });
    }

    const storedFiles = files.map((file) => ({
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      data: file.buffer,
    }));

    let contentType = "TEXT";
    if (hasLink && hasFiles) {
      contentType = "BOTH";
    } else if (hasFiles) {
      contentType = "FILE";
    } else if (hasLink) {
      contentType = "LINK";
    }

    let submission = await Submission.findOne({
      classroomId,
      postId,
      studentId: req.user._id,
    });

    const action = submission ? "UPDATE" : "CREATE";
    if (!submission) {
      submission = new Submission({
        classroomId,
        postId,
        studentId: req.user._id,
        contentType,
        link:
          post.type === "PROJECT" ? "" : hasLink ? effectiveLink.trim() : "",
        githubUrl:
          post.type === "PROJECT" ? (hasLink ? effectiveLink.trim() : "") : "",
        text: hasText ? text.trim() : "",
        files: storedFiles,
        status: "TURNED_IN",
        submissionStatus: "UNDER_REVIEW",
        versionNumber: 1,
        versionHistory: [],
      });
    } else {
      submission.contentType = contentType;
      if (post.type === "PROJECT") {
        submission.githubUrl = hasLink ? effectiveLink.trim() : "";
        submission.link = "";
      } else {
        submission.link = hasLink ? effectiveLink.trim() : "";
        submission.githubUrl = "";
      }
      submission.text = hasText ? text.trim() : "";
      submission.files = storedFiles;
      submission.status = "TURNED_IN";
      submission.submissionStatus = "UNDER_REVIEW";
    }

    const nextVersion = submission.versionHistory?.length
      ? Number(submission.versionNumber || 1) + 1
      : 1;

    let versionTxId = "";
    try {
      versionTxId = await mintVersionProof({
        entityType: "SUBMISSION",
        entityId: String(submission._id),
        versionNumber: nextVersion,
        action,
        actor: req.user.name,
        payload: {
          classroomId: String(classroomId),
          postId: String(postId),
          studentId: String(req.user._id),
          contentType,
          fileCount: storedFiles.length,
        },
      });
    } catch (_error) {
      versionTxId = process.env.DEMO_FALLBACK_TXID || "";
    }

    submission.versionNumber = nextVersion;
    submission.versionHistory = submission.versionHistory || [];
    submission.versionHistory.push(
      createSubmissionVersionSnapshot({
        submission,
        versionNumber: nextVersion,
        action,
        user: req.user,
        algorandTxId: versionTxId,
      }),
    );

    await submission.save();

    return res.status(201).json({
      message: "Submission uploaded successfully",
      submission,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const fetchMySubmission = async (req, res) => {
  try {
    const { classroomId, postId } = req.params;

    if (!isValidObjectId(classroomId) || !isValidObjectId(postId)) {
      return res.status(400).json({ error: "Invalid classroomId or postId" });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    if (!isStudentInClassroom(classroom, req.user._id)) {
      return res
        .status(403)
        .json({ error: "Only enrolled students can access this submission" });
    }

    const submission = await Submission.findOne({
      classroomId,
      postId,
      studentId: req.user._id,
    }).select("_id contentType link text status marks feedback updatedAt");

    if (!submission) {
      return res.json({ submission: null });
    }

    return res.json({ submission });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const fetchPostSubmissions = async (req, res) => {
  try {
    const { classroomId, postId } = req.params;

    if (!isValidObjectId(classroomId) || !isValidObjectId(postId)) {
      return res.status(400).json({ error: "Invalid classroomId or postId" });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    if (!isTeacherInClassroom(classroom, req.user._id)) {
      return res
        .status(403)
        .json({ error: "Only classroom teachers can view submissions" });
    }

    const submissions = await Submission.find({ classroomId, postId })
      .populate("studentId", "name email")
      .sort({ updatedAt: -1 });

    const sanitized = submissions.map((submission) => {
      const plain = submission.toObject();
      plain.files = (plain.files || []).map((file) => ({
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.size,
      }));
      return plain;
    });

    return res.json({ count: sanitized.length, submissions: sanitized });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const fetchSubmissionHistory = async (req, res) => {
  try {
    const { classroomId, postId, submissionId } = req.params;

    if (
      !isValidObjectId(classroomId) ||
      !isValidObjectId(postId) ||
      !isValidObjectId(submissionId)
    ) {
      return res
        .status(400)
        .json({ error: "Invalid classroomId, postId, or submissionId" });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    const submission = await Submission.findOne({
      _id: submissionId,
      classroomId,
      postId,
    }).select("_id studentId versionNumber versionHistory updatedAt");

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const userId = String(req.user._id);
    const canAccess =
      isTeacherInClassroom(classroom, req.user._id) ||
      String(submission.studentId) === userId;

    if (!canAccess) {
      return res.status(403).json({
        error:
          "Only classroom teachers or the owning student can view this timeline",
      });
    }

    const versions = [...(submission.versionHistory || [])].sort(
      (a, b) => Number(b.versionNumber || 0) - Number(a.versionNumber || 0),
    );

    return res.json({
      submissionId: submission._id,
      currentVersion: submission.versionNumber || 1,
      count: versions.length,
      updatedAt: submission.updatedAt,
      versions,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const downloadSubmissionFile = async (req, res) => {
  try {
    const { classroomId, postId, submissionId, fileIndex } = req.params;

    if (
      !isValidObjectId(classroomId) ||
      !isValidObjectId(postId) ||
      !isValidObjectId(submissionId)
    ) {
      return res
        .status(400)
        .json({ error: "Invalid classroomId, postId, or submissionId" });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    if (!isTeacherInClassroom(classroom, req.user._id)) {
      return res
        .status(403)
        .json({ error: "Only teachers can download files" });
    }

    const submission = await Submission.findOne({
      _id: submissionId,
      classroomId,
      postId,
    });

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const index = Number(fileIndex);
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= submission.files.length
    ) {
      return res.status(400).json({ error: "Invalid file index" });
    }

    const file = submission.files[index];
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(file.fileName)}"`,
    );
    return res.send(file.data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateSubmission = async (req, res) => {
  try {
    const { classroomId, postId, submissionId } = req.params;
    const { marks, feedback, status } = req.body;

    if (
      !isValidObjectId(classroomId) ||
      !isValidObjectId(postId) ||
      !isValidObjectId(submissionId)
    ) {
      return res
        .status(400)
        .json({ error: "Invalid classroomId, postId, or submissionId" });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    if (!isTeacherInClassroom(classroom, req.user._id)) {
      return res
        .status(403)
        .json({ error: "Only classroom teachers can update submissions" });
    }

    if (!ensureTeacherSubscriptionActive(req.user)) {
      return res.status(403).json({
        error:
          "Teacher subscription inactive. Renew your subscription to grade submissions.",
      });
    }

    const submission = await Submission.findOne({
      _id: submissionId,
      classroomId,
      postId,
    });

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    // Get the post to validate marks against assigned points
    const post = await ClassPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Validate marks don't exceed post's total points
    if (typeof marks !== "undefined" && marks !== null) {
      const maxMarks = post.points || 100;
      if (Number(marks) > maxMarks) {
        return res.status(400).json({
          error: `Marks cannot exceed ${maxMarks} (the assignment's total points)`,
        });
      }
    }

    const beforeSnapshot = {
      marks: submission.marks,
      feedback: submission.feedback,
      status: submission.status,
    };

    if (typeof marks !== "undefined") submission.marks = marks;
    if (typeof feedback === "string") submission.feedback = feedback;
    if (typeof status === "string") submission.status = status;

    const afterSnapshot = {
      marks: submission.marks,
      feedback: submission.feedback,
      status: submission.status,
    };

    const hasChanges =
      JSON.stringify(beforeSnapshot) !== JSON.stringify(afterSnapshot);
    if (!hasChanges) {
      return res.json({ message: "No changes detected", submission });
    }

    const nextVersion = submission.versionHistory?.length
      ? Number(submission.versionNumber || 1) + 1
      : 1;

    let versionTxId = "";
    try {
      versionTxId = await mintVersionProof({
        entityType: "SUBMISSION",
        entityId: String(submission._id),
        versionNumber: nextVersion,
        action: "GRADE",
        actor: req.user.name,
        payload: {
          classroomId: String(classroomId),
          postId: String(postId),
          marks: submission.marks,
          status: submission.status,
        },
      });
    } catch (_error) {
      versionTxId = process.env.DEMO_FALLBACK_TXID || "";
    }

    submission.versionNumber = nextVersion;
    submission.versionHistory = submission.versionHistory || [];
    submission.versionHistory.push(
      createSubmissionVersionSnapshot({
        submission,
        versionNumber: nextVersion,
        action: "GRADE",
        user: req.user,
        algorandTxId: versionTxId,
      }),
    );

    await submission.save();

    return res.json({
      message: "Submission updated and version tracked on blockchain",
      submission,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET VERIFIED PROJECTS FOR CLASSROOM
// Any classroom member can view verified/public projects
// ─────────────────────────────────────────────────────────────────────────────
export const getVerifiedProjects = async (req, res) => {
  try {
    const { classroomId } = req.params;

    if (!isValidObjectId(classroomId)) {
      return res.status(400).json({ error: "Invalid classroomId" });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    // Check if user is a member of the classroom
    if (!canAccessClassroom(classroom, req.user._id)) {
      return res.status(403).json({
        error: "You are not a member of this classroom",
      });
    }

    // Get all verified submissions with PROJECT posts
    const verifiedSubmissions = await Submission.find({
      classroomId,
      submissionStatus: "VERIFIED",
      isPublic: true,
    })
      .select("-files.data")
      .populate("studentId", "name email")
      .populate("postId", "title type points dueDate")
      .sort({ publicApprovedAt: -1 });

    const projects = verifiedSubmissions.map((sub) => ({
      _id: sub._id,
      studentName: sub.studentId?.name || "Unknown",
      studentEmail: sub.studentId?.email || "",
      studentId: sub.studentId?._id,
      postTitle: sub.postId?.title || "Untitled",
      postId: sub.postId?._id,
      submissionStatus: sub.submissionStatus,
      versionNumber: sub.versionNumber,
      revisionCycle: sub.revisionCycle,
      githubUrl: sub.githubUrl,
      files:
        sub.files?.map((f) => ({
          fileName: f.fileName,
          mimeType: f.mimeType,
          size: f.size,
        })) || [],
      publishedAt: sub.publicApprovedAt,
      projectVerification: sub.projectVerification,
    }));

    return res.json({
      classroomId,
      classroomName: classroom.name,
      verifiedProjects: projects,
      count: projects.length,
    });
  } catch (error) {
    console.error("getVerifiedProjects error:", error);
    return res.status(500).json({ error: error.message });
  }
};
