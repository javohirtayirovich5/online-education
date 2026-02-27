import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import About from './About';
import { useState, useEffect } from 'react';

/**
 * AboutWrapper - Shows About page with or without layout based on auth status
 * - Authenticated: Shows with Navbar + Sidebar (AppLayout structure)
 * - Unauthenticated: Shows just the component with breadcrumb
 */
const AboutWrapper = () => {
  const { currentUser } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const getInitialSidebarState = () => {
      const saved = localStorage.getItem('sidebarOpen');
      if (saved !== null) {
        return saved === 'true';
      }
      return window.innerWidth > 1024;
    };

    setIsSidebarOpen(getInitialSidebarState());

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

  // Show with layout for authenticated users
  if (currentUser) {
    return (
      <div className="app">
        <Navbar toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <Sidebar isOpen={isSidebarOpen} closeSidebar={closeSidebar} />
        <main className={`app-main ${isSidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="app-content">
            <About />
          </div>
        </main>
      </div>
    );
  }

  // Show without layout for unauthenticated users (just breadcrumb)
  return <About />;
};

export default AboutWrapper;
