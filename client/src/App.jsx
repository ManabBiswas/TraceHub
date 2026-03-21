import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import BackToTop from "./components/BackToTop";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Resources from "./pages/Resources";
import MyResources from "./pages/MyResources";
import Upload from "./pages/Upload";
import Pending from "./pages/Pending";
import Profile from "./pages/Profile";
import Classrooms from "./pages/Classrooms";

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1f2925] text-slate-300">
        Loading...
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <main className="relative mx-auto min-h-[calc(100vh-72px)] w-full max-w-360 overflow-hidden bg-[#1f2925] px-4 py-5 md:px-8">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(rgba(35,248,170,0.85)_0.7px,transparent_0.7px)] [background-size:8px_8px]" />
        <div className="relative z-10">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* All routes accessible without protection */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/my-resources" element={<MyResources />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/pending" element={<Pending />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/classrooms" element={<Classrooms />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
      <Footer />
      <BackToTop />
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
