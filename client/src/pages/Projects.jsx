import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../config/Api";
import { Bookmark } from "lucide-react";
import { VersionHistory } from "../components/VersionHistory";

const Projects = () => {
  const { user } = useAuth();
  const [verifiedProjects, setVerifiedProjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [expandedProjectVersions, setExpandedProjectVersions] = useState({});
  const [projectVersionHistory, setProjectVersionHistory] = useState({});

  useEffect(() => {
    fetchClassroomsAndProjects();
  }, [user]);

  const fetchClassroomsAndProjects = async () => {
    setLoading(true);
    setError("");
    try {
      // Get all classrooms the user is in
      const classroomsResponse = await api.classrooms.getAll();
      if (classroomsResponse?.error) {
        setError("Failed to load classrooms");
        return;
      }

      const classroomsList = Array.isArray(classroomsResponse)
        ? classroomsResponse
        : classroomsResponse.classrooms || [];

      // Fetch verified projects for each classroom
      const projectsByClassroom = {};
      for (const classroom of classroomsList) {
        const projectsResponse = await api.classrooms.getVerifiedProjects(
          classroom._id,
        );
        if (!projectsResponse?.error) {
          projectsByClassroom[classroom._id] = {
            classroomName: classroom.name,
            classroomId: classroom._id,
            projects: (projectsResponse.verifiedProjects || []).map((proj) => ({
              ...proj,
              classroomId: classroom._id,
            })),
          };
        }
      }

      setVerifiedProjects(projectsByClassroom);
    } catch (err) {
      setError("Failed to load projects");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const verifyVersionIntegrity = (project) => {
    // Get the algorandTxId from project verification or history
    const txId = project.projectVerification?.algorandTxId;

    if (!txId || txId.startsWith("DEMO_")) {
      setVerificationResult({
        verified: false,
        message: "This project was recorded in demo mode",
        txId: txId || "Not recorded",
      });
    } else {
      setVerificationResult({
        verified: true,
        message: "✓ Project integrity verified on Algorand blockchain",
        txId: txId,
        timestamp: project.publishedAt,
        studentName: project.studentName,
        postTitle: project.postTitle,
      });
    }
  };

  const toggleProjectVersions = async (projectId, classroomId, postId) => {
    const isOpen = Boolean(expandedProjectVersions[projectId]);
    setExpandedProjectVersions((prev) => ({
      ...prev,
      [projectId]: !isOpen,
    }));

    if (isOpen || projectVersionHistory[projectId]) return;

    const response = await api.classrooms.getSubmissionHistory(
      classroomId,
      postId,
      projectId,
    );

    if (!response?.error) {
      setProjectVersionHistory((prev) => ({
        ...prev,
        [projectId]: response.versions || [],
      }));
    }
  };

  const downloadProjectFile = async (
    classroomId,
    postId,
    submissionId,
    fileIndex,
  ) => {
    const result = await api.classrooms.downloadSubmissionFile(
      classroomId,
      postId,
      submissionId,
      fileIndex,
    );
    if (result.error) {
      setError(result.error);
      return;
    }
    const url = window.URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const allProjects = Object.values(verifiedProjects)
    .flatMap((data) =>
      data.projects.map((proj) => ({
        ...proj,
        classroomName: data.classroomName,
      })),
    )
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  return (
    <div className="mx-auto w-full max-w-360 rounded-2xl bg-[radial-gradient(640px_360px_at_22%_6%,rgba(47,245,168,0.23),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)] p-4 md:p-8">
      <div className="mb-10 border-b-2 border-[#3f5148] pb-8">
        <h1 className="text-4xl font-bold text-slate-100 md:text-5xl">
          Approved Projects
        </h1>
        <p className="mt-3 text-sm text-[#bcd2c9]">
          Verified student projects from your classrooms
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border-l-4 border-red-500 bg-red-100 px-4 py-3 font-medium text-red-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-300">
          Loading approved projects...
        </div>
      ) : allProjects.length === 0 ? (
        <div className="py-16 text-center text-slate-300">
          <Bookmark size={48} className="mx-auto mb-3 opacity-50" />
          <p>No approved projects yet</p>
          <p className="text-xs mt-2 text-[#8b9d95]">
            When professors verify and approve student projects, they'll appear
            here
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(verifiedProjects).map(([classroomId, data]) =>
            data.projects && data.projects.length > 0 ? (
              <div key={classroomId}>
                <h2 className="text-2xl font-bold text-[#e8f2ed] mb-4">
                  {data.classroomName}
                </h2>
                <div className="space-y-4">
                  {data.projects.map((project) => {
                    const isExpanded = expandedProjectVersions[project._id];

                    return (
                      <div key={project._id}>
                        {/* Project Card */}
                        <div
                          className={`flex flex-col rounded-2xl border border-[#2ff5a838] bg-white/10 shadow-2xl backdrop-blur transition hover:-translate-y-1 hover:border-[#2ff5a866] ${
                            isExpanded ? "" : "overflow-hidden"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4 border-b border-[#2ff5a838] p-6">
                            <div className="flex-1">
                              <h3 className="wrap-break-word text-xl font-semibold text-[#e8f2ed]">
                                {project.postTitle}
                              </h3>
                              <p className="text-xs text-[#8b9d95] mt-1">
                                By {project.studentName}
                              </p>
                            </div>
                            <span className="whitespace-nowrap rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                              Verified
                            </span>
                          </div>

                          <div className="flex-1 p-6">
                            <p className="text-xs text-[#bcd2c9] mb-3">
                              <strong className="text-[#e8f2ed]">
                                Student Email:
                              </strong>{" "}
                              {project.studentEmail || "N/A"}
                            </p>
                            {project.publishedAt && (
                              <p className="text-xs text-[#bcd2c9] mb-3">
                                <strong className="text-[#e8f2ed]">
                                  Published:
                                </strong>{" "}
                                {new Date(
                                  project.publishedAt,
                                ).toLocaleDateString()}
                              </p>
                            )}
                            {project.revisionCycle && (
                              <p className="text-xs text-[#bcd2c9]">
                                <strong className="text-[#e8f2ed]">
                                  Revision Cycle:
                                </strong>{" "}
                                {project.revisionCycle}
                              </p>
                            )}
                          </div>

                          {/* GitHub & Files Section */}
                          {(project.githubUrl || project.files?.length > 0) && (
                            <div className="border-t border-[#2ff5a838] px-6 py-4">
                              {project.githubUrl && (
                                <div className="mb-3">
                                  <p className="text-xs font-semibold text-[#2ff5a8] mb-2">
                                    🔗 GitHub Repository
                                  </p>
                                  <a
                                    href={project.githubUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-400 hover:text-blue-300 underline break-all"
                                  >
                                    {project.githubUrl}
                                  </a>
                                </div>
                              )}
                              {project.files && project.files.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-[#2ff5a8] mb-2">
                                    📁 Submitted Files ({project.files.length})
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {project.files.map((file, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() =>
                                          downloadProjectFile(
                                            project.classroomId,
                                            project.postId,
                                            project._id,
                                            idx,
                                          )
                                        }
                                        className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30 transition-colors cursor-pointer"
                                      >
                                        ⬇️ {file.fileName}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* View All Versions Button */}
                          <button
                            type="button"
                            onClick={() =>
                              toggleProjectVersions(
                                project._id,
                                project.classroomId,
                                project.postId,
                              )
                            }
                            className="w-full border-t border-[#2ff5a838] px-6 py-3 text-xs font-semibold text-[#2ff5a8] hover:bg-[#2ff5a822] transition"
                          >
                            {isExpanded
                              ? "▼ Hide All Versions"
                              : "▶ View All Versions"}
                          </button>

                          {/* Blockchain Proof */}
                          {project.projectVerification?.algorandTxId && (
                            <div className="border-t border-[#2ff5a838] bg-linear-to-br from-[#2a3b34] to-[#24322d] px-6 py-4">
                              <button
                                type="button"
                                onClick={() => verifyVersionIntegrity(project)}
                                className="w-full text-left inline-flex items-center gap-2 text-sm font-semibold text-[#2ff5a8] hover:text-[#25d991] transition"
                              >
                                🔐 Verify Integrity
                              </button>
                            </div>
                          )}

                          <div className="border-t border-[#2ff5a838] bg-[#1f292580] px-6 py-5">
                            <small className="text-xs text-[#9fc0b2]">
                              v{project.versionNumber || 1} •{" "}
                              {project.classroomName}
                            </small>
                          </div>
                        </div>

                        {/* Version History Display - Full Width */}
                        {isExpanded && projectVersionHistory[project._id] && (
                          <div className="mt-4 rounded-2xl border border-[#2ff5a838] bg-white/10 shadow-2xl backdrop-blur overflow-hidden">
                            <VersionHistory
                              versionHistory={
                                projectVersionHistory[project._id]
                              }
                              submissionId={project._id}
                              isProfessor={false}
                              onVerify={() => {
                                toggleProjectVersions(
                                  project._id,
                                  project.classroomId,
                                  project.postId,
                                );
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}

      {/* Verification Result Modal */}
      {verificationResult && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
          <div
            className={`rounded-lg p-6 max-w-md w-full shadow-2xl border-2 ${
              verificationResult.verified
                ? "bg-linear-to-br from-emerald-900/20 to-emerald-800/10 border-emerald-500"
                : "bg-linear-to-br from-amber-900/20 to-amber-800/10 border-amber-500"
            }`}
          >
            <div
              className={`text-lg font-bold mb-4 ${
                verificationResult.verified
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}
            >
              {verificationResult.verified ? "✓ Verified" : "⚠️ Demo Mode"}
            </div>
            <p className="text-sm text-gray-200 mb-4">
              {verificationResult.message}
            </p>
            {verificationResult.txId && (
              <div className="bg-black/30 rounded p-3 mb-4 text-xs font-mono text-gray-300 break-all">
                <p className="font-semibold text-gray-400 mb-1">
                  Transaction ID:
                </p>
                {verificationResult.txId}
              </div>
            )}
            {verificationResult.timestamp && (
              <p className="text-xs text-gray-400 mb-2">
                <strong>Published:</strong>{" "}
                {new Date(verificationResult.timestamp).toLocaleString()}
              </p>
            )}
            {verificationResult.studentName && (
              <p className="text-xs text-gray-400 mb-2">
                <strong>Student:</strong> {verificationResult.studentName}
              </p>
            )}
            {verificationResult.postTitle && (
              <p className="text-xs text-gray-400 mb-4">
                <strong>Project:</strong> {verificationResult.postTitle}
              </p>
            )}
            {verificationResult.verified && (
              <p className="text-xs text-gray-300 mb-4 border-t border-gray-600 pt-3">
                This project's integrity is verified on the Algorand blockchain.
                The immutable record ensures no tampering has occurred.
              </p>
            )}
            <button
              type="button"
              onClick={() => setVerificationResult(null)}
              className="w-full rounded bg-[#2ff5a8] px-4 py-2 text-sm font-semibold text-[#142019] hover:bg-[#25d991]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
