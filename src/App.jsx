import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layout Components
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';

// Auth Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import PrivateRoute from './components/auth/PrivateRoute';

// Public Pages
import Landing from './pages/Landing';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

// Pages
import Dashboard from './pages/Dashboard';
import MyLessons from './pages/MyLessons';
import LessonDetail from './pages/LessonDetail';
import CourseDetail from './pages/CourseDetail';
import Assignments from './pages/Assignments';
import Grades from './pages/Grades';
import Attendance from './pages/Attendance';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

// Admin Pages
import Users from './pages/admin/Users';
import Analytics from './pages/admin/Analytics';
import Structure from './pages/admin/Structure';
import GroupDetail from './pages/admin/GroupDetail';

// Teacher Pages
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherGroupGrades from './pages/teacher/TeacherGroupGrades';
import TeacherResources from './pages/teacher/TeacherResources';
import TeacherTests from './pages/teacher/TeacherTests';
import LiveSessions from './pages/LiveSessions';

// Student Pages
import StudentSubjects from './pages/student/StudentSubjects';
import TimeTable from './pages/student/TimeTable';
import StudentResources from './pages/student/StudentResources';
import StudentTests from './pages/student/StudentTests';
import TakeTest from './pages/student/TakeTest';
import Library from './pages/Library';
import BookReader from './pages/BookReader';

import './App.css';

function AppLayout({ children }) {
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
      // Katta ekranlarda localStorage'dan holatni tiklash
      // Lekin foydalanuvchi tomonidan o'zgartirilgan holatni saqlash
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    // localStorage'ga saqlash
    localStorage.setItem('sidebarOpen', newState.toString());
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    // localStorage'ga saqlash
    localStorage.setItem('sidebarOpen', 'false');
  };

  return (
    <div className="app">
      <Navbar toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <Sidebar isOpen={isSidebarOpen} closeSidebar={closeSidebar} />
      <main className={`app-main ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="app-content">
          {children}
        </div>
      </main>
    </div>
  );
}

// Google OAuth Client ID - Environment variable or default
// Production uchun .env faylda VITE_GOOGLE_CLIENT_ID ni sozlang
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1087873877448-vn95loshinp5kggnselsfk1g8chlfiuq.apps.googleusercontent.com';

// 404 Redirect Component
const NotFoundRedirect = () => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return null; // AuthProvider will handle loading
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
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <PrivateRoute>
                <AppLayout><Dashboard /></AppLayout>
              </PrivateRoute>
            } />
            
            <Route path="/dashboard" element={
              <PrivateRoute>
                <AppLayout><Dashboard /></AppLayout>
              </PrivateRoute>
            } />

            {/* Lessons */}
            <Route path="/my-lessons" element={
              <PrivateRoute>
                <AppLayout><MyLessons /></AppLayout>
              </PrivateRoute>
            } />

            <Route path="/lessons" element={
              <PrivateRoute>
                <AppLayout><MyLessons /></AppLayout>
              </PrivateRoute>
            } />

            <Route path="/lesson/:id" element={
              <PrivateRoute>
                <AppLayout><LessonDetail /></AppLayout>
              </PrivateRoute>
            } />

            {/* Courses */}
            <Route path="/course/:id" element={
              <PrivateRoute>
                <AppLayout><CourseDetail /></AppLayout>
              </PrivateRoute>
            } />

            {/* Assignments */}
            <Route path="/assignments" element={
              <PrivateRoute>
                <AppLayout><Assignments /></AppLayout>
              </PrivateRoute>
            } />

            {/* Grades */}
            <Route path="/grades" element={
              <PrivateRoute>
                <AppLayout><Grades /></AppLayout>
              </PrivateRoute>
            } />

            <Route path="/my-grades" element={
              <PrivateRoute>
                <AppLayout><Grades /></AppLayout>
              </PrivateRoute>
            } />

            {/* Attendance */}
            <Route path="/attendance" element={
              <PrivateRoute>
                <AppLayout><Attendance /></AppLayout>
              </PrivateRoute>
            } />

            {/* Profile & Settings */}
            <Route path="/profile" element={
              <PrivateRoute>
                <AppLayout><Profile /></AppLayout>
              </PrivateRoute>
            } />

            <Route path="/settings" element={
              <PrivateRoute>
                <AppLayout><Settings /></AppLayout>
              </PrivateRoute>
            } />

            {/* ====== Admin Routes ====== */}
            <Route path="/users" element={
              <PrivateRoute requiredRole="admin">
                <AppLayout><Users /></AppLayout>
              </PrivateRoute>
            } />

            <Route path="/analytics" element={
              <PrivateRoute requiredRole="admin">
                <AppLayout><Analytics /></AppLayout>
              </PrivateRoute>
            } />

            <Route path="/structure" element={
              <PrivateRoute requiredRole="admin">
                <AppLayout><Structure /></AppLayout>
              </PrivateRoute>
            } />

            <Route path="/structure/groups/:groupId" element={
              <PrivateRoute requiredRole="admin">
                <AppLayout><GroupDetail /></AppLayout>
              </PrivateRoute>
            } />

            {/* ====== Teacher Routes ====== */}
            <Route path="/teacher/groups" element={
              <PrivateRoute requiredRole="teacher">
                <Navigate to="/teacher/groups/attendance" />
              </PrivateRoute>
            } />

            <Route path="/teacher/groups/attendance" element={
              <PrivateRoute requiredRole="teacher">
                <AppLayout><TeacherAttendance /></AppLayout>
              </PrivateRoute>
            } />

            <Route path="/teacher/groups/grades" element={
              <PrivateRoute requiredRole="teacher">
                <AppLayout><TeacherGroupGrades /></AppLayout>
              </PrivateRoute>
            } />

            <Route path="/teacher/resources" element={
              <PrivateRoute requiredRole="teacher">
                <AppLayout><TeacherResources /></AppLayout>
              </PrivateRoute>
            } />

            <Route path="/teacher/tests" element={
              <PrivateRoute requiredRole="teacher">
                <AppLayout><TeacherTests /></AppLayout>
              </PrivateRoute>
            } />

            {/* ====== Student Routes ====== */}
            <Route path="/my-subjects" element={
              <PrivateRoute requiredRole="student">
                <AppLayout><StudentSubjects /></AppLayout>
              </PrivateRoute>
            } />

            <Route path="/timetable" element={
              <PrivateRoute requiredRole="student">
                <AppLayout><TimeTable /></AppLayout>
              </PrivateRoute>
            } />

            <Route path="/resources" element={
              <PrivateRoute requiredRole="student">
                <AppLayout><StudentResources /></AppLayout>
              </PrivateRoute>
            } />

            <Route path="/tests" element={
              <PrivateRoute requiredRole="student">
                <AppLayout><StudentTests /></AppLayout>
              </PrivateRoute>
            } />

            <Route path="/tests/:testId" element={
              <PrivateRoute requiredRole="student">
                <AppLayout><TakeTest /></AppLayout>
              </PrivateRoute>
            } />

            {/* Library (all authenticated users) */}
            <Route path="/library" element={
              <PrivateRoute>
                <AppLayout><Library /></AppLayout>
              </PrivateRoute>
            } />

            <Route path="/library/read/:bookId" element={
              <PrivateRoute>
                <BookReader />
              </PrivateRoute>
            } />

            {/* Live Sessions (teachers and students) */}
            <Route path="/live-sessions" element={
              <PrivateRoute>
                <AppLayout><LiveSessions /></AppLayout>
              </PrivateRoute>
            } />

            {/* 404 */}
            <Route path="*" element={<NotFoundRedirect />} />
          </Routes>

          <ToastContainer
            position="top-right"
            autoClose={3000}
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
