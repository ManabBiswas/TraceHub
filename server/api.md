TraceHub Classroom API (Google Classroom style)

Auth

- POST /api/auth/register
- POST /api/auth/register-teacher
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/renew-subscription

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
- POST /api/classrooms/:classroomId/posts/:postId/submissions (File/link/text submission - STUDENT)
- GET /api/classrooms/:classroomId/posts/:postId/submissions (Teacher view for grading)
- GET /api/classrooms/:classroomId/posts/:postId/submissions/:submissionId/files/:fileIndex (Teacher downloads submitted file)
- PATCH /api/classrooms/:classroomId/posts/:postId/submissions/:submissionId (Update submission - PROFESSOR/HOD)
