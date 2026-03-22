import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LoginTeacher = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { loginTeacher } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await loginTeacher(email, password);
    setLoading(false);

    if (result.success) {
      navigate("/dashboard");
      return;
    }

    setError(result.message || "Teacher login failed");
  };

  return (
    <div className="mx-auto w-full max-w-112.5 rounded-2xl border border-[#2ff5a838] bg-white/10 p-8 text-[#e8f2ed] shadow-2xl backdrop-blur">
      <h2 className="mb-8 text-center text-2xl font-bold text-[#e8f2ed]">
        Teacher Login
      </h2>

      {error && (
        <div className="mb-4 rounded-lg border-l-4 border-red-500 bg-red-100 px-4 py-3 font-medium text-red-900">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-6 flex flex-col">
          <label
            htmlFor="email"
            className="mb-3 text-sm font-semibold text-[#d8ebe3]"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="teacher@email.com"
            className="w-full rounded-lg border border-[#2ff5a838] bg-[#1f2925cc] px-4 py-3 text-[#e8f2ed] outline-none transition"
          />
        </div>

        <div className="mb-6 flex flex-col">
          <label
            htmlFor="password"
            className="mb-3 text-sm font-semibold text-[#d8ebe3]"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="At least 8 characters"
            className="w-full rounded-lg border border-[#2ff5a838] bg-[#1f2925cc] px-4 py-3 text-[#e8f2ed] outline-none transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-lg border border-[#2ff5a8] bg-[#2ff5a8] px-4 py-3 text-sm font-bold text-[#142019] btn-primary-animated"
        >
          {loading ? "Logging in..." : "Login as Teacher"}
        </button>
      </form>

      <div className="mt-8 border-t border-[#2ff5a838] pt-6 space-y-3">
        <p className="text-center text-sm text-[#bcd2c9]">New teacher?</p>
        <Link to="/register/teacher" className="inline-flex w-full items-center justify-center rounded-lg border border-[#2ff5a8] bg-[#2ff5a8] px-4 py-3 text-sm font-bold text-[#142019] btn-primary-animated">
          Create Teacher Account
        </Link>
      </div>
    </div>
  );
};

export default LoginTeacher;
