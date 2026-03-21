import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Menu, X, LogOut, Link as LinkIcon } from "lucide-react";

const Navigation = () => {
  const { isAuthenticated, logout, user, isProfessor, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileActive, setProfileActive] = useState(false);
  const [profileHovered, setProfileHovered] = useState(false);
  const [logoutHovered, setLogoutHovered] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login/student");
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;
  const navLinkClass = (active) =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      active
        ? "bg-[#2ff5a8] text-[#142019]"
        : "text-emerald-50 hover:bg-white/15 hover:text-white"
    }`;

  if (!isAuthenticated) {
    return (
      <nav className="sticky top-0 z-50 border-b border-[#2ff5a833] bg-[#1f2925]/95 px-4 py-4 shadow-sm backdrop-blur md:px-8">
        <div className="mx-auto flex w-full max-w-360 flex-wrap items-center gap-3">
          <div className="text-2xl font-bold tracking-tight text-slate-100">
            <Link to="/">TraceHub</Link>
          </div>
          <div className="ml-auto flex w-full flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-[#0f1613d9] p-1 md:w-auto md:rounded-full">
            <Link to="/" className={navLinkClass(isActive("/"))}>
              Home
            </Link>
            <Link
              to="/dashboard"
              className={navLinkClass(isActive("/dashboard"))}
            >
              Dashboard
            </Link>
            <Link
              to="/resources"
              className={navLinkClass(isActive("/resources"))}
            >
              Resources
            </Link>
            <Link to="/profile" className={navLinkClass(isActive("/profile"))}>
              Profile
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/login/student"
              className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/20"
            >
              Student Login
            </Link>
            <Link
              to="/login/teacher"
              className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/20"
            >
              Teacher Login
            </Link>
            <Link
              to="/register/student"
              className="inline-flex items-center justify-center rounded-lg border border-[#2ff5a8] bg-[#2ff5a8] px-4 py-2 text-sm font-semibold text-[#142019] transition hover:bg-[#24d993]"
            >
              Student Register
            </Link>
            <Link
              to="/register/teacher"
              className="inline-flex items-center justify-center rounded-lg border border-[#2ff5a8] bg-[#2ff5a8] px-4 py-2 text-sm font-semibold text-[#142019] transition hover:bg-[#24d993]"
            >
              Teacher Register
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-[#2ff5a833] bg-[#1f2925]/95 px-4 py-4 shadow-sm backdrop-blur md:px-8">
      <div className="mx-auto flex w-full max-w-360 flex-wrap items-center justify-between gap-3">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-100"
        >
          <LinkIcon size={24} />
          TraceHub
        </Link>

        <button
          className="inline-flex items-center justify-center rounded-md p-2 text-emerald-50 transition hover:bg-white/10 md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div
          className={`${menuOpen ? "flex" : "hidden"} w-full flex-col gap-4 rounded-2xl border border-white/10 bg-[#1f2925] p-4 md:flex md:w-auto md:flex-row md:items-center md:gap-6 md:border-none md:bg-transparent md:p-0`}
        >
          <div className="flex w-full flex-col gap-2 rounded-2xl border border-white/10 bg-[#0f1613d9] p-1 md:w-auto md:flex-row md:items-center md:rounded-full">
            <Link
              to="/"
              className={navLinkClass(isActive("/"))}
              onClick={() => setMenuOpen(false)}
            >
              Home
            </Link>

            <Link
              to="/dashboard"
              className={navLinkClass(isActive("/dashboard"))}
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </Link>

            <Link
              to="/resources"
              className={navLinkClass(isActive("/resources"))}
              onClick={() => setMenuOpen(false)}
            >
              Resources
            </Link>

            <Link
              to="/classrooms"
              className={navLinkClass(isActive("/classrooms"))}
              onClick={() => setMenuOpen(false)}
            >
              Classrooms
            </Link>

            {(isProfessor || isAdmin) && (
              <>
                <Link
                  to="/upload"
                  className={navLinkClass(isActive("/upload"))}
                  onClick={() => setMenuOpen(false)}
                >
                  Upload
                </Link>

                <Link
                  to="/pending"
                  className={navLinkClass(isActive("/pending"))}
                  onClick={() => setMenuOpen(false)}
                >
                  Pending
                </Link>
              </>
            )}
          </div>

          <div className="ml-auto flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center md:gap-4">
            <button
              onClick={() => {
                setProfileActive(true);
                navigate("/profile");
                setMenuOpen(false);
              }}
              onMouseEnter={() => setProfileHovered(true)}
              onMouseLeave={() => setProfileHovered(false)}
              className={`flex flex-col gap-1 rounded-lg px-3 py-2 transition cursor-pointer md:items-end ${
                profileHovered
                  ? "text-blue-400 underline"
                  : profileActive
                  ? "text-[#2ff5a8] font-semibold"
                  : "text-slate-100 hover:bg-white/10"
              }`}
            >
              <span className="text-sm font-semibold">
                {user?.name}
              </span>
              <span className="text-xs capitalize">
                {user?.role}
              </span>
            </button>
            <button
              onClick={handleLogout}
              onMouseEnter={() => setLogoutHovered(true)}
              onMouseLeave={() => setLogoutHovered(false)}
              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                logoutHovered
                  ? "border-red-700 bg-red-700 text-white"
                  : "border-white/20 bg-white/10 text-slate-100"
              }`}
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
