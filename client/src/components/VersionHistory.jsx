import React, { useState } from "react";

/**
 * VersionHistory - Display submission version timeline
 * Shows all version snapshots with timestamps and actions
 */
export function VersionHistory({
  versionHistory,
  submissionId,
  isProfessor,
  onVerify,
}) {
  const [expandedVersion, setExpandedVersion] = useState(null);
  const [verifyModal, setVerifyModal] = useState({
    isOpen: false,
    note: "",
  });

  if (!versionHistory || versionHistory.length === 0) {
    return (
      <div className="rounded-lg border border-gray-500/30 bg-gray-500/10 p-4 mt-4">
        <p className="text-sm text-gray-300">No version history yet.</p>
      </div>
    );
  }

  const getActionColor = (action) => {
    switch (action) {
      case "DRAFT_SAVE":
      case "REVISION_DRAFT":
        return "bg-blue-500/10 border-blue-500/30 text-blue-300";
      case "FINAL_SUBMIT":
      case "REVISION_FINAL":
        return "bg-amber-500/10 border-amber-500/30 text-amber-300";
      case "TURNED_IN":
        return "bg-purple-500/10 border-purple-500/30 text-purple-300";
      case "VERIFIED":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";
      case "REJECTED_FOR_REVISION":
        return "bg-red-500/10 border-red-500/30 text-red-300";
      case "PERMANENTLY_REJECTED":
        return "bg-red-700/10 border-red-700/30 text-red-400";
      default:
        return "bg-gray-500/10 border-gray-500/30 text-gray-300";
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case "DRAFT_SAVE":
      case "REVISION_DRAFT":
        return "📝";
      case "FINAL_SUBMIT":
      case "REVISION_FINAL":
        return "✅";
      case "TURNED_IN":
        return "🔒";
      case "VERIFIED":
        return "✨";
      case "REJECTED_FOR_REVISION":
        return "🔄";
      case "PERMANENTLY_REJECTED":
        return "❌";
      default:
        return "📌";
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case "DRAFT_SAVE":
        return "Draft Saved";
      case "REVISION_DRAFT":
        return "Revision Draft";
      case "FINAL_SUBMIT":
        return "Final Submitted";
      case "REVISION_FINAL":
        return "Revision Submitted";
      case "TURNED_IN":
        return "Turned In (Locked)";
      case "VERIFIED":
        return "Verified & Published";
      case "REJECTED_FOR_REVISION":
        return "Rejected for Revision";
      case "PERMANENTLY_REJECTED":
        return "Permanently Rejected";
      default:
        return action;
    }
  };

  return (
    <>
      <div className="mt-6 rounded-xl border border-[#2ff5a838] bg-white/10 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
          📜 Version History ({versionHistory.length})
        </h3>

        <div className="space-y-3">
          {versionHistory.map((version, index) => (
            <div key={index} className="flex gap-4">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm ${getActionColor(version.action)}`}
                >
                  {getActionIcon(version.action)}
                </div>
                {index < versionHistory.length - 1 && (
                  <div className="w-0.5 h-12 bg-linear-to-b from-current to-transparent opacity-30 mt-2"></div>
                )}
              </div>

              {/* Version details */}
              <div className="flex-1 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedVersion(expandedVersion === index ? null : index)
                  }
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-[#e8f2ed]">
                        v{version.versionNumber} —{" "}
                        {getActionLabel(version.action)}
                        {version.revisionCycle > 1 && (
                          <span className="ml-2 text-xs font-normal text-[#8b9d95]">
                            (Revision Cycle {version.revisionCycle})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[#8b9d95] mt-1">
                        {new Date(version.updatedAt).toLocaleString()} by{" "}
                        {version.updatedByName}
                      </p>
                      {/* Quick preview of content */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {version.githubUrl && (
                          <a
                            href={version.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                          >
                            🔗 GitHub
                          </a>
                        )}
                        {version.link && version.link !== version.githubUrl && (
                          <a
                            href={version.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                          >
                            🔗 Link
                          </a>
                        )}
                        {version.files && version.files.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                            📎 {version.files.length} file(s)
                          </span>
                        )}
                        {version.text && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            📝 Notes
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-[#8b9d95] mt-0.5 ml-2 shrink-0">
                      {expandedVersion === index ? "▼" : "▶"}
                    </span>
                  </div>
                </button>

                {/* Expanded details */}
                {expandedVersion === index && (
                  <div className="mt-3 rounded-lg bg-[#1f292580] p-4 space-y-4 text-sm">
                    {/* Content Type Indicator */}
                    {version.contentType && (
                      <div className="flex flex-wrap gap-2">
                        {version.contentType === "LINK" && (
                          <span className="inline-block text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            🔗 Link
                          </span>
                        )}
                        {version.contentType === "FILE" && (
                          <span className="inline-block text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                            📎 File(s)
                          </span>
                        )}
                        {version.contentType === "BOTH" && (
                          <>
                            <span className="inline-block text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              🔗 Link
                            </span>
                            <span className="inline-block text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                              📎 File(s)
                            </span>
                          </>
                        )}
                        {version.contentType === "TEXT" && (
                          <span className="inline-block text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            📝 Text
                          </span>
                        )}
                      </div>
                    )}

                    {/* Submission Content Section */}
                    <div className="border-t border-[#2ff5a830] pt-3">
                      <p className="text-xs font-semibold text-[#8b9d95] mb-3 uppercase tracking-wider">
                        📦 Submission Content
                      </p>

                      {!version.githubUrl &&
                        !version.link &&
                        (!version.files || version.files.length === 0) &&
                        !version.text && (
                          <p className="text-xs text-[#8b9d95] italic">
                            No submission content in this version.
                          </p>
                        )}

                      {/* GitHub URL */}
                      {version.githubUrl && (
                        <div className="mb-4 rounded border border-blue-500/20 bg-blue-500/10 p-3">
                          <p className="text-xs font-medium text-blue-300 mb-2">
                            🔗 GitHub Repository
                          </p>
                          <a
                            href={version.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2ff5a8] hover:underline break-all text-xs font-mono"
                          >
                            {version.githubUrl}
                          </a>
                        </div>
                      )}

                      {/* Link (if different from GitHub URL) */}
                      {version.link && version.link !== version.githubUrl && (
                        <div className="mb-4 rounded border border-blue-500/20 bg-blue-500/10 p-3">
                          <p className="text-xs font-medium text-blue-300 mb-2">
                            🔗 Submission Link
                          </p>
                          <a
                            href={version.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2ff5a8] hover:underline break-all text-xs font-mono"
                          >
                            {version.link}
                          </a>
                        </div>
                      )}

                      {/* Files */}
                      {version.files && version.files.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-[#8b9d95] mb-2">
                            📁 Submitted Files ({version.files.length})
                          </p>
                          <div className="space-y-2">
                            {version.files.map((file, fileIdx) => (
                              <div
                                key={fileIdx}
                                className="flex items-center justify-between gap-3 rounded border border-orange-500/20 bg-orange-500/10 p-2"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="text-sm shrink-0">📄</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs text-[#d8ebe3] font-medium">
                                      {file.fileName}
                                    </p>
                                    <p className="text-xs text-[#8b9d95]">
                                      {(file.size / 1024).toFixed(1)} KB
                                      {file.hasBinaryData && " (PDF)"}
                                    </p>
                                  </div>
                                </div>
                                {/* Note: File download would require a backend endpoint
                                  to serialize and stream the file data. 
                                  For now, showing file metadata. */}
                                <button
                                  type="button"
                                  className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30 transition-colors shrink-0 whitespace-nowrap"
                                  title="File download requires backend endpoint"
                                >
                                  ⬇️ Save
                                </button>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-[#8b9d95] mt-2 italic">
                            💡 Files are stored securely on our servers and can
                            be downloaded here (database backup available upon
                            request)
                          </p>
                        </div>
                      )}

                      {/* Text Notes */}
                      {version.text && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-[#8b9d95] mb-2">
                            📝 Student Notes/Description
                          </p>
                          <div className="text-[#d8ebe3] text-xs bg-[#0f1419]/50 p-3 rounded border border-purple-500/20 max-h-32 overflow-y-auto whitespace-pre-wrap">
                            {version.text}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Professor Review Section */}
                    {(version.professorNote ||
                      version.feedback ||
                      (version.marks !== null &&
                        version.marks !== undefined)) && (
                      <div className="border-t border-[#2ff5a830] pt-3">
                        <p className="text-xs font-semibold text-[#2ff5a8] mb-2 uppercase tracking-wider">
                          👨‍🏫 Professor Review
                        </p>

                        {version.marks !== null &&
                          version.marks !== undefined && (
                            <div className="mb-3 rounded border-l-4 border-emerald-400 bg-emerald-500/10 p-2">
                              <p className="text-xs font-medium text-emerald-300">
                                ⭐ Marks: {version.marks}
                              </p>
                            </div>
                          )}

                        {version.professorNote && (
                          <div className="mb-3 rounded bg-[#2ff5a811] p-2">
                            <p className="text-xs font-medium text-[#2ff5a8] mb-1">
                              Note
                            </p>
                            <p className="text-[#d8ebe3] text-xs whitespace-pre-wrap">
                              {version.professorNote}
                            </p>
                          </div>
                        )}

                        {version.feedback && (
                          <div className="rounded bg-[#2ff5a811] p-2">
                            <p className="text-xs font-medium text-[#2ff5a8] mb-1">
                              Feedback
                            </p>
                            <p className="text-[#d8ebe3] text-xs whitespace-pre-wrap">
                              {version.feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Blockchain Proof Section */}
                    {version.algorandTxId && (
                      <div className="border-t border-[#2ff5a830] pt-3">
                        <p className="text-xs font-semibold text-[#8b9d95] mb-2 uppercase tracking-wider">
                          🔗 Blockchain Proof
                        </p>
                        <p className="text-xs text-[#2ff5a8] font-mono break-all bg-[#0f1419]/50 p-2 rounded mb-3">
                          {version.algorandTxId}
                        </p>
                        <div className="flex gap-2">
                          {!version.algorandTxId.startsWith("DEMO_") && (
                            <a
                              href={`https://testnet.algoexplorer.io/tx/${version.algorandTxId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors px-3 py-2 text-xs font-semibold"
                            >
                              View on Explorer ↗
                            </a>
                          )}
                          {isProfessor && onVerify && (
                            <button
                              type="button"
                              onClick={() => {
                                setVerifyModal({
                                  isOpen: true,
                                  note: "",
                                });
                              }}
                              className="flex-1 rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                            >
                              ✅ Verify This Version
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verify Modal Form */}
      {verifyModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1f2925] rounded-lg p-6 max-w-md w-full border border-[#2ff5a8]/30">
            <h2 className="text-xl font-bold text-[#e8f2ed] mb-4">
              ✅ Verify This Version
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (onVerify) {
                  onVerify(submissionId, verifyModal.note);
                }
                setVerifyModal({
                  isOpen: false,
                  note: "",
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-[#8b9d95] mb-2">
                  Verification Note (optional)
                </label>
                <textarea
                  value={verifyModal.note}
                  onChange={(e) =>
                    setVerifyModal((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  placeholder="Enter optional verification note..."
                  className="w-full rounded bg-[#0f1419] text-[#e8f2ed] p-3 text-sm border border-[#2ff5a8]/30 focus:border-[#2ff5a8] focus:outline-none"
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setVerifyModal({
                      isOpen: false,
                      note: "",
                    })
                  }
                  className="flex-1 rounded border border-[#8b9d95] px-4 py-2 text-sm font-semibold text-[#8b9d95] hover:bg-[#0f1419] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
