import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { courseService } from '../services/courseService';
import { FiBook, FiUsers, FiClock, FiSearch, FiFilter, FiEye } from 'react-icons/fi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import './Courses.css';

const ExploreCourses = () => {
  const { userData } = useAuth();
  const [allCourses, setAllCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    'all',
    'Informatika',
    'Matematika',
    'Fizika',
    'Kimyo',
    'Biologiya',
    'Tarix',
    'Adabiyot',
    'Tillar',
    'Iqtisodiyot',
    'Huquq',
    'Boshqa'
  ];

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [searchTerm, selectedCategory, allCourses]);

  const loadCourses = async () => {
    setLoading(true);
    const result = await courseService.getAllCourses();
    if (result.success) {
      setAllCourses(result.data);
      setFilteredCourses(result.data);
    }
    setLoading(false);
  };

  const filterCourses = () => {
    let filtered = allCourses;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.instructorName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredCourses(filtered);
  };


  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="courses-page">
      <div className="page-header">
        <div>
          <h1>Kurslar</h1>
          <p>Mavjud barcha kurslarni ko'ring va yoziling</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Kurslar, o'qituvchilar qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="category-filters">
          <FiFilter />
          <div className="category-buttons">
            {categories.map((category) => (
              <button
                key={category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all' ? 'Barchasi' : category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="empty-state-large">
          <FiBook size={64} />
          <h2>Kurslar topilmadi</h2>
          <p>Qidiruv shartlaringizni o'zgartiring</p>
        </div>
      ) : (
        <div className="courses-grid">
          {filteredCourses.map((course) => {
            return (
              <div key={course.id} className="course-card">
                <div className="course-thumbnail">
                  <img src={course.thumbnailURL || '/default-course.jpg'} alt={course.title} />
                  <div className="course-category">{course.category}</div>
                </div>
                
                <div className="course-body">
                  <h3>{course.title}</h3>
                  <p className="course-description">{course.description}</p>
                  
                  <div className="course-meta">
                    <div className="meta-item">
                      <FiUsers />
                      <span>{course.instructorName}</span>
                    </div>
                    <div className="meta-item">
                      <FiEye />
                      <span>{course.views || 0} ko'rish</span>
                    </div>
                    <div className="meta-item">
                      <FiClock />
                      <span>{course.modules?.length || 0} modul</span>
                    </div>
                  </div>
                </div>

                <div className="course-footer">
                  <Link to={`/course/${course.id}`} className="btn btn-primary btn-sm btn-block">
                    Ko'rish
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExploreCourses;

