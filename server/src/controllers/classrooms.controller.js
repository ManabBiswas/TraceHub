import mongoose from "mongoose";
import Classroom from "../models/Classroom.js";
import ClassPost from "../models/ClassPost.js";
import Submission from "../models/Submission.js";

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

export const createClassroom = async (req, res) => {
  try {
    const { name, section, subject, room, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Classroom name is required" });
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
    const { title, body, type, dueDate, points, attachments } = req.body;

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

    const post = await ClassPost.create({
      classroomId,
      authorId: req.user._id,
      title,
      body: body || "",
      type: type || "ANNOUNCEMENT",
      dueDate: dueDate || null,
      points: typeof points === "number" ? points : null,
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    return res.status(201).json({ message: "Post created", post });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const fetchClassroomPosts = async (req, res) => {
  try {
    const { classroomId } = req.params;

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

    return res.json({ posts });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { classroomId, postId } = req.params;
    const { title, body, dueDate, points, attachments } = req.body;

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

    const post = await ClassPost.findOne({ _id: postId, classroomId });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (typeof title === "string") post.title = title;
    if (typeof body === "string") post.body = body;
    if (typeof dueDate !== "undefined") post.dueDate = dueDate || null;
    if (typeof points !== "undefined") post.points = points;
    if (Array.isArray(attachments)) post.attachments = attachments;

    await post.save();

    return res.json({ message: "Post updated", post });
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

    if (post.type !== "ASSIGNMENT") {
      return res
        .status(400)
        .json({ error: "Submissions are allowed only for assignment posts" });
    }

    const submission = await Submission.findOneAndUpdate(
      { classroomId, postId, studentId: req.user._id },
      {
        classroomId,
        postId,
        studentId: req.user._id,
        contentType: "LINK",
        link,
        status: "TURNED_IN",
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.status(201).json({
      message: "Link submitted successfully",
      submission,
    });
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

    const submission = await Submission.findOne({
      _id: submissionId,
      classroomId,
      postId,
    });

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    if (typeof marks !== "undefined") submission.marks = marks;
    if (typeof feedback === "string") submission.feedback = feedback;
    if (typeof status === "string") submission.status = status;

    await submission.save();

    return res.json({ message: "Submission updated", submission });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
