import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate("/dashboard");
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-70px)] items-center justify-center overflow-hidden bg-[radial-gradient(640px_380px_at_20%_16%,rgba(47,245,168,0.26),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)] px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(35,248,170,0.85)_0.7px,transparent_0.7px)] bg-size-[8px_8px] opacity-45" />
      <div className="relative z-10 w-full max-w-112.5 rounded-2xl border border-[#2ff5a838] bg-white/10 p-8 text-[#e8f2ed] shadow-2xl backdrop-blur">
        <h1 className="mb-2 text-center text-3xl font-bold text-[#e8f2ed]">
          TraceHub
        </h1>
        <h2 className="mb-8 text-center text-2xl font-bold text-[#e8f2ed]">
          Login
        </h2>

        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg border-l-4 border-red-500 bg-red-100 px-4 py-3 font-medium text-red-900">
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
              placeholder="your@email.com"
              className="w-full rounded-lg border border-[#2ff5a838] bg-[#1f2925cc] px-4 py-3 text-[#e8f2ed] outline-none transition placeholder:text-[#9ec0b2] focus:border-[#2ff5a8] focus:ring-2 focus:ring-[#2ff5a866]"
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
              className="w-full rounded-lg border border-[#2ff5a838] bg-[#1f2925cc] px-4 py-3 text-[#e8f2ed] outline-none transition placeholder:text-[#9ec0b2] focus:border-[#2ff5a8] focus:ring-2 focus:ring-[#2ff5a866]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-[#2ff5a8] bg-[#2ff5a8] px-4 py-3 text-sm font-bold uppercase tracking-wide text-[#142019] transition hover:-translate-y-0.5 hover:bg-[#24d993] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-8 border-t border-[#2ff5a838] pt-6 text-center text-sm text-[#bcd2c9]">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
