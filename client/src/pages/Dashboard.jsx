import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  BookOpen,
  Upload,
  Clock,
  Sparkles,
  School,
  CreditCard,
} from "lucide-react";

const Dashboard = () => {
  const { user, isProfessor, isAdmin, renewSubscription } = useAuth();
  const navigate = useNavigate();

  const cardClass =
    "flex flex-col rounded-2xl border border-[#2ff5a838] bg-white/10 p-8 text-[#e8f2ed] shadow-2xl backdrop-blur transition hover:-translate-y-1 hover:border-[#2ff5a866]";

  const handleRenew = async () => {
    await renewSubscription();
    window.location.reload();
  };

  return (
    <div className="mx-auto w-full max-w-360 rounded-2xl bg-[radial-gradient(640px_360px_at_22%_6%,rgba(47,245,168,0.23),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)] p-4 md:p-8">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#3f5148] pb-8">
        <div>
          <h1 className="mb-3 text-4xl font-bold text-slate-100 md:text-5xl">
            Welcome, {user?.name}!
          </h1>
          <p className="inline-block rounded-2xl bg-[#2ff5a8] px-6 py-2 text-xs font-semibold uppercase tracking-wider text-[#142019]">
            {user?.role}
          </p>
          {user?.role === "PROFESSOR" && (
            <p className="mt-3 text-sm text-[#bcd2c9]">
              Subscription: {user?.teacherSubscription?.status || "NONE"}
              {user?.teacherSubscription?.nextBillingDate
                ? ` | Next Billing: ${new Date(user.teacherSubscription.nextBillingDate).toLocaleDateString()}`
                : ""}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {user?.role === "PROFESSOR" &&
            user?.teacherSubscription?.status !== "ACTIVE" && (
              <button
                onClick={handleRenew}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#2ff5a8] bg-[#2ff5a8] px-5 py-3 text-sm font-semibold text-[#142019] transition hover:bg-[#24d993]"
              >
                <CreditCard size={16} />
                Renew Subscription
              </button>
            )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* All Users */}
        <Link to="/resources" className={cardClass}>
          <BookOpen
            size={56}
            className="mx-auto mb-6 rounded-3xl bg-[#2ff5a833] p-5 text-[#8cf0c8]"
          />
          <h3 className="mb-3 text-[2rem] font-semibold leading-tight text-[#e8f2ed]">
            All Resources
          </h3>
          <p className="text-lg leading-8 text-[#bfd0c8]">
            Browse all published resources and documents
          </p>
        </Link>

        <Link to="/classrooms" className={cardClass}>
          <School
            size={56}
            className="mx-auto mb-6 rounded-3xl bg-[#2ff5a833] p-5 text-[#8cf0c8]"
          />
          <h3 className="mb-3 text-[2rem] font-semibold leading-tight text-[#e8f2ed]">
            Classrooms
          </h3>
          <p className="text-lg leading-8 text-[#bfd0c8]">
            Create, join, post assignments, submit work, and grade
          </p>
        </Link>

        {/* Upload for Professors */}
        {(isProfessor || isAdmin) && (
          <Link to="/upload" className={`${cardClass} border-[#2ff5a866]`}>
            <Upload
              size={56}
              className="mx-auto mb-6 rounded-3xl bg-[#2ff5a833] p-5 text-[#8cf0c8]"
            />
            <h3 className="mb-3 text-[2rem] font-semibold leading-tight text-[#e8f2ed]">
              Upload Document
            </h3>
            <p className="text-lg leading-8 text-[#bfd0c8]">
              Upload and publish your course materials
            </p>
          </Link>
        )}

        {/* Pending Approvals */}
        {(isProfessor || isAdmin) && (
          <Link to="/pending" className={`${cardClass} border-[#2ff5a866]`}>
            <Clock
              size={56}
              className="mx-auto mb-6 rounded-3xl bg-[#2ff5a833] p-5 text-[#8cf0c8]"
            />
            <h3 className="mb-3 text-[2rem] font-semibold leading-tight text-[#e8f2ed]">
              Pending Approvals
            </h3>
            <p className="text-lg leading-8 text-[#bfd0c8]">
              Review and approve student submissions
            </p>
          </Link>
        )}

        {/* My Resources */}
        <Link to="/my-resources" className={cardClass}>
          <Sparkles
            size={56}
            className="mx-auto mb-6 rounded-3xl bg-[#2ff5a833] p-5 text-[#8cf0c8]"
          />
          <h3 className="mb-3 text-[2rem] font-semibold leading-tight text-[#e8f2ed]">
            My Resources
          </h3>
          <p className="text-lg leading-8 text-[#bfd0c8]">
            View your uploaded documents
          </p>
        </Link>


      </div>
    </div>
  );
};

export default Dashboard;
