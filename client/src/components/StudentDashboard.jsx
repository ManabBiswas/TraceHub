import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import {
  FileCheck,
  Clock,
  AlertCircle,
  TrendingUp,
  BookMarked,
} from "lucide-react";
import api from "../config/Api";

const StudentDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    assignments: [],
    submissionTimeline: [],
    gradeBreakdown: [],
    classroomStats: [],
    upcomingDeadlines: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentDashboard = async () => {
      try {
        setLoading(true);

        // Fetch classrooms student is enrolled in
        const classroomsRes = await api.classrooms.getAll();
        const myClassrooms = classroomsRes?.classrooms || [];

        // Fetch my submissions
        const submissions = [];
        const submissionTimeline = [];
        const classroomStats = [];

        // Process each classroom for posts and submissions
        for (const classroom of myClassrooms.slice(0, 5)) {
          const postsRes = await api.classrooms.getPosts(classroom._id);
          const posts = postsRes?.posts || [];

          classroomStats.push({
            classroom: classroom.subject?.slice(0, 12) || "Class",
            assignments: posts.length,
            submitted: 0,
            pending: posts.length,
          });

          for (const post of posts) {
            const mySubmissionRes = await api.classrooms.getMySubmission(
              classroom._id,
              post._id
            );
            const mySubmission = mySubmissionRes?.submission;

            if (mySubmission) {
              submissions.push({
                title: post.title,
                classroom: classroom.subject,
                status: mySubmission.status || "submitted",
                marks: mySubmission.marks || null,
                dueDate: post.dueDate,
                submittedAt: mySubmission.submittedAt,
              });

              submissionTimeline.push({
                date: new Date(mySubmission.submittedAt || Date.now())
                  .toLocaleDateString()
                  .slice(0, 10),
                completed: mySubmission.status === "verified" ? 1 : 0,
                pending: mySubmission.status === "submitted" ? 1 : 0,
              });
            }
          }
        }

        // Grade breakdown from submissions
        const gradeBreakdown = submissions
          .filter((s) => s.marks !== null && s.marks !== undefined)
          .reduce((acc, submission) => {
            const gradeLabel =
              submission.marks >= 80
                ? "A (80-100)"
                : submission.marks >= 60
                  ? "B (60-80)"
                  : submission.marks >= 40
                    ? "C (40-60)"
                    : "D (Below 40)";

            const existing = acc.find((item) => item.grade === gradeLabel);
            if (existing) {
              existing.count += 1;
            } else {
              acc.push({ grade: gradeLabel, count: 1 });
            }
            return acc;
          }, []);

        // Upcoming deadlines
        const upcomingDeadlines = submissions
          .filter((s) => s.dueDate && new Date(s.dueDate) > new Date())
          .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
          .slice(0, 5);

        // Update classroom stats with actual submission counts
        const updatedClassroomStats = classroomStats.map((stat) => ({
          ...stat,
          submitted: submissions.filter(
            (s) =>
              s.classroom?.includes(stat.classroom.split(" ")[0]) &&
              s.status === "verified"
          ).length,
          pending: submissions.filter(
            (s) =>
              s.classroom?.includes(stat.classroom.split(" ")[0]) &&
              s.status !== "verified"
          ).length,
        }));

        setDashboardData({
          assignments: submissions,
          submissionTimeline: submissionTimeline.slice(0, 7),
          gradeBreakdown:
            gradeBreakdown.length > 0
              ? gradeBreakdown
              : [
                  { grade: "No Grades Yet", count: 0 },
                ],
          classroomStats: updatedClassroomStats,
          upcomingDeadlines,
        });
      } catch (error) {
        console.error("Error fetching student dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#2ff5a8] border-t-transparent"></div>
          <p className="text-[#bcd2c9]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const submittedCount = dashboardData.assignments.filter(
    (a) => a.status === "verified"
  ).length;
  const pendingCount = dashboardData.assignments.filter(
    (a) => a.status !== "verified"
  ).length;
  const avgGrade =
    dashboardData.assignments
      .filter((a) => a.marks !== null)
      .reduce((sum, a) => sum + (a.marks || 0), 0) /
      (dashboardData.assignments.filter((a) => a.marks !== null).length || 1) ||
    0;

  const statCards = [
    {
      icon: FileCheck,
      label: "Submissions Verified",
      value: submittedCount,
      color: "#10b981",
    },
    {
      icon: Clock,
      label: "Pending Review",
      value: pendingCount,
      color: "#f59e0b",
    },
    {
      icon: TrendingUp,
      label: "Average Grade",
      value: `${avgGrade.toFixed(1)}%`,
      color: "#3b82f6",
    },
    {
      icon: BookMarked,
      label: "Total Assignments",
      value: dashboardData.assignments.length,
      color: "#8b5cf6",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-6 backdrop-blur"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#bcd2c9]">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-[#2ff5a8]">
                    {card.value}
                  </p>
                </div>
                <Icon size={40} style={{ color: card.color, opacity: 0.6 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Submission Progress */}
        <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-6 backdrop-blur">
          <h3 className="mb-4 text-xl font-semibold text-[#e8f2ed]">
            Submission Progress
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dashboardData.submissionTimeline}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2ff5a833" />
              <XAxis dataKey="date" stroke="#bcd2c9" />
              <YAxis stroke="#bcd2c9" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#142019",
                  border: "1px solid #2ff5a8",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#2ff5a8" }}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stackId="1"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorCompleted)"
                name="Verified"
              />
              <Area
                type="monotone"
                dataKey="pending"
                stackId="1"
                stroke="#f59e0b"
                fillOpacity={1}
                fill="url(#colorPending)"
                name="Pending"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Grade Distribution */}
        <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-6 backdrop-blur">
          <h3 className="mb-4 text-xl font-semibold text-[#e8f2ed]">
            Grade Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dashboardData.gradeBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ grade, count }) => `${grade}: ${count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                <Cell fill="#10b981" />
                <Cell fill="#3b82f6" />
                <Cell fill="#f59e0b" />
                <Cell fill="#ef4444" />
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#142019",
                  border: "1px solid #2ff5a8",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#2ff5a8" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Classroom Performance */}
      <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-6 backdrop-blur">
        <h3 className="mb-4 text-xl font-semibold text-[#e8f2ed]">
          Classroom Performance
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dashboardData.classroomStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2ff5a833" />
            <XAxis dataKey="classroom" stroke="#bcd2c9" />
            <YAxis stroke="#bcd2c9" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#142019",
                border: "1px solid #2ff5a8",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#2ff5a8" }}
            />
            <Legend />
            <Bar dataKey="assignments" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            <Bar dataKey="submitted" fill="#10b981" radius={[8, 8, 0, 0]} />
            <Bar dataKey="pending" fill="#f59e0b" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Upcoming Deadlines */}
      <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-6 backdrop-blur">
        <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-[#e8f2ed]">
          <AlertCircle size={20} className="text-[#f59e0b]" />
          Upcoming Deadlines
        </h3>
        <div className="space-y-3">
          {dashboardData.upcomingDeadlines.length > 0 ? (
            dashboardData.upcomingDeadlines.map((deadline, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-[#2ff5a833] bg-white/5 p-4"
              >
                <div>
                  <p className="font-medium text-[#e8f2ed]">
                    {deadline.title}
                  </p>
                  <p className="text-sm text-[#bcd2c9]">
                    {deadline.classroom}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#f59e0b]">
                    {new Date(deadline.dueDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-[#8cf0c8]">
                    {Math.ceil(
                      (new Date(deadline.dueDate) - new Date()) /
                        (1000 * 60 * 60 * 24)
                    )}{" "}
                    days left
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-[#bcd2c9]">
              No upcoming deadlines!
            </p>
          )}
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-6 backdrop-blur">
        <h3 className="mb-4 text-xl font-semibold text-[#e8f2ed]">
          Recent Submissions
        </h3>
        <div className="space-y-3">
          {dashboardData.assignments.length > 0 ? (
            dashboardData.assignments.slice(0, 5).map((assignment, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-[#2ff5a833] bg-white/5 p-4"
              >
                <div>
                  <p className="font-medium text-[#e8f2ed]">
                    {assignment.title}
                  </p>
                  <p className="text-sm text-[#bcd2c9]">
                    {assignment.classroom}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        assignment.status === "verified"
                          ? "bg-[#10b98133] text-[#10b981]"
                          : assignment.status === "rejected"
                            ? "bg-[#ef444433] text-[#ef4444]"
                            : "bg-[#f59e0b33] text-[#f59e0b]"
                      }`}
                    >
                      {assignment.status === "verified"
                        ? "Verified"
                        : assignment.status === "rejected"
                          ? "Rejected"
                          : "Pending"}
                    </span>
                    {assignment.marks !== null && (
                      <span className="text-sm font-semibold text-[#2ff5a8]">
                        {assignment.marks}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))

          ) : (
            <p className="text-center text-[#bcd2c9]">No submissions yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
