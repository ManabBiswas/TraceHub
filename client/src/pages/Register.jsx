import React from "react";
import { Link } from "react-router-dom";

const Register = () => {
  return (
    <div className="relative flex min-h-[calc(100vh-70px)] items-center justify-center overflow-hidden bg-[radial-gradient(640px_380px_at_20%_16%,rgba(47,245,168,0.26),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)] px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(35,248,170,0.85)_0.7px,transparent_0.7px)] bg-size-[8px_8px] opacity-45" />
      <div className="relative z-10 w-full max-w-112.5 rounded-2xl border border-[#2ff5a838] bg-white/10 p-8 text-[#e8f2ed] shadow-2xl backdrop-blur">
        <h1 className="mb-2 text-center text-3xl font-bold text-[#e8f2ed]">
          TraceHub
        </h1>
        <h2 className="mb-8 text-center text-2xl font-bold text-[#e8f2ed]">
          Select Registration Type
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/register/student"
            className="rounded-lg border border-[#2ff5a838] bg-[#1f2925cc] px-6 py-8 text-center text-lg font-semibold transition hover:border-[#2ff5a8]"
          >
            Student Registration
          </Link>
          <Link
            to="/register/teacher"
            className="rounded-lg border border-[#2ff5a838] bg-[#1f2925cc] px-6 py-8 text-center text-lg font-semibold transition hover:border-[#2ff5a8]"
          >
            Teacher Registration
          </Link>
        </div>

        <p className="mt-8 border-t border-[#2ff5a838] pt-6 text-center text-sm text-[#bcd2c9]">
          Already have an account? <Link to="/login">Select login type</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
