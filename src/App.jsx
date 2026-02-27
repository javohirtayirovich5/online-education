import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoadingSpinner from './components/common/LoadingSpinner';

// Layout Components (always loaded - used on every page)
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import PrivateRoute from './components/auth/PrivateRoute';

// Auth Components (lazy loaded - only needed on auth pages)
const Login = lazy(() => import('./components/auth/Login'));
const Register = lazy(() => import('./components/auth/Register'));
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword'));

// Public Pages (lazy loaded)
const Landing = lazy(() => import('./pages/Landing'));
const AboutWrapper = lazy(() => import('./pages/AboutWrapper'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));

// Pages (lazy loaded)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MyLessons = lazy(() => import('./pages/MyLessons'));
const LessonDetail = lazy(() => import('./pages/LessonDetail'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const Assignments = lazy(() => import('./pages/Assignments'));
const Grades = lazy(() => import('./pages/Grades'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));

// Admin Pages (lazy loaded)
const Users = lazy(() => import('./pages/admin/Users'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const Structure = lazy(() => import('./pages/admin/Structure'));
const GroupDetail = lazy(() => import('./pages/admin/GroupDetail'));
const AdminTests = lazy(() => import('./pages/admin/AdminTests'));
const AdminResources = lazy(() => import('./pages/admin/AdminResources'));

// Teacher Pages (lazy loaded)
const TeacherAttendance = lazy(() => import('./pages/teacher/TeacherAttendance'));
const TeacherGroupGrades = lazy(() => import('./pages/teacher/TeacherGroupGrades'));
const TeacherResources = lazy(() => import('./pages/teacher/TeacherResources'));
const TeacherTests = lazy(() => import('./pages/teacher/TeacherTests'));
const LiveSessions = lazy(() => import('./pages/LiveSessions'));

// Student Pages (lazy loaded)
const StudentSubjects = lazy(() => import('./pages/student/StudentSubjects'));
const TimeTable = lazy(() => import('./pages/student/TimeTable'));
const StudentResources = lazy(() => import('./pages/student/StudentResources'));
const StudentTests = lazy(() => import('./pages/student/StudentTests'));
const TakeTest = lazy(() => import('./pages/student/TakeTest'));
const Library = lazy(() => import('./pages/Library'));
const BookReader = lazy(() => import('./pages/BookReader'));

import './App.css';

function AppLayout() {
  // localStorage'dan sidebar holatini olish
  const getInitialSidebarState = () => {
    const saved = localStorage.getItem('sidebarOpen');
    if (saved !== null) {
      return saved === 'true';
    }
    // Agar saqlanmagan bo'lsa, katta ekranlarda ochiq, kichik ekranlarda yopiq
    return window.innerWidth > 1024;
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(getInitialSidebarState);

  useEffect(() => {
    const handleResize = () => {
      // Kichik ekranlarda har doim yopiq
      if (window.innerWidth <= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    localStorage.setItem('sidebarOpen', newState.toString());
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    localStorage.setItem('sidebarOpen', 'false');
  };

  return (
    <div className="app">
      <Navbar toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <Sidebar isOpen={isSidebarOpen} closeSidebar={closeSidebar} />
      <main className={`app-main ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// Public Layout (Navbar va Sidebar bilan, lekin proteksiya qilinmagan)
function PublicLayout() {
  const getInitialSidebarState = () => {
    const saved = localStorage.getItem('sidebarOpen');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.innerWidth > 1024;
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(getInitialSidebarState);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    localStorage.setItem('sidebarOpen', newState.toString());
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    localStorage.setItem('sidebarOpen', 'false');
  };

  return (
    <div className="app">
      <Navbar toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <Sidebar isOpen={isSidebarOpen} closeSidebar={closeSidebar} />
      <main className={`app-main ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// Google OAuth Client ID - Environment variable or default
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Lazy Route Wrapper Component
const LazyRoute = ({ children }) => (
  <Suspense fallback={
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '60vh',
      width: '100%'
    }}>
      <LoadingSpinner size="large" />
    </div>
  }>
    {children}
  </Suspense>
);

// 404 Redirect Component
const NotFoundRedirect = () => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return null;
  }
  
  return <Navigate to={currentUser ? "/dashboard" : "/"} replace />;
};

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <LanguageProvider>
          <ThemeProvider>
            <AuthProvider>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LazyRoute><Landing /></LazyRoute>} />
                <Route path="/login" element={<LazyRoute><Login /></LazyRoute>} />
                <Route path="/register" element={<LazyRoute><Register /></LazyRoute>} />
                <Route path="/forgot-password" element={<LazyRoute><ForgotPassword /></LazyRoute>} />
                <Route path="/privacy-policy" element={<LazyRoute><PrivacyPolicy /></LazyRoute>} />
                <Route path="/terms-of-service" element={<LazyRoute><TermsOfService /></LazyRoute>} />
                <Route path="/about" element={<LazyRoute><AboutWrapper /></LazyRoute>} />

                {/* Protected Routes with Layout */}
                <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
                  <Route path="/dashboard" element={<LazyRoute><Dashboard /></LazyRoute>} />
                  <Route path="/profile" element={<LazyRoute><Profile /></LazyRoute>} />
                  <Route path="/settings" element={<LazyRoute><Settings /></LazyRoute>} />
                  <Route path="/library" element={<LazyRoute><Library /></LazyRoute>} />
                  <Route path="/live-sessions" element={<LazyRoute><LiveSessions /></LazyRoute>} />
                  
                  {/* Shared Protected Routes */}
                  <Route path="/my-lessons" element={<LazyRoute><MyLessons /></LazyRoute>} />
                  <Route path="/lessons" element={<LazyRoute><MyLessons /></LazyRoute>} />
                  <Route path="/lesson/:id" element={<LazyRoute><LessonDetail /></LazyRoute>} />
                  <Route path="/course/:id" element={<LazyRoute><CourseDetail /></LazyRoute>} />
                  <Route path="/assignments" element={<LazyRoute><Assignments /></LazyRoute>} />
                  <Route path="/grades" element={<LazyRoute><Grades /></LazyRoute>} />
                  <Route path="/my-grades" element={<LazyRoute><Grades /></LazyRoute>} />
                  <Route path="/attendance" element={<LazyRoute><Attendance /></LazyRoute>} />

                  {/* Admin Only Routes */}
                  <Route element={<PrivateRoute requiredRole="admin"><Outlet /></PrivateRoute>}>
                    <Route path="/users" element={<LazyRoute><Users /></LazyRoute>} />
                    <Route path="/analytics" element={<LazyRoute><Analytics /></LazyRoute>} />
                    <Route path="/structure" element={<LazyRoute><Structure /></LazyRoute>} />
                    <Route path="/structure/groups/:groupId" element={<LazyRoute><GroupDetail /></LazyRoute>} />
                    <Route path="/admin/tests" element={<LazyRoute><AdminTests /></LazyRoute>} />
                    <Route path="/admin/resources" element={<LazyRoute><AdminResources /></LazyRoute>} />
                  </Route>

                  {/* Teacher Only Routes */}
                  <Route element={<PrivateRoute requiredRole="teacher"><Outlet /></PrivateRoute>}>
                    <Route path="/teacher/groups" element={<Navigate to="/teacher/groups/attendance" />} />
                    <Route path="/teacher/groups/attendance" element={<LazyRoute><TeacherAttendance /></LazyRoute>} />
                    <Route path="/teacher/groups/grades" element={<LazyRoute><TeacherGroupGrades /></LazyRoute>} />
                    <Route path="/teacher/resources" element={<LazyRoute><TeacherResources /></LazyRoute>} />
                    <Route path="/teacher/tests" element={<LazyRoute><TeacherTests /></LazyRoute>} />
                  </Route>

                  {/* Student Only Routes */}
                  <Route element={<PrivateRoute requiredRole="student"><Outlet /></PrivateRoute>}>
                    <Route path="/my-subjects" element={<LazyRoute><StudentSubjects /></LazyRoute>} />
                    <Route path="/timetable" element={<LazyRoute><TimeTable /></LazyRoute>} />
                    <Route path="/resources" element={<LazyRoute><StudentResources /></LazyRoute>} />
                    <Route path="/tests" element={<LazyRoute><StudentTests /></LazyRoute>} />
                    <Route path="/tests/:testId" element={<LazyRoute><TakeTest /></LazyRoute>} />
                  </Route>
                </Route>

                {/* Special Case: Book Reader (No Sidebar/Navbar Layout) */}
                <Route path="/library/read/:bookId" element={
                  <PrivateRoute>
                    <LazyRoute><BookReader /></LazyRoute>
                  </PrivateRoute>
                } />

                {/* 404 */}
                <Route path="*" element={<NotFoundRedirect />} />
              </Routes>

              <ToastContainer
                position="top-right"
                autoClose={1000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
              />
            </AuthProvider>
          </ThemeProvider>
        </LanguageProvider>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
