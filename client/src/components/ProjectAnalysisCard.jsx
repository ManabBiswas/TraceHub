import { useEffect, useState } from "react";

/**
 * ProjectAnalysisCard - Display AI analysis results for professors
 * Shows metadata, similarity report, and risk assessment
 */
export function ProjectAnalysisCard({
  classroomId,
  postId,
  submissionId,
  token,
}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(
          `/api/classrooms/${classroomId}/posts/${postId}/project-submissions/${submissionId}/analysis`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        setReport(data);
      } catch (err) {
        console.error("Failed to fetch analysis report:", err);
        setReport({ status: "ERROR" });
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [submissionId, classroomId, postId, token]);

  if (loading) {
    return (
      <div className="rounded border border-[#2ff5a838] bg-[#0f1613d9] p-4 mt-4">
        <p className="text-sm text-[#bcd2c9]">Loading AI analysis...</p>
      </div>
    );
  }

  if (report?.status === "NOT_STARTED") {
    return (
      <div className="rounded border border-gray-500/30 bg-gray-500/10 p-4 mt-4">
        <p className="text-sm text-gray-300">
          AI analysis has not started yet. Refresh when the submission is finalized.
        </p>
      </div>
    );
  }

  if (report?.status === "PROCESSING") {
    return (
      <div className="rounded border border-amber-500/30 bg-amber-500/10 p-4 mt-4">
        <p className="text-sm text-amber-300">
          ⏳ AI analysis is running. Refresh in a moment...
        </p>
      </div>
    );
  }

  if (report?.status === "FAILED") {
    return (
      <div className="rounded border border-red-500/30 bg-red-500/10 p-4 mt-4">
        <p className="text-sm text-red-300">
          ⚠️ AI analysis failed. Review the submission manually.
        </p>
      </div>
    );
  }

  if (!report?.metadata) return null;

  const { metadata, riskLevel } = report;

  const riskColor =
    riskLevel === "HIGH"
      ? "border-red-500/50 bg-red-500/10 text-red-300"
      : riskLevel === "MEDIUM"
      ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
      : "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";

//   const riskBgColor =
//     riskLevel === "HIGH"
//       ? "bg-red-500/20"
//       : riskLevel === "MEDIUM"
//       ? "bg-amber-500/20"
//       : "bg-emerald-500/20";

  return (
    <div className="rounded border border-[#2ff5a838] bg-[#0f1613d9] p-4 mt-4 space-y-4">
      <h3 className="font-semibold text-[#e8f2ed]">📊 AI Analysis Report</h3>

      {/* Risk Banner */}
      <div
        className={`rounded border px-4 py-2 text-sm font-semibold ${riskColor}`}
      >
        🔍 Similarity Risk: <span className="font-bold">{riskLevel}</span>
        {riskLevel === "HIGH" &&
          " — Review the similarity report carefully before approving"}
      </div>

      {/* Project Metadata Card */}
      <div className="rounded border border-white/10 bg-[#1f292580] p-3 space-y-2">
        <p className="text-sm font-semibold text-[#e8f2ed]">
          {metadata.projectTitle || "Project"}
        </p>
        <p className="text-xs text-[#bcd2c9]">
          {metadata.oneLiner || metadata.summary || "No description available"}
        </p>

        {/* Tech Stack Tags */}
        {metadata.techStack && metadata.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {metadata.techStack.slice(0, 8).map((tech, i) => (
              <span
                key={i}
                className="rounded-full border border-[#2ff5a847] bg-[#2ff5a81a] px-2 py-0.5 text-xs text-[#8cf0c8]"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        {/* Code Metrics */}
        {metadata.codeComplexitySignals && (
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-[#bcd2c9] border-t border-white/10 pt-2">
            {metadata.codeComplexitySignals.primaryLanguage && (
              <p>
                Language:{" "}
                <span className="text-[#d8ebe3]">
                  {metadata.codeComplexitySignals.primaryLanguage}
                </span>
              </p>
            )}
            {metadata.architecture && (
              <p>
                Architecture:{" "}
                <span className="text-[#d8ebe3]">{metadata.architecture}</span>
              </p>
            )}
            <p>
              Tests:{" "}
              <span
                className={
                  metadata.codeComplexitySignals.hasTests
                    ? "text-emerald-400"
                    : "text-red-400"
                }
              >
                {metadata.codeComplexitySignals.hasTests ? "✓" : "✗"}
              </span>
            </p>
            <p>
              Docker:{" "}
              <span
                className={
                  metadata.codeComplexitySignals.hasDockerfile
                    ? "text-emerald-400"
                    : "text-[#bcd2c9]"
                }
              >
                {metadata.codeComplexitySignals.hasDockerfile ? "✓" : "✗"}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Similarity Report */}
      {metadata.similarityReport && metadata.similarityReport.length > 0 && (
        <div className="space-y-2 border-t border-white/20 pt-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9fc0b2]">
            🔗 Similar Projects Found
          </p>
          {metadata.similarityReport.map((item, i) => {
            const verdictColor =
              item.verdict === "IDENTICAL"
                ? "border-red-500/50 bg-red-500/10"
                : item.verdict === "VERY_SIMILAR"
                ? "border-amber-500/50 bg-amber-500/10"
                : "border-white/10 bg-[#1f292580]";

            const badgeColor =
              item.verdict === "IDENTICAL"
                ? "bg-red-600 text-white"
                : item.verdict === "VERY_SIMILAR"
                ? "bg-amber-600 text-[#142019]"
                : "bg-[#2ff5a8] text-[#142019]";

            return (
              <div
                key={i}
                className={`rounded border p-3 text-xs space-y-1 ${verdictColor}`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[#e8f2ed]">
                    {item.projectTitle}
                  </p>
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${badgeColor}`}>
                    {item.verdict}
                  </span>
                </div>
                <p className="text-[#bcd2c9]">
                  Student: {item.studentName} |{" "}
                  <span
                    className={
                      item.verdict === "IDENTICAL"
                        ? "font-bold text-red-300"
                        : "text-[#8cf0c8]"
                    }
                  >
                    Similarity: {Math.round((item.similarityScore || 0) * 100)}%
                  </span>
                </p>
                {item.techStack && item.techStack.length > 0 && (
                  <p className="text-[#9fc0b2]">
                    Tech: {item.techStack.slice(0, 3).join(", ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No Similar Projects Found */}
      {(!metadata.similarityReport ||
        metadata.similarityReport.length === 0) && (
        <p className="text-xs text-emerald-400 border-t border-white/20 pt-3">
          ✓ No similar projects detected. This appears to be original work.
        </p>
      )}

      {/* Risk Factors */}
      {metadata.riskFactors && metadata.riskFactors.length > 0 && (
        <div className="space-y-1 border-t border-white/20 pt-3">
          <p className="text-xs font-semibold text-[#f5a8a8]">⚠️ Risk Factors:</p>
          {metadata.riskFactors.map((factor, i) => (
            <p key={i} className="text-xs text-[#e8bdc0]">
              • {factor}
            </p>
          ))}
        </div>
      )}

      {/* Analysis Timestamp */}
      {metadata.analyzedAt && (
        <p className="text-xs text-[#7aa59d] border-t border-white/20 pt-2">
          Analyzed: {new Date(metadata.analyzedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
