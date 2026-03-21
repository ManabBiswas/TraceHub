TraceHub Classroom API (Google Classroom style)

Auth

- POST /api/auth/register
- POST /api/auth/login

Classrooms

- GET /api/classrooms (Data fetch classrooms for current user)
- POST /api/classrooms (Create classroom - PROFESSOR/HOD)
- POST /api/classrooms/join (Join classroom using joinCode)

Classroom Posts

- GET /api/classrooms/:classroomId/posts (Classrooms posts fetch)
- POST /api/classrooms/:classroomId/posts (Create post - PROFESSOR/HOD)
- PATCH /api/classrooms/:classroomId/posts/:postId (Update posts - PROFESSOR/HOD)

Submissions

- POST /api/classrooms/:classroomId/posts/:postId/submissions/link (Link submission - STUDENT)
- PATCH /api/classrooms/:classroomId/posts/:postId/submissions/:submissionId (Update submission - PROFESSOR/HOD)
