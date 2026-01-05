import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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

import './App.css';

function AppLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    if (window.innerWidth <= 1024) {
      setIsSidebarOpen(false);
    }
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

function App() {
  return (
    <Router>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected Routes */}
            <Route path="/" element={
              <PrivateRoute>
                <Navigate to="/dashboard" />
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

            {/* Live Sessions (teachers and students) */}
            <Route path="/live-sessions" element={
              <PrivateRoute>
                <AppLayout><LiveSessions /></AppLayout>
              </PrivateRoute>
            } />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
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
  );
}

export default App;
