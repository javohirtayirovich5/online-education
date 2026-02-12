import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { authService } from '../services/authService';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Get user data from Firestore
        const result = await authService.getUserData(user.uid);
        if (result.success) {
          setUserData(result.data);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const register = async (email, password, userData) => {
    return await authService.register(email, password, userData);
  };

  const login = async (email, password) => {
    return await authService.login(email, password);
  };

  const logout = async () => {
    return await authService.logout();
  };

  const resetPassword = async (email) => {
    return await authService.resetPassword(email);
  };

  const updateProfile = async (updates) => {
    if (!currentUser) return { success: false, error: 'No user logged in' };
    const result = await authService.updateUserProfile(currentUser.uid, updates);
    if (result.success) {
      setUserData({ ...userData, ...updates });
    }
    return result;
  };

  const refreshUserData = async () => {
    if (!currentUser) return { success: false, error: 'No user logged in' };
    const result = await authService.getUserData(currentUser.uid);
    if (result.success) {
      setUserData(result.data);
    }
    return result;
  };

  const value = {
    currentUser,
    userData,
    loading,
    register,
    login,
    logout,
    resetPassword,
    updateProfile,
    refreshUserData,
    isAdmin: userData?.role === 'admin',
    isTeacher: userData?.role === 'teacher',
    isStudent: userData?.role === 'student'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

