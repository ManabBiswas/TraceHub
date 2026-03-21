# TraceHub Route Reference

This file documents what each backend route does.

## Base and Health

- `GET /`
  - Returns a basic API running message.
- `GET /health`
  - Returns API health status with timestamp.

## Auth Routes (`/api/auth`)

- `POST /api/auth/register`
  - Register a new user account.
- `POST /api/auth/login`
  - Login user and return JWT token.

> Additional auth handlers exist in the auth controller but are currently commented out in route wiring.

## Resource Routes (`/api/resources`)

- `GET /api/resources`
  - Fetch all resources.
  - Optional query: `userId` to filter by uploader user.
- `GET /api/resources/:id`
  - Fetch one resource by MongoDB id.

## Upload Routes (`/api/upload`)

- `POST /api/upload`
  - Upload PDF resource.
  - Requires authenticated user with PROFESSOR or HOD role.
  - Runs text extraction, AI analysis, Duality upload, and Algorand minting.
- `POST /api/upload/github`
  - Submit GitHub project README for AI analysis.
  - Stores as pending resource for approval.

## Pending Approval Routes (`/api/pending`)

- `GET /api/pending`
  - List all pending resources.
- `POST /api/pending/approve/:resourceId`
  - Approve a pending resource using passcode.
  - Uploads metadata to Duality and mints blockchain proof.
- `DELETE /api/pending/:resourceId`
  - Reject and delete pending resource using passcode.

## Classroom Routes (`/api/classrooms`)

- `GET /api/classrooms`
  - Fetch classrooms where current user is owner, teacher, or student.
  - Requires authentication.
- `POST /api/classrooms`
  - Create classroom.
  - Requires authentication and role PROFESSOR or HOD.
- `POST /api/classrooms/join`
  - Join classroom by join code.
  - Requires authentication.

### Classroom Posts

- `GET /api/classrooms/:classroomId/posts`
  - Fetch posts for a classroom.
  - Requires classroom membership and authentication.
- `POST /api/classrooms/:classroomId/posts`
  - Create announcement/assignment post.
  - Requires authentication and role PROFESSOR or HOD.
- `PATCH /api/classrooms/:classroomId/posts/:postId`
  - Update a classroom post.
  - Requires authentication and role PROFESSOR or HOD.

### Submissions

- `POST /api/classrooms/:classroomId/posts/:postId/submissions/link`
  - Submit assignment using a link.
  - Requires authentication and STUDENT role.
- `PATCH /api/classrooms/:classroomId/posts/:postId/submissions/:submissionId`
  - Update submission status/marks/feedback.
  - Requires authentication and role PROFESSOR or HOD.
