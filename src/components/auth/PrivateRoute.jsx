import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const PrivateRoute = ({ children, requiredRole }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Check if user is approved (for teachers and admins)
  if (userData?.role !== 'student' && !userData?.isApproved) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <div className="auth-logo">
            <div className="brand-icon warning">
              <span>⏳</span>
            </div>
            <h1>Hisobingiz tasdiqlanmagan</h1>
            <p>
              Hisobingiz administrator tomonidan tasdiqlanishi kutilmoqda. 
              Tasdiqlangandan keyin tizimga kirish imkoniyatiga ega bo'lasiz.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check role-based access
  if (requiredRole) {
    // Admin has access to everything
    if (userData?.role === 'admin') {
      return children;
    }
    
    // Check if user's role matches required role
    if (userData?.role !== requiredRole) {
      return <Navigate to="/dashboard" />;
    }
  }

  return children;
};

export default PrivateRoute;

