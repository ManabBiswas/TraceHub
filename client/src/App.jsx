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
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Landing from "./pages/Landing";
import About from "./pages/About";
import Login from "./pages/Login";
import Register from "./pages/Register";
import LoginStudent from "./pages/LoginStudent";
import LoginTeacher from "./pages/LoginTeacher";
import RegisterStudent from "./pages/RegisterStudent";
import RegisterTeacher from "./pages/RegisterTeacher";
import Dashboard from "./pages/Dashboard";
import Resources from "./pages/Resources";
import MyResources from "./pages/MyResources";
import Upload from "./pages/Upload";
import Profile from "./pages/Profile";
import Classrooms from "./pages/Classrooms";
import ClassroomPostDetails from "./pages/ClassroomPostDetails";
import ClassroomProjectDetails from "./pages/ClassroomProjectDetails";
import Projects from "./pages/Projects";

function AppContent() {
  const { loading, isAuthenticated } = useAuth();

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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(35,248,170,0.85)_0.7px,transparent_0.7px)] bg-size-[8px_8px] opacity-35" />
        <div className="relative z-10">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />
            <Route
              path="/login"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Login />
                )
              }
            />
            <Route
              path="/login/student"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <LoginStudent />
                )
              }
            />
            <Route
              path="/login/teacher"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <LoginTeacher />
                )
              }
            />
            <Route
              path="/register"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Register />
                )
              }
            />
            <Route
              path="/register/student"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <RegisterStudent />
                )
              }
            />
            <Route
              path="/register/teacher"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <RegisterTeacher />
                )
              }
            />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resources"
              element={
                <ProtectedRoute>
                  <Resources />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-resources"
              element={
                <ProtectedRoute>
                  <MyResources />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <Upload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/classrooms"
              element={
                <ProtectedRoute>
                  <Classrooms />
                </ProtectedRoute>
              }
            />
            <Route
              path="/classrooms/:classroomId/posts/:postId"
              element={
                <ProtectedRoute>
                  <ClassroomPostDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/classrooms/:classroomId/projects/:postId"
              element={
                <ProtectedRoute>
                  <ClassroomProjectDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              }
            />

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
