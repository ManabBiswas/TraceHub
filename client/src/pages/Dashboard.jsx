import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  BookOpen,
  Upload,
  Clock,
  School,
  Bookmark,
  ChevronRight,
  LayoutGrid,
  Menu,
  X,
} from "lucide-react";
import ProfessorDashboard from "../components/ProfessorDashboard";
import StudentDashboard from "../components/StudentDashboard";
import BackToTop from "../components/BackToTop";

const Dashboard = () => {
  const { user, isProfessor, isAdmin, renewSubscription } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setCollapsed(false);
      else setMobileOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close mobile menu when navigating
  const handleNavClick = () => {
    if (isMobile) setMobileOpen(false);
  };

  const handleRenew = async () => {
    await renewSubscription();
    window.location.reload();
  };

  const navigationItems = [
    { label: "Resources", icon: BookOpen, path: "/resources", show: true },
    {
      label: "Classrooms",
      icon: School,
      path: "/classrooms",
      show: true,
    },
    {
      label: "Projects",
      icon: Bookmark,
      path: "/projects",
      show: true,
    },
    {
      label: "Upload",
      icon: Upload,
      path: "/upload",
      show: isProfessor || isAdmin,
    },
    {
      label: "Pending Reviews",
      icon: Clock,
      path: "/resources?filter=pending",
      show: isProfessor || isAdmin,
    },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar Navigation */}
      <aside
        className={`border-r border-[#2ff5a833] bg-gradient-to-b from-[#142019] to-[#0f1812] transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-[#2ff5a833] p-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-[#2ff5a8] p-2">
                <LayoutGrid size={20} className="text-[#142019]" />
              </div>
              <span className="font-semibold text-[#2ff5a8]">TraceHub</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg p-1 hover:bg-[#2ff5a833]"
          >
            <ChevronRight
              size={18}
              className={`text-[#2ff5a8] transition-transform ${
                collapsed ? "" : "rotate-180"
              }`}
            />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-2 p-4">
          {navigationItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#bcd2c9] transition hover:bg-[#2ff5a833] hover:text-[#2ff5a8]"
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
            {/* Sidebar Footer - Subscription */}
            {user?.role === "PROFESSOR" && !collapsed && (
              <div className="relative bottom-0 left-0 right-0 border-t border-[#2ff5a833] bg-[#0f1812] p-4">
                <div className="mb-3 rounded-lg bg-[#2ff5a833] p-3">
                  <p className="text-xs text-[#bcd2c9]">Subscription Status</p>
                  <p className="mt-1 font-semibold text-[#2ff5a8]">
                    {user?.teacherSubscription?.status || "NONE"}
                  </p>
                </div>
                {user?.teacherSubscription?.status !== "ACTIVE" && (
                  <button
                    onClick={handleRenew}
                    className="w-full rounded-lg border border-[#2ff5a8] bg-[#2ff5a8] px-3 py-2 text-xs font-semibold text-[#142019] transition hover:bg-[#2dd99e]"
                  >
                    Renew Now
                  </button>
                )}
              </div>
            )}
        </nav>

      </aside>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 overflow-auto bg-[radial-gradient(640px_360px_at_22%_6%,rgba(47,245,168,0.23),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)]">
        {/* Top Bar */}
        <header className="sticky top-0 z-10 border-b border-[#2ff5a833] bg-[#142019]/80 backdrop-blur-xl">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-100">
                  Welcome, {user?.name}!
                </h1>
                <p className="mt-1 text-sm text-[#bcd2c9]">
                  {user?.role === "PROFESSOR"
                    ? "Manage your classes and monitor student progress"
                    : user?.role === "HOD"
                      ? "Department head dashboard"
                      : "Track your assignments and progress"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#2ff5a8] px-6 py-2 text-xs font-semibold uppercase tracking-wider text-[#142019]">
                {user?.role}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="px-6 py-8">
          {isProfessor || user?.role === "HOD" ? (
            <ProfessorDashboard />
          ) : (
            <StudentDashboard />
          )}
        </div>
      </main>

      {/* Back to Top Button */}
      <BackToTop targetId="main-content" />
    </div>
  );
};

export default Dashboard;
