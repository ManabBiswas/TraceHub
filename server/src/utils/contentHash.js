import crypto from "crypto";

/**
 * Produces a deterministic SHA-256 fingerprint of a resource submission.
 * This hash is what gets written to the Algorand blockchain.
 * If ANY of these fields change in MongoDB, the hash will not match.
 */
function hashResource(resource) {
    const canonical = {
        // Resource identity and core data
        title: resource.title || "",
        uploaderEmail: resource.uploaderEmail || "",
        role: resource.role || "Student",

        // The actual work being submitted
        githubUrl: resource.githubUrl || "",

        // AI-extracted metadata at time of approval
        // If someone later changes these in MongoDB, hash breaks
        aiSummary: resource.aiSummary || "",
        aiTags: [...(resource.aiTags || [])].sort().join(","),
        techStack: [...(resource.techStack || [])].sort().join(","),
        originalityScore: Number(resource.originalityScore) || 0,

        // Classroom context
        classroomId: resource.classroomId ? String(resource.classroomId) : "no-classroom",
        userId: resource.userId ? String(resource.userId) : "anonymous",
    };

    // JSON.stringify with sorted keys for determinism
    const canonicalString = JSON.stringify(canonical, Object.keys(canonical).sort());

    return crypto
        .createHash("sha256")
        .update(canonicalString)
        .digest("hex");
}

/**
 * Hashes a project submission with its metadata.
 * Includes both the submission data and any extracted metadata.
 */
function hashProjectSubmission(submission, metadata = {}) {
    const canonical = {
        // Student identity
        studentId: submission.studentId ? String(submission.studentId) : "",

        // The actual work being verified
        githubUrl: submission.githubUrl || "",
        contentType: submission.contentType || "LINK",

        // PDF report — hash the actual file bytes if present
        // This means if someone swaps the PDF in MongoDB, hash breaks
        pdfHash: submission.files?.[0]?.data
            ? crypto
                .createHash("sha256")
                .update(submission.files[0].data)
                .digest("hex")
            : "no-pdf",

        // AI-extracted metadata at time of verification
        // If someone later changes the techStack in MongoDB, hash breaks
        techStack: [...(metadata.techStack || [])].sort().join(","),
        projectTitle: metadata.projectTitle || submission.title || "",
        architecture: metadata.architecture || "",

        // Post context
        postId: submission.postId ? String(submission.postId) : "",
        classroomId: submission.classroomId ? String(submission.classroomId) : "",

        // Submission details at verification time
        link: submission.link || "",
        text: submission.text || "",
    };

    // JSON.stringify with sorted keys for determinism
    const canonicalString = JSON.stringify(canonical, Object.keys(canonical).sort());

    return crypto
        .createHash("sha256")
        .update(canonicalString)
        .digest("hex");
}

export { hashResource, hashProjectSubmission };
