import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Upload, Clock, Sparkles, User, Info } from 'lucide-react';

const Dashboard = () => {
  const { user, logout, isProfessor, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const cardClass =
    'flex flex-col rounded-2xl border border-[#2ff5a838] bg-white/10 p-8 text-[#e8f2ed] shadow-2xl backdrop-blur transition hover:-translate-y-1 hover:border-[#2ff5a866]';

  return (
    <div className="mx-auto w-full max-w-360 rounded-2xl bg-[radial-gradient(640px_360px_at_22%_6%,rgba(47,245,168,0.23),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)] p-4 md:p-8">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#3f5148] pb-8">
        <div>
          <h1 className="mb-3 text-4xl font-bold text-slate-100 md:text-5xl">Welcome, {user?.name}!</h1>
          <p className="inline-block rounded-2xl bg-[#2ff5a8] px-6 py-2 text-xs font-semibold uppercase tracking-wider text-[#142019]">{user?.role}</p>
        </div>
        <button onClick={handleLogout} className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/20">
          Logout
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* All Users */}
        <Link to="/resources" className={cardClass}>
          <BookOpen size={56} className="mx-auto mb-6 rounded-3xl bg-[#2ff5a833] p-5 text-[#8cf0c8]" />
          <h3 className="mb-3 text-[2rem] font-semibold leading-tight text-[#e8f2ed]">All Resources</h3>
          <p className="text-lg leading-8 text-[#bfd0c8]">Browse all published resources and documents</p>
        </Link>

        {/* Upload for Professors */}
        {(isProfessor || isAdmin) && (
          <Link to="/upload" className={`${cardClass} border-[#2ff5a866]`}>
            <Upload size={56} className="mx-auto mb-6 rounded-3xl bg-[#2ff5a833] p-5 text-[#8cf0c8]" />
            <h3 className="mb-3 text-[2rem] font-semibold leading-tight text-[#e8f2ed]">Upload Document</h3>
            <p className="text-lg leading-8 text-[#bfd0c8]">Upload and publish your course materials</p>
          </Link>
        )}

        {/* Pending Approvals */}
        {(isProfessor || isAdmin) && (
          <Link to="/pending" className={`${cardClass} border-[#2ff5a866]`}>
            <Clock size={56} className="mx-auto mb-6 rounded-3xl bg-[#2ff5a833] p-5 text-[#8cf0c8]" />
            <h3 className="mb-3 text-[2rem] font-semibold leading-tight text-[#e8f2ed]">Pending Approvals</h3>
            <p className="text-lg leading-8 text-[#bfd0c8]">Review and approve student submissions</p>
          </Link>
        )}

        {/* My Resources */}
        <Link to="/my-resources" className={cardClass}>
          <Sparkles size={56} className="mx-auto mb-6 rounded-3xl bg-[#2ff5a833] p-5 text-[#8cf0c8]" />
          <h3 className="mb-3 text-[2rem] font-semibold leading-tight text-[#e8f2ed]">My Resources</h3>
          <p className="text-lg leading-8 text-[#bfd0c8]">View your uploaded documents</p>
        </Link>

        {/* Profile */}
        <Link to="/profile" className={cardClass}>
          <User size={56} className="mx-auto mb-6 rounded-3xl bg-[#2ff5a833] p-5 text-[#8cf0c8]" />
          <h3 className="mb-3 text-[2rem] font-semibold leading-tight text-[#e8f2ed]">Profile</h3>
          <p className="text-lg leading-8 text-[#bfd0c8]">Manage your account information</p>
        </Link>

        {/* Info Card */}
        <div className="flex cursor-default flex-col rounded-2xl border border-[#2ff5a838] bg-white/10 p-8 text-[#e8f2ed] shadow-2xl backdrop-blur">
          <Info size={56} className="mx-auto mb-6 rounded-3xl bg-[#2ff5a833] p-5 text-[#8cf0c8]" />
          <h3 className="mb-3 text-[2rem] font-semibold leading-tight text-[#e8f2ed]">About TraceHub</h3>
          <p className="text-lg leading-8 text-[#bfd0c8]">A secure platform for publishing and verifying academic resources with blockchain proof</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
