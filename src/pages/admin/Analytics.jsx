import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { 
  FiUsers, 
  FiBook, 
  FiFileText, 
  FiTrendingUp,
  FiActivity
} from 'react-icons/fi';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './Admin.css';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    students: 0,
    teachers: 0
  });
  const [roleData, setRoleData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

  // Helper function to get month name in Uzbek
  const getMonthName = (monthIndex) => {
    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    return months[monthIndex];
  };

  // Helper function to calculate monthly statistics (Cumulative)
  const calculateMonthlyData = (users, courses) => {
    const now = new Date();
    const monthlyStats = [];
    const monthKeys = [];

    // Initialize last 6 months with zero values
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
      monthKeys.push(monthKey);
      monthlyStats.push({
        key: monthKey,
        year: date.getFullYear(),
        month: date.getMonth(),
        users: 0,
        courses: 0
      });
    }

    // Count users by month (non-cumulative first)
    users.forEach(user => {
      if (user.createdAt) {
        const createdAt = new Date(user.createdAt);
        const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth()).padStart(2, '0')}`;
        
        const statIndex = monthKeys.indexOf(monthKey);
        if (statIndex !== -1) {
          monthlyStats[statIndex].users++;
        }
      }
    });

    // Count courses by month (non-cumulative first)
    courses.forEach(course => {
      if (course.createdAt) {
        const createdAt = new Date(course.createdAt);
        const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth()).padStart(2, '0')}`;
        
        const statIndex = monthKeys.indexOf(monthKey);
        if (statIndex !== -1) {
          monthlyStats[statIndex].courses++;
        }
      }
    });

    // Make it cumulative - each month includes all previous months
    let cumulativeUsers = 0;
    let cumulativeCourses = 0;
    
    const cumulativeData = monthlyStats.map(stat => {
      cumulativeUsers += stat.users;
      cumulativeCourses += stat.courses;
      
      return {
        name: getMonthName(stat.month),
        users: cumulativeUsers,
        courses: cumulativeCourses
      };
    });

    return cumulativeData;
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Get users
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map(doc => doc.data());
      
      const students = users.filter(u => u.role === 'student').length;
      const teachers = users.filter(u => u.role === 'teacher').length;
      const admins = users.filter(u => u.role === 'admin').length;

      // Get courses
      const coursesSnap = await getDocs(collection(db, 'courses'));
      const courses = coursesSnap.docs.map(doc => doc.data());
      
      setStats({
        totalUsers: users.length,
        totalCourses: coursesSnap.size,
        students,
        teachers
      });

      setRoleData([
        { name: 'Talabalar', value: students },
        { name: 'O\'qituvchilar', value: teachers },
        { name: 'Adminlar', value: admins }
      ]);

      // Calculate real monthly data from Firebase
      const monthlyStats = calculateMonthlyData(users, courses);
      setMonthlyData(monthlyStats);

    } catch (error) {
      console.error('Load analytics error:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="admin-page analytics-page">
      <div className="page-header">
        <div>
          <h1>Statistika</h1>
          <p>Platforma tahlili va hisobotlari</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="analytics-stats">
        <div className="analytics-stat-card">
          <div className="analytics-stat-icon primary">
            <FiUsers />
          </div>
          <div className="analytics-stat-content">
            <h2>{stats.totalUsers}</h2>
            <p>Jami foydalanuvchilar</p>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-icon success">
            <FiBook />
          </div>
          <div className="analytics-stat-content">
            <h2>{stats.totalCourses}</h2>
            <p>Jami kurslar</p>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-icon info">
            <FiUsers />
          </div>
          <div className="analytics-stat-content">
            <h2>{stats.students}</h2>
            <p>Talabalar</p>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-icon warning">
            <FiUsers />
          </div>
          <div className="analytics-stat-content">
            <h2>{stats.teachers}</h2>
            <p>O'qituvchilar</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* User Distribution Pie Chart */}
        <div className="chart-card">
          <h3>Foydalanuvchilar taqsimoti</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {roleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Growth Line Chart */}
        <div className="chart-card">
          <h3>Oylik o'sish</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#4f46e5" 
                  strokeWidth={2}
                  name="Foydalanuvchilar"
                />
                <Line 
                  type="monotone" 
                  dataKey="courses" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Kurslar"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Bar Chart */}
        <div className="chart-card full-width">
          <h3>Faollik ko'rsatkichlari</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Foydalanuvchilar" />
                <Bar dataKey="courses" fill="#10b981" radius={[4, 4, 0, 0]} name="Kurslar" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;