# TraceHub Frontend

An interactive React-based frontend for the TraceHub application - a secure platform for publishing and verifying academic resources with blockchain proof.

## Features

- **User Authentication**: Register and login with role-based access (Student, Professor, HOD)
- **Resource Management**: Browse and manage academic resources
- **Document Upload**: Professors can upload and publish documents (PDF)
- **AI Analysis**: Automatic document analysis with AI-generated summaries and tags
- **Blockchain Integration**: Publication proof on Algorand blockchain
- **Approval Workflow**: Student submissions go through professor verification
- **Secure Storage**: Documents stored on Duality platform

## Project Structure

```
src/
├── pages/
│   ├── Landing.jsx          # Landing page for unauthenticated users
│   ├── Login.jsx            # User login
│   ├── Register.jsx         # New user registration
│   ├── Dashboard.jsx        # Main dashboard with navigation cards
│   ├── Resources.jsx        # Browse all resources
│   ├── MyResources.jsx      # User's uploaded resources
│   ├── Upload.jsx           # Document upload (Professors/HODs)
│   ├── Pending.jsx          # Pending resource approvals
│   └── Profile.jsx          # User profile and settings
├── components/
│   ├── Navigation.jsx       # Main navigation bar
│   └── ProtectedRoute.jsx   # Route protection wrapper
├── context/
│   └── AuthContext.jsx      # Authentication context & hooks
├── config/
│   └── Api.jsx              # API service layer
├── styles/
│   ├── Auth.css             # Login/Register styles
│   ├── Landing.css          # Landing page styles
│   ├── Navigation.css       # Navigation bar styles
│   ├── Pages.css            # Dashboard styles
│   ├── Resources.css        # Resources page styles
│   ├── Upload.css           # Upload page styles
│   ├── Pending.css          # Pending resources styles
│   └── Profile.css          # Profile page styles
├── App.jsx                  # Main app with routing
├── App.css                  # Global styles
├── index.css                # Tailwind CSS import
└── main.jsx                 # React DOM entry point
```

## Installation

1. Install dependencies:
```bash
cd client
npm install
```

2. Create a `.env` file in the client directory:
```env
VITE_API_URL=http://localhost:3000/api
```

## Running the Application

Development mode:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## How to Use

### 1. **Landing Page**
- First-time visitors see an overview of TraceHub
- Links to Login and Register

### 2. **Authentication**
- **Register**: New users create account with name, email, password
- **Login**: Existing users authenticate
- All users default to STUDENT role (Professors/HODs need backend configuration)

### 3. **Dashboard**
- Central hub showing available features
- Quick access to Resources, Upload (for Professors), Pending Approvals, Profile
- Different options based on user role

### 4. **Resources Page**
- Browse all published resources
- Filter by: All, Approved, Pending
- View document summaries, tags, and AI analysis
- Access documents via Duality links
- View Algorand blockchain proof

### 5. **Upload Document** (Professors/HODs)
- Select PDF file
- Enter document title
- Document is:
  - Analyzed by AI for summary & tags
  - Stored on Duality platform
  - Minted on Algorand blockchain
  - Auto-approved (professor privilege)

### 6. **Pending Approvals** (Professors/HODs)
- View student-submitted resources
- Review AI summaries and tags
- Approve with passcode
- Reject submissions if needed

### 7. **My Resources**
- View all resources you've uploaded
- Track approval status
- Access published documents

### 8. **Profile**
- View account information
- See your role and permissions
- View managed departments (for HODs)

## API Integration

All API calls go through `src/config/Api.jsx`:

```javascript
// Authentication
api.auth.register(email, password, name)
api.auth.login(email, password)
api.auth.getMe()
api.auth.logout()

// Resources
api.resources.getAll(userId)
api.resources.getById(id)

// Upload
api.upload.uploadFile(file, title)

// Pending
api.pending.getAll()
api.pending.approve(resourceId, passcode)
api.pending.reject(resourceId, passcode)
```

## Authentication Context

The `useAuth()` hook provides:
```javascript
const {
  user,                  // Current user object
  token,                 // JWT token
  loading,               // Loading state
  error,                 // Error message
  register,              // Register function
  login,                 // Login function
  logout,                // Logout function
  isAuthenticated,       // Boolean
  isAdmin,               // Boolean (HOD role)
  isProfessor,           // Boolean
  isStudent              // Boolean
} = useAuth();
```

## Styling

The application uses:
- **CSS Grid/Flexbox** for layouts
- **CSS Variables** for consistent theming
- **Responsive design** for mobile compatibility
- **Smooth transitions** and hover effects

### Color Scheme
- Primary: `#6366f1` (Indigo)
- Success: `#10b981` (Green)
- Danger: `#ef4444` (Red)
- Warning: `#f59e0b` (Amber)

## Responsive Design

All pages are mobile-friendly with breakpoints at:
- 768px (Tablet)
- 512px (Mobile)

## Features by User Role

### Student
✓ View all resources
✓ View pending submissions
✓ View their own resources
✓ Access profile

### Professor
✓ All Student features
✓ Upload documents (auto-approved)
✓ Approve/Reject pending resources
✓ Access profile

### HOD (Head of Department)
✓ All Professor features
✓ Manage department(s)
✓ Full administrative access

## Error Handling

- API errors are caught and displayed to users
- Network errors show appropriate messages
- Form validation with user-friendly feedback
- Protected routes redirect unauthenticated users to login

## Future Enhancements

- [ ] Document search and filtering
- [ ] User notifications
- [ ] Advanced analytics dashboard
- [ ] PDF preview in browser
- [ ] Comments and discussions
- [ ] Social sharing
- [ ] Email notifications
- [ ] File versioning

## Troubleshooting

### "Cannot connect to API"
- Ensure backend server is running on `http://localhost:3000`
- Check `.env` file has correct `VITE_API_URL`

### "Login not working"
- Verify user exists in database
- Check password is at least 8 characters
- Review browser console for detailed errors

### "Upload fails"
- Ensure file is valid PDF
- Check file size (if limit exists)
- Verify you have Professor/HOD role

## Development Notes

- Uses React 19.2.4
- React Router v6 for navigation
- Context API for state management
- No external UI library (custom CSS)
- Fetch API for HTTP requests
- LocalStorage for token persistence

## Support

For issues or questions, refer to the backend API documentation or contact the development team.
