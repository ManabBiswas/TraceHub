import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Users, BookOpen, CheckCircle, Clock, AlertCircle } from "lucide-react";
import api from "../config/Api";

const ProfessorDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    classStats: [],
    submissionStatus: [],
    studentPerformance: [],
    classBreakdown: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch classrooms
        const classroomsRes = await api.classrooms.getAll();
        const classrooms = classroomsRes?.classrooms || [];

        // Fetch all submissions from all classrooms
        let submissions = [];
        for (const classroom of classrooms) {
          const postsRes = await api.classrooms.getPosts(classroom._id);
          const posts = postsRes?.posts || [];
          
          for (const post of posts) {
            const submissionsRes = await api.classrooms.getSubmissions(
              classroom._id,
              post._id
            );
            const postSubmissions = submissionsRes?.submissions || [];
            submissions = [...submissions, ...postSubmissions];
          }
        }

        // Process classroom data
        const classStats = classrooms.map((classroom) => ({
          name: classroom.subject?.slice(0, 15) || "Class",
          students: classroom.enrolledStudents?.length || 0,
          posts: classroom.posts?.length || 0,
          code: classroom.classCode,
        }));

        // Process submission status
        const statusCounts = {
          verified: submissions.filter((s) => s.isVerified).length,
          pending: submissions.filter((s) => !s.isVerified && !s.isRejected)
            .length,
          rejected: submissions.filter((s) => s.isRejected).length,
          revision: submissions.filter((s) => s.revisionRequested).length,
        };

        const submissionStatus = [
          { name: "Verified", value: statusCounts.verified, color: "#10b981" },
          { name: "Pending", value: statusCounts.pending, color: "#f59e0b" },
          { name: "Rejected", value: statusCounts.rejected, color: "#ef4444" },
          {
            name: "For Revision",
            value: statusCounts.revision,
            color: "#8b5cf6",
          },
        ];

        // Process student performance (grades distribution if available)
        const studentPerformance = submissions.reduce((acc, submission) => {
          const gradeRange =
            submission.marks >= 80
              ? "80-100"
              : submission.marks >= 60
                ? "60-80"
                : submission.marks >= 40
                  ? "40-60"
                  : "Below 40";

          const existing = acc.find((item) => item.range === gradeRange);
          if (existing) {
            existing.count += 1;
          } else {
            acc.push({ range: gradeRange, count: 1 });
          }
          return acc;
        }, []);

        // Class breakdown
        const classBreakdown = classrooms.slice(0, 5).map((classroom) => {
          const classSubmissions = submissions.filter((s) =>
            s.classroomId?.includes(classroom._id)
          );
          return {
            subject: classroom.subject?.slice(0, 12) || "Class",
            submissions: classSubmissions.length,
            approved: classSubmissions.filter((s) => s.isVerified).length,
            pending: classSubmissions.filter((s) => !s.isVerified).length,
          };
        });

        setDashboardData({
          classStats,
          submissionStatus,
          studentPerformance,
          classBreakdown,
          recentActivity: submissions.slice(0, 5),
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#2ff5a8] border-t-transparent"></div>
          <p className="text-[#bcd2c9]">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      icon: Users,
      label: "Total Classes",
      value: dashboardData.classStats.length,
      color: "#2ff5a8",
    },
    {
      icon: BookOpen,
      label: "Total Students",
      value: dashboardData.classStats.reduce((sum, c) => sum + c.students, 0),
      color: "#8b5cf6",
    },
    {
      icon: CheckCircle,
      label: "Verified Submissions",
      value: dashboardData.submissionStatus.find((s) => s.name === "Verified")
        ?.value || 0,
      color: "#10b981",
    },
    {
      icon: Clock,
      label: "Pending Review",
      value: dashboardData.submissionStatus.find((s) => s.name === "Pending")
        ?.value || 0,
      color: "#f59e0b",
    },
  ];

  const COLORS = {
    "80-100": "#10b981",
    "60-80": "#3b82f6",
    "40-60": "#f59e0b",
    "Below 40": "#ef4444",
  };

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
        {/* Classroom Overview Chart */}
        <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-6 backdrop-blur">
          <h3 className="mb-4 text-xl font-semibold text-[#e8f2ed]">
            Classes Overview
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.classStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2ff5a833" />
              <XAxis dataKey="name" stroke="#bcd2c9" />
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
              <Bar dataKey="students" fill="#2ff5a8" radius={[8, 8, 0, 0]} />
              <Bar dataKey="posts" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Submission Status Pie Chart */}
        <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-6 backdrop-blur">
          <h3 className="mb-4 text-xl font-semibold text-[#e8f2ed]">
            Submission Status
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dashboardData.submissionStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {dashboardData.submissionStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
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

      {/* Performance and Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Grade Distribution */}
        <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-6 backdrop-blur">
          <h3 className="mb-4 text-xl font-semibold text-[#e8f2ed]">
            Grade Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.studentPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2ff5a833" />
              <XAxis dataKey="range" stroke="#bcd2c9" />
              <YAxis stroke="#bcd2c9" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#142019",
                  border: "1px solid #2ff5a8",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#2ff5a8" }}
              />
              <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Class Breakdown */}
        <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-6 backdrop-blur">
          <h3 className="mb-4 text-xl font-semibold text-[#e8f2ed]">
            Class Submissions
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardData.classBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2ff5a833" />
              <XAxis dataKey="subject" stroke="#bcd2c9" />
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
              <Line
                type="monotone"
                dataKey="submissions"
                stroke="#2ff5a8"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="approved"
                stroke="#10b981"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="rounded-2xl border border-[#2ff5a838] bg-white/10 p-6 backdrop-blur">
        <h3 className="mb-4 text-xl font-semibold text-[#e8f2ed]">
          Recent Activity
        </h3>
        <div className="space-y-4">
          {dashboardData.recentActivity.length > 0 ? (
            dashboardData.recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between border-b border-[#2ff5a833] pb-3"
              >
                <div>
                  <p className="font-medium text-[#e8f2ed]">
                    {activity.studentName || "Student"}
                  </p>
                  <p className="text-sm text-[#bcd2c9]">
                    {activity.isVerified
                      ? "Verified submission"
                      : activity.isRejected
                        ? "Rejected submission"
                        : "New submission"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#8cf0c8]">
                    {activity.updatedAt
                      ? new Date(activity.updatedAt).toLocaleDateString()
                      : "Recently"}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${
                      activity.isVerified
                        ? "bg-[#10b98133] text-[#10b981]"
                        : activity.isRejected
                          ? "bg-[#ef444433] text-[#ef4444]"
                          : "bg-[#f59e0b33] text-[#f59e0b]"
                    }`}
                  >
                    {activity.isVerified
                      ? "Verified"
                      : activity.isRejected
                        ? "Rejected"
                        : "Pending"}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-[#bcd2c9]">No activity yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessorDashboard;
