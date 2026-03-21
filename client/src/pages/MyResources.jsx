import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../config/Api";
import { LinkIcon, Link2 } from "lucide-react";

const MyResources = () => {
  const { user } = useAuth();
  const canEdit = user?.role === "PROFESSOR" || user?.role === "HOD";
  const [resources, setResources] = useState([]);
  const [historyById, setHistoryById] = useState({});
  const [openHistoryById, setOpenHistoryById] = useState({});
  const [historyLoadingById, setHistoryLoadingById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingResourceId, setEditingResourceId] = useState("");
  const [editForm, setEditForm] = useState({
    title: "",
    aiSummary: "",
    aiTagsText: "",
    file: null,
  });

  useEffect(() => {
    fetchMyResources();
  }, [user]);

  const fetchMyResources = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.resources.getAll({ userId: user?._id });
      setResources(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to load your resources");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString();
  };

  const toggleHistory = async (resourceId) => {
    const isOpen = Boolean(openHistoryById[resourceId]);
    setOpenHistoryById((prev) => ({ ...prev, [resourceId]: !isOpen }));

    if (isOpen || historyById[resourceId]) return;

    setHistoryLoadingById((prev) => ({ ...prev, [resourceId]: true }));
    const response = await api.resources.getHistory(resourceId);
    setHistoryLoadingById((prev) => ({ ...prev, [resourceId]: false }));

    if (response?.error) {
      setError(response.error);
      return;
    }

    setHistoryById((prev) => ({
      ...prev,
      [resourceId]: response.versions || [],
    }));
  };

  const startEditResource = (resource) => {
    setEditingResourceId(resource._id);
    setEditForm({
      title: resource.title || "",
      aiSummary: resource.aiSummary || "",
      aiTagsText: Array.isArray(resource.aiTags)
        ? resource.aiTags.join(", ")
        : "",
      file: null,
    });
  };

  const cancelEdit = () => {
    setEditingResourceId("");
    setEditForm({ title: "", aiSummary: "", aiTagsText: "", file: null });
  };

  const saveResourceEdit = async (resourceId) => {
    const aiTags = editForm.aiTagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const response = await api.resources.update(resourceId, {
      title: editForm.title,
      aiSummary: editForm.aiSummary,
      aiTags,
      file: editForm.file,
    });

    if (response?.error) {
      setError(response.error);
      return;
    }

    setResources((prev) =>
      prev.map((resource) =>
        resource._id === resourceId ? response.resource : resource,
      ),
    );
    setEditingResourceId("");
    setMessage(response.message || "Resource updated");

    const historyResponse = await api.resources.getHistory(resourceId);
    if (!historyResponse?.error) {
      setHistoryById((prev) => ({
        ...prev,
        [resourceId]: historyResponse.versions || [],
      }));
    }
  };

  return (
    <div className="mx-auto w-full max-w-360 rounded-2xl bg-[radial-gradient(640px_360px_at_22%_6%,rgba(47,245,168,0.23),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)] p-4 md:p-8">
      <div className="mb-10 border-b-2 border-[#3f5148] pb-8">
        <h1 className="text-4xl font-bold text-slate-100 md:text-5xl">
          My Resources
        </h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border-l-4 border-red-500 bg-red-100 px-4 py-3 font-medium text-red-900">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-lg border-l-4 border-emerald-500 bg-emerald-100 px-4 py-3 font-medium text-emerald-900">
          {message}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-300">
          Loading your resources...
        </div>
      ) : resources.length === 0 ? (
        <div className="py-16 text-center text-slate-300">
          <p>You haven't uploaded any resources yet</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource) => (
            <div
              key={resource._id}
              className="flex flex-col overflow-hidden rounded-2xl border border-[#2ff5a838] bg-white/10 shadow-2xl backdrop-blur transition hover:-translate-y-1 hover:border-[#2ff5a866]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#2ff5a838] p-6">
                <div className="flex-1">
                  {editingResourceId === resource._id ? (
                    <input
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-white/20 bg-[#1f2925cc] px-3 py-2 text-sm text-[#e8f2ed]"
                    />
                  ) : (
                    <h3 className="wrap-break-word text-xl font-semibold text-[#e8f2ed]">
                      {resource.title}
                    </h3>
                  )}
                </div>
                <span
                  className={`whitespace-nowrap rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-wide ${resource.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                >
                  {resource.status}
                </span>
              </div>

              <div className="flex-1 p-6">
                <p className="mb-3 text-sm text-[#bfd0c8]">
                  <strong className="font-semibold text-[#e8f2ed]">
                    Status:
                  </strong>{" "}
                  {resource.status}
                </p>
                {resource.approvedBy && (
                  <p className="text-sm text-[#bfd0c8]">
                    <strong className="font-semibold text-[#e8f2ed]">
                      Approved by:
                    </strong>{" "}
                    {resource.approvedBy}
                  </p>
                )}
              </div>

              {resource.aiSummary && (
                <div className="border-t border-[#2ff5a838] px-6 py-4">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#9fc0b2]">
                    Summary
                  </h4>
                  {editingResourceId === resource._id ? (
                    <textarea
                      rows={3}
                      value={editForm.aiSummary}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          aiSummary: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-white/20 bg-[#1f2925cc] px-3 py-2 text-sm text-[#e8f2ed]"
                    />
                  ) : (
                    <p className="text-sm leading-7 text-[#bfd0c8]">
                      {resource.aiSummary}
                    </p>
                  )}
                </div>
              )}

              {editingResourceId === resource._id && (
                <div className="border-t border-[#2ff5a838] px-6 py-4">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#9fc0b2]">
                    Tags (comma separated)
                  </label>
                  <input
                    value={editForm.aiTagsText}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        aiTagsText: e.target.value,
                      }))
                    }
                    className="w-full rounded border border-white/20 bg-[#1f2925cc] px-3 py-2 text-sm text-[#e8f2ed]"
                  />
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#9fc0b2]">
                      Replace Attachment (optional)
                    </label>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          file: e.target.files?.[0] || null,
                        }))
                      }
                      className="block w-full text-xs text-[#bcd2c9]"
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="rounded bg-[#2ff5a8] px-3 py-1 text-xs font-semibold text-[#142019]"
                      onClick={() => {
                        void saveResourceEdit(resource._id);
                      }}
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      className="rounded border border-white/20 px-3 py-1 text-xs text-[#d8ebe3]"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {resource.dualityUrl && (
                <div className="border-t border-[#2ff5a838] px-6 py-4">
                  <a
                    href={resource.dualityUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#d8ebe3] transition hover:text-white"
                  >
                    <LinkIcon size={18} />
                    View Document
                  </a>
                </div>
              )}

              {resource.algorandTxId && (
                <div className="border border-[#2ff5a838] bg-linear-to-br from-[#2a3b34] to-[#24322d] px-6 py-4 text-[#8cf0c8]">
                  <div className="inline-flex items-center gap-2 text-sm">
                    <Link2 size={20} />
                    <p>Published on Algorand</p>
                  </div>
                </div>
              )}

              <div className="mt-auto border-t border-[#2ff5a838] bg-[#1f292580] px-6 py-5 text-right">
                <small className="text-xs text-[#9fc0b2]">
                  Uploaded: {new Date(resource.createdAt).toLocaleDateString()}
                </small>
              </div>

              <div className="border-t border-[#2ff5a838] px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  {canEdit && editingResourceId !== resource._id && (
                    <button
                      type="button"
                      className="rounded-md border border-[#2ff5a8] px-3 py-1 text-xs font-semibold text-[#d8ebe3] hover:bg-[#2ff5a81a]"
                      onClick={() => startEditResource(resource)}
                    >
                      Edit Resource
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-[#d8ebe3] hover:border-[#2ff5a8]"
                    onClick={() => {
                      void toggleHistory(resource._id);
                    }}
                  >
                    {openHistoryById[resource._id]
                      ? "Hide Timeline"
                      : "View Timeline"}
                  </button>
                </div>

                {openHistoryById[resource._id] && (
                  <div className="mt-3 space-y-2">
                    {historyLoadingById[resource._id] ? (
                      <p className="text-xs text-[#bcd2c9]">
                        Loading timeline...
                      </p>
                    ) : (historyById[resource._id] || []).length === 0 ? (
                      <p className="text-xs text-[#bcd2c9]">
                        No versions found.
                      </p>
                    ) : (
                      (historyById[resource._id] || []).map((version) => (
                        <div
                          key={`${resource._id}-v-${version.versionNumber}`}
                          className="rounded border border-white/10 bg-[#1f292580] p-2 text-xs text-[#d8ebe3]"
                        >
                          <p className="font-semibold">
                            v{version.versionNumber} - {version.action}
                          </p>
                          <p>
                            By {version.updatedByName || "System"} (
                            {version.updatedByRole || "SYSTEM"})
                          </p>
                          <p>{formatDateTime(version.updatedAt)}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyResources;
