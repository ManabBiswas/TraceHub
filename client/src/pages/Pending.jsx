import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../config/Api';
import { Github } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const Pending = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [passcodeModal, setPasscodeModal] = useState(null);
  const [passcode, setPasscode] = useState('');
  const [approving, setApproving] = useState(false);
  const { isProfessor, isAdmin } = useAuth();

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/pending`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle multiple response formats
      if (data.resources && Array.isArray(data.resources)) {
        setResources(data.resources);
      } else if (Array.isArray(data)) {
        setResources(data);
      } else {
        setResources([]);
      }
    } catch (err) {
      setError('Failed to load pending resources: ' + err.message);
      console.error('Fetch Pending Error:', err);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (resourceId, type = "resource") => {
    if (!isProfessor && !isAdmin) {
      setError('Only professors can approve resources');
      return;
    }
    setPasscodeModal({ id: resourceId, type });
    setPasscode('');
  };

  const submitApproval = async () => {
    if (!passcode) {
      setError('Please enter passcode');
      return;
    }

    setApproving(true);
    try {
      const { id, type } = passcodeModal;
      const endpoint = type === "submission" ? 
        `${API_BASE_URL}/pending/approve-submission/${id}` : 
        `${API_BASE_URL}/pending/approve/${id}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || "Approval failed");
      } else {
        setResources(resources.filter(r => r._id !== id));
        setPasscodeModal(null);
        setPasscode('');
        setError('');
      }
    } catch (err) {
      setError(err.message || 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (resourceId, type = "resource") => {
    if (!window.confirm('Are you sure you want to reject this ' + (type === "submission" ? 'submission' : 'resource') + '?')) {
      return;
    }

    try {
      const endpoint = type === "submission" ? 
        `${API_BASE_URL}/pending/reject-submission/${resourceId}` : 
        `${API_BASE_URL}/pending/${resourceId}`;

      const response = await fetch(endpoint, {
        method: type === "submission" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: '' }),
      });

      if (response.ok) {
        setResources(resources.filter(r => r._id !== resourceId));
      } else {
        const errorBody = await response.json().catch(() => ({}));
        setError(errorBody.error || `${type === "submission" ? "Submission" : "Resource"} rejection failed`);
      }
    } catch (err) {
      setError('Rejection failed');
    }
  };

  const downloadSubmissionFile = async (submissionId, fileIndex) => {
    try {
      const resource = resources.find(r => r._id === submissionId);
      if (!resource || !resource.classroomId || !resource.postId) {
        setError('Unable to download file: Missing submission context');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/classrooms/${resource.classroomId._id || resource.classroomId}/posts/${resource.postId._id || resource.postId}/submissions/${submissionId}/files/${fileIndex}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        setError(errorBody.error || "Failed to download file");
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const fileNameMatch = disposition.match(/filename="?([^/"]+)"?/);
      const fileName = fileNameMatch ? decodeURIComponent(fileNameMatch[1]) : "submission-file";

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Download failed: ' + err.message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-300 rounded-2xl bg-[radial-gradient(640px_360px_at_22%_6%,rgba(47,245,168,0.23),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)] p-4 md:p-8">
      <div className="mb-10 border-b-2 border-[#3f5148] pb-8">
        <h1 className="mb-3 text-4xl font-bold text-slate-100 md:text-5xl">Pending Approvals</h1>
        {!isProfessor && !isAdmin && (
          <p className="inline-block rounded-md border-l-4 border-amber-500 bg-amber-100 px-4 py-3 font-medium text-amber-700">You need professor access to approve resources</p>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border-l-4 border-red-500 bg-red-100 px-4 py-3 font-medium text-red-900">
          {error}
          <button onClick={() => setError('')} className="text-2xl leading-none">×</button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-300">Loading pending resources...</div>
      ) : resources.length === 0 ? (
        <div className="py-16 text-center text-slate-300">
          <p>No pending resources to approve</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {resources.map(resource => (
            <div key={resource._id} className="overflow-hidden rounded-2xl border border-[#2ff5a838] bg-white/10 shadow-2xl backdrop-blur transition hover:border-[#2ff5a866]">
              <div className="flex flex-wrap items-start justify-between gap-6 border-b border-[#2ff5a838] p-8">
                <div>
                  <h3 className="mb-4 text-2xl font-semibold text-[#e8f2ed]">{resource.title}</h3>
                  <p className="mb-3 text-sm text-[#bfd0c8]">
                    <strong>{resource.type === "SUBMISSION" ? 'Student' : 'Submitted by'}:</strong> {resource.uploaderName}
                  </p>
                  <p className="text-sm text-[#bfd0c8]">
                    <strong>Email:</strong> {resource.uploaderEmail}
                  </p>
                </div>
                <span className="rounded-md bg-amber-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                  {resource.type === "SUBMISSION" ? "Student Submission" : "Pending"}
                </span>
              </div>

              {resource.aiSummary && (
                <div className="border-t border-[#2ff5a838] px-6 py-4">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#9fc0b2]">Summary</h4>
                  <p className="text-sm leading-7 text-[#bfd0c8]">{resource.aiSummary}</p>
                </div>
              )}

              {resource.aiTags && resource.aiTags.length > 0 && (
                <div className="border-t border-[#2ff5a838] px-6 py-4">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#9fc0b2]">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {resource.aiTags.map((tag, idx) => (
                      <span key={`${resource._id}-tag-${idx}`} className="rounded-md border border-[#2ff5a847] bg-linear-to-br from-[#2ff5a833] to-[#2ff5a81a] px-3 py-1 text-xs font-semibold text-[#e8f2ed]">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {resource.githubUrl && (
                <div className="border-t border-[#2ff5a838] px-6 py-4">
                  <a 
                    href={resource.githubUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-[#d8ebe3] transition hover:bg-[#2ff5a829] hover:text-white hover:cursor-pointer"
                  >
                    <Github size={18} />
                    View on GitHub
                  </a>
                </div>
              )}

              {resource.files && resource.files.length > 0 && (
                <div className="border-t border-[#2ff5a838] px-6 py-4">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#9fc0b2]">Submitted Files</h4>
                  <div className="flex flex-wrap gap-2">
                    {resource.files.map((file, idx) => (
                      <button
                        key={`${resource._id}-file-${idx}`}
                        type="button"
                        onClick={() => resource.type === "SUBMISSION" ? downloadSubmissionFile(resource._id, idx) : null}
                        className={`rounded-md ${
                          resource.type === "SUBMISSION" 
                            ? "cursor-pointer border border-[#2ff5a8] bg-[#2ff5a811] px-3 py-1 text-xs font-semibold text-[#2ff5a8] hover:bg-[#2ff5a822]"
                            : "border border-[#2ff5a847] bg-[#2ff5a811] px-3 py-1 text-xs font-semibold text-[#2ff5a8]"
                        }`}
                      >
                        {file.fileName || `File ${idx + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-[#2ff5a838] bg-[#1f292580] p-4 md:flex-row md:p-6">
                <button
                  onClick={() => handleApprove(resource._id, resource.type === "SUBMISSION" ? "submission" : "resource")}
                  disabled={!isProfessor && !isAdmin}
                  className="inline-flex flex-1 items-center justify-center rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(resource._id, resource.type === "SUBMISSION" ? "submission" : "resource")}
                  disabled={!isProfessor && !isAdmin}
                  className="inline-flex flex-1 items-center justify-center rounded-lg bg-red-500 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reject
                </button>
              </div>

              <div className="border-t border-[#2ff5a838] bg-[#1f292580] px-6 py-5 text-right">
                <small className="text-xs text-[#9fc0b2]">Submitted: {new Date(resource.createdAt || resource.updatedAt).toLocaleDateString()}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {passcodeModal && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/70 p-4 backdrop-blur" onClick={() => setPasscodeModal(null)}>
          <div className="w-full max-w-112.5 rounded-2xl border border-[#2ff5a838] bg-[#1f2925f2] p-8 shadow-2xl backdrop-blur" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-6 text-2xl font-bold text-[#e8f2ed]">Enter Professor Passcode</h3>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Passcode"
              onKeyPress={(e) => e.key === 'Enter' && submitApproval()}
              className="mb-6 w-full rounded-lg border border-[#2ff5a838] bg-[#1f2925cc] px-4 py-3 text-[#e8f2ed] outline-none transition placeholder:text-[#9ec0b2] focus:border-[#2ff5a8] focus:ring-2 focus:ring-[#2ff5a866]"
            />
            <div className="flex gap-3">
              <button
                onClick={submitApproval}
                disabled={approving}
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {approving ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={() => setPasscodeModal(null)}
                className="inline-flex flex-1 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-[#e8f2ed] transition hover:bg-white/20"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pending;
