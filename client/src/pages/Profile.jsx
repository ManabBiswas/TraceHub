import React from "react";
import { useAuth } from "../context/AuthContext";
import { Check, X } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();

  const getRoleColor = (role) => {
    switch (role) {
      case "HOD":
        return "#ff6b6b";
      case "PROFESSOR":
        return "#4ecdc4";
      case "STUDENT":
        return "#95e1d3";
      default:
        return "#999";
    }
  };

  const getRoleDescription = (role) => {
    switch (role) {
      case "HOD":
        return "Head of Department - Full administrative access";
      case "PROFESSOR":
        return "Faculty - Can upload and approve documents";
      case "STUDENT":
        return "Learner - Can view resources and submit documents";
      default:
        return "Unknown role";
    }
  };

  return (
    <div className="mx-auto w-full max-w-225 rounded-2xl bg-[radial-gradient(640px_360px_at_22%_6%,rgba(47,245,168,0.23),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)] p-4 md:p-8">
      <div className="overflow-hidden rounded-2xl border border-[#2ff5a838] bg-white/10 shadow-2xl backdrop-blur">
        <div className="bg-linear-to-br from-[#27332e] to-[#1f2925] px-6 py-12 text-center text-slate-100">
          <div className="mx-auto mb-6 flex h-30 w-30 items-center justify-center overflow-hidden rounded-full border-3 border-white/40 bg-white/20 text-5xl font-bold shadow-lg">
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt="Profile"
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              user?.name?.charAt(0).toUpperCase()
            )}
          </div>
          <h1 className="text-3xl font-bold">{user?.name}</h1>
        </div>

        <div className="p-6 md:p-10">
          <section className="mb-10">
            <h2 className="mb-6 border-b-2 border-[#2ff5a838] pb-4 text-2xl font-bold text-[#e8f2ed]">
              Account Information
            </h2>
            <div className="mb-7">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#9fc0b2]">
                Email
              </label>
              <p className="text-lg text-[#d8ebe3]">{user?.email}</p>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#9fc0b2]">
                Full Name
              </label>
              <p className="text-lg text-[#d8ebe3]">{user?.name}</p>
            </div>
          </section>

          {user?.role === "PROFESSOR" && (
            <section className="mb-10">
              <h2 className="mb-6 border-b-2 border-[#2ff5a838] pb-4 text-2xl font-bold text-[#e8f2ed]">
                Teacher Subscription
              </h2>
              <div className="space-y-3 rounded-xl border border-[#2ff5a847] bg-[#1f292580] p-5">
                <p className="text-sm text-[#d8ebe3]">
                  Status:{" "}
                  <span className="font-semibold">
                    {user?.teacherSubscription?.status || "NONE"}
                  </span>
                </p>
                <p className="text-sm text-[#d8ebe3]">
                  Plan:{" "}
                  <span className="font-semibold">
                    {user?.teacherSubscription?.currency || "INR"}{" "}
                    {user?.teacherSubscription?.amount || 0} /{" "}
                    {user?.teacherSubscription?.interval || "monthly"}
                  </span>
                </p>
                <p className="text-sm text-[#d8ebe3]">
                  Next Billing:{" "}
                  <span className="font-semibold">
                    {user?.teacherSubscription?.nextBillingDate
                      ? new Date(
                          user.teacherSubscription.nextBillingDate,
                        ).toLocaleDateString()
                      : "N/A"}
                  </span>
                </p>
              </div>
            </section>
          )}

          <section className="mb-10">
            <h2 className="mb-6 border-b-2 border-[#2ff5a838] pb-4 text-2xl font-bold text-[#e8f2ed]">
              Role & Permissions
            </h2>
            <div className="mb-8 flex flex-col items-start gap-4 rounded-xl border border-[#2ff5a84d] bg-linear-to-br from-[#2ff5a833] to-[#2ff5a81a] p-6 md:flex-row md:items-center">
              <div
                className="rounded-lg px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#142019] shadow-md"
                style={{ backgroundColor: getRoleColor(user?.role) }}
              >
                {user?.role}
              </div>
              <p className="text-sm leading-7 text-[#d8ebe3]">
                {getRoleDescription(user?.role)}
              </p>
            </div>

            {user?.department && (
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#9fc0b2]">
                  Department
                </label>
                <p className="text-lg text-[#d8ebe3]">{user?.department}</p>
              </div>
            )}
          </section>

          <section className="mb-10">
            <h2 className="mb-6 border-b-2 border-[#2ff5a838] pb-4 text-2xl font-bold text-[#e8f2ed]">
              Your Permissions
            </h2>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 rounded-lg border border-[#2ff5a838] bg-[#1f292580] p-4 text-sm leading-7 text-[#d8ebe3]">
                <Check size={20} className="text-emerald-600" />
                View all published resources
              </li>
              {user?.role === "PROFESSOR" || user?.role === "HOD" ? (
                <>
                  <li className="flex items-center gap-3 rounded-lg border border-[#2ff5a838] bg-[#1f292580] p-4 text-sm leading-7 text-[#d8ebe3]">
                    <Check size={20} className="text-emerald-600" />
                    Upload and publish documents
                  </li>
                  <li className="flex items-center gap-3 rounded-lg border border-[#2ff5a838] bg-[#1f292580] p-4 text-sm leading-7 text-[#d8ebe3]">
                    <Check size={20} className="text-emerald-600" />
                    Approve student submissions
                  </li>
                </>
              ) : (
                <li className="flex items-center gap-3 rounded-lg border border-[#2ff5a838] bg-[#1f292580] p-4 text-sm leading-7 text-[#d8ebe3]">
                  <X size={20} className="text-red-600" />
                  Upload documents (requires Professor/HOD role)
                </li>
              )}
            </ul>
          </section>

          {user?.role === "HOD" && (
            <section>
              <h2 className="mb-6 border-b-2 border-[#2ff5a838] pb-4 text-2xl font-bold text-[#e8f2ed]">
                Managed Departments
              </h2>
              {user?.managedDepartments &&
              user.managedDepartments.length > 0 ? (
                <ul className="space-y-3">
                  {user.managedDepartments.map((dept, idx) => (
                    <li
                      key={idx}
                      className="rounded-lg border border-[#2ff5a847] bg-linear-to-br from-[#2ff5a829] to-[#2ff5a814] p-4 font-medium text-[#d8ebe3]"
                    >
                      {dept}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm italic text-[#9fc0b2]">
                  No departments assigned yet
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
