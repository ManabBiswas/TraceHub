import React, { useState, useEffect } from "react";
import api from "../config/Api";
import { Link as LinkIcon, Link2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Resources = () => {
  const { user } = useAuth();
  const canEdit = user?.role === "PROFESSOR" || user?.role === "HOD";
  const [resources, setResources] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [openHistoryById, setOpenHistoryById] = useState({});
  const [historyById, setHistoryById] = useState({});
  const [historyLoadingById, setHistoryLoadingById] = useState({});
  const [editingResourceId, setEditingResourceId] = useState("");
  const [editForm, setEditForm] = useState({
    title: "",
    aiSummary: "",
    aiTagsText: "",
    file: null,
  });

  const formatDateTime = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString();
  };

  useEffect(() => {
    const loadClassrooms = async () => {
      try {
        const response = await api.classrooms.getAll();
        const nextClassrooms = response.classrooms || [];
        setClassrooms(nextClassrooms);
        if (nextClassrooms.length > 0) {
          setSelectedClassroomId(nextClassrooms[0]._id);
        }
      } catch (err) {
        setError("Failed to load classrooms");
      }
    };

    void loadClassrooms();
  }, []);

  useEffect(() => {
    if (!selectedClassroomId) {
      setResources([]);
      setLoading(false);
      return;
    }
    void fetchResources(selectedClassroomId);
  }, [selectedClassroomId, filter]);

  const fetchResources = async (classroomId) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.resources.getAll({ classroomId });
      if (data?.error) {
        setError(data.error);
        setResources([]);
        return;
      }
      let filtered = data;

      if (filter === "pending") {
        filtered = data.filter((r) => r.status === "pending");
      } else if (filter === "approved") {
        filtered = data.filter((r) => r.status === "approved");
      }

      setResources(filtered);
    } catch (err) {
      setError("Failed to load resources");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleHistory = async (resourceId) => {
    const isOpen = Boolean(openHistoryById[resourceId]);
    setOpenHistoryById((prev) => ({ ...prev, [resourceId]: !isOpen }));

    if (isOpen || historyById[resourceId]) {
      return;
    }

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

  const cancelEditResource = () => {
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

  const [message, setMessage] = useState("");

  return (
    <div className="mx-auto w-full max-w-360 rounded-2xl bg-[radial-gradient(640px_360px_at_22%_6%,rgba(47,245,168,0.23),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)] p-4 md:p-8">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#3f5148] pb-8">
        <h1 className="text-4xl font-bold text-slate-100 md:text-5xl">
          Resources
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedClassroomId}
            onChange={(e) => setSelectedClassroomId(e.target.value)}
            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-slate-100"
          >
            {classrooms.length === 0 && <option value="">No classrooms</option>}
            {classrooms.map((classroom) => (
              <option key={classroom._id} value={classroom._id}>
                {classroom.name}
              </option>
            ))}
          </select>
          <button
            className={`rounded-2xl border px-6 py-3 text-sm font-semibold transition ${
              filter === "all"
                ? "border-transparent bg-[#2ff5a8] text-[#142019]"
                : "border-white/20 bg-white/10 text-slate-100 hover:border-[#2ff5a8] hover:bg-white/20"
            }`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={`rounded-2xl border px-6 py-3 text-sm font-semibold transition ${
              filter === "approved"
                ? "border-transparent bg-[#2ff5a8] text-[#142019]"
                : "border-white/20 bg-white/10 text-slate-100 hover:border-[#2ff5a8] hover:bg-white/20"
            }`}
            onClick={() => setFilter("approved")}
          >
            Approved
          </button>
          <button
            className={`rounded-2xl border px-6 py-3 text-sm font-semibold transition ${
              filter === "pending"
                ? "border-transparent bg-[#2ff5a8] text-[#142019]"
                : "border-white/20 bg-white/10 text-slate-100 hover:border-[#2ff5a8] hover:bg-white/20"
            }`}
            onClick={() => setFilter("pending")}
          >
            Pending
          </button>
        </div>
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
          Loading resources...
        </div>
      ) : resources.length === 0 ? (
        <div className="py-16 text-center text-slate-300">
          <p>No resources found</p>
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
                    Uploader:
                  </strong>{" "}
                  {resource.uploaderName}
                </p>
                <p className="mb-3 text-sm text-[#bfd0c8]">
                  <strong className="font-semibold text-[#e8f2ed]">
                    Email:
                  </strong>{" "}
                  {resource.uploaderEmail}
                </p>
                {resource.userDepartment && (
                  <p className="text-sm text-[#bfd0c8]">
                    <strong className="font-semibold text-[#e8f2ed]">
                      Department:
                    </strong>{" "}
                    {resource.userDepartment}
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
                      value={editForm.aiSummary}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          aiSummary: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-white/20 bg-[#1f2925cc] px-3 py-2 text-sm text-[#e8f2ed]"
                      rows={3}
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
                      onClick={cancelEditResource}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {resource.aiTags && resource.aiTags.length > 0 && (
                <div className="border-t border-[#2ff5a838] px-6 py-4">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#9fc0b2]">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {resource.aiTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="rounded-md border border-[#2ff5a847] bg-linear-to-br from-[#2ff5a833] to-[#2ff5a81a] px-3 py-1 text-xs font-semibold text-[#e8f2ed]"
                      >
                        {tag}
                      </span>
                    ))}
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
                    <p>
                      <strong>Algorand TX:</strong>{" "}
                      {resource.algorandTxId.substring(0, 20)}...
                    </p>
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
                  <div className="mt-3 max-h-48 overflow-y-auto rounded border border-[#3f5148] bg-[#0f160f] p-2">
                    {historyLoadingById[resource._id] ? (
                      <p className="text-xs text-[#bcd2c9]">
                        Loading timeline...
                      </p>
                    ) : (historyById[resource._id] || []).length === 0 ? (
                      <p className="text-xs text-[#bcd2c9]">
                        No versions found.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {(historyById[resource._id] || []).map((version) => (
                          <div
                            key={`${resource._id}-v-${version.versionNumber}`}
                            className="rounded border border-white/10 bg-[#1f292580] p-2 text-xs text-[#d8ebe3]"
                          >
                            <p className="font-semibold">
                              v{version.versionNumber} - {version.action}
                            </p>
                            {version.title && (
                              <p className="mt-0.5 truncate text-[#cfe5da]">
                                Title: {version.title}
                              </p>
                            )}
                            {version.aiSummary && (
                              <p className="mt-0.5 line-clamp-1 text-[#bcd2c9]">
                                Summary: {version.aiSummary.substring(0, 80)}
                                {version.aiSummary.length > 80 ? "..." : ""}
                              </p>
                            )}
                            {version.aiTags && version.aiTags.length > 0 && (
                              <p className="mt-0.5 line-clamp-1 text-[#8cf0c8]">
                                Tags: {version.aiTags.slice(0, 3).join(", ")}
                                {version.aiTags.length > 3
                                  ? `+${version.aiTags.length - 3}`
                                  : ""}
                              </p>
                            )}
                            {version.dualityUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  window.open(version.dualityUrl, "_blank")
                                }
                                className="mt-0.5 truncate text-left text-[#a8e6c1] hover:text-[#2ff5a8] hover:underline cursor-pointer"
                              >
                                📄 File:{" "}
                                {version.dualityUrl.split("/").pop() ||
                                  "Document"}
                              </button>
                            )}
                            <div className="mt-1 flex items-center justify-between text-[#8cf0c8]">
                              <span className="truncate text-xs">
                                {version.updatedByName || "System"}
                              </span>
                              {version.algorandTxId && (
                                <span className="text-xs">
                                  ✓ {version.algorandTxId.substring(0, 8)}...
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
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

export default Resources;
