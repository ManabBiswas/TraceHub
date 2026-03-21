import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RegisterStudent = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const success = await register(
      formData.email,
      formData.password,
      formData.name,
    );
    setLoading(false);

    if (success) {
      navigate("/dashboard");
      return;
    }

    setError("Student registration failed");
  };

  return (
    <div className="mx-auto w-full max-w-112.5 rounded-2xl border border-[#2ff5a838] bg-white/10 p-8 text-[#e8f2ed] shadow-2xl backdrop-blur">
      <h2 className="mb-8 text-center text-2xl font-bold text-[#e8f2ed]">
        Student Registration
      </h2>

      {error && (
        <div className="mb-4 rounded-lg border-l-4 border-red-500 bg-red-100 px-4 py-3 font-medium text-red-900">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Full Name"
          className="mb-4 w-full rounded-lg border border-[#2ff5a838] bg-[#1f2925cc] px-4 py-3"
        />
        <input
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder="Email"
          className="mb-4 w-full rounded-lg border border-[#2ff5a838] bg-[#1f2925cc] px-4 py-3"
        />
        <input
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          required
          placeholder="Password"
          className="mb-4 w-full rounded-lg border border-[#2ff5a838] bg-[#1f2925cc] px-4 py-3"
        />
        <input
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          placeholder="Confirm Password"
          className="mb-4 w-full rounded-lg border border-[#2ff5a838] bg-[#1f2925cc] px-4 py-3"
        />

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-lg border border-[#2ff5a8] bg-[#2ff5a8] px-4 py-3 text-sm font-bold text-[#142019]"
        >
          {loading ? "Registering..." : "Register Student"}
        </button>
      </form>

      <p className="mt-8 border-t border-[#2ff5a838] pt-6 text-center text-sm text-[#bcd2c9]">
        Already a student? <Link to="/login/student">Student login</Link>
      </p>
    </div>
  );
};

export default RegisterStudent;
