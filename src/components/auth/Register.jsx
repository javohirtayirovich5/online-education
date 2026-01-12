import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiPhone, FiBook, FiUsers, FiBookOpen, FiHome } from 'react-icons/fi';
import { facultyService } from '../../services/facultyService';
import { departmentService } from '../../services/departmentService';
import { groupService } from '../../services/groupService';
import { subjectService } from '../../services/subjectService';
import LoadingSpinner from '../common/LoadingSpinner';
import SEO from '../common/SEO';
import './Auth.css';

const Register = () => {
  const { t } = useTranslation();
  const { currentUser, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    phoneNumber: '',
    facultyId: '',
    departmentId: '',
    groupId: '',
    subjectIds: [] // O'qituvchi uchun bir nechta fan
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const { register } = useAuth();
  const navigate = useNavigate();
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  // If user is already logged in, redirect to dashboard
  if (authLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  // Initialize Vanta.js 3D background
  useEffect(() => {
    if (window.VANTA && vantaRef.current) {
      vantaEffect.current = window.VANTA.GLOBE({
        el: vantaRef.current,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        scale: 1.00,
        scaleMobile: 1.00
      });
    }

    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
      }
    };
  }, []);

  // Fakultetlar va fanlarni yuklash
  useEffect(() => {
    const loadInitialData = async () => {
      const [facultiesRes, subjectsRes] = await Promise.all([
        facultyService.getActiveFaculties(),
        subjectService.getActiveSubjects()
      ]);
      
      if (facultiesRes.success) {
        setFaculties(facultiesRes.data);
      }
      if (subjectsRes.success) {
        setSubjects(subjectsRes.data);
      }
      setLoadingData(false);
    };
    loadInitialData();
  }, []);

  // Fakultet tanlanganida yo'nalishlarni yuklash
  useEffect(() => {
    const loadDepartments = async () => {
      if (formData.facultyId) {
        const result = await departmentService.getDepartmentsByFaculty(formData.facultyId);
        if (result.success) {
          setDepartments(result.data);
        }
      } else {
        setDepartments([]);
      }
      setFormData(prev => ({ ...prev, departmentId: '', groupId: '' }));
      setGroups([]);
    };
    loadDepartments();
  }, [formData.facultyId]);

  // Yo'nalish tanlanganida guruhlarni yuklash
  useEffect(() => {
    const loadGroups = async () => {
      if (formData.departmentId) {
        const result = await groupService.getGroupsByDepartment(formData.departmentId);
        if (result.success) {
          setGroups(result.data);
        }
      } else {
        setGroups([]);
      }
      setFormData(prev => ({ ...prev, groupId: '' }));
    };
    loadGroups();
  }, [formData.departmentId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.displayName || !formData.email || !formData.password) {
      toast.error(t('auth.fillRequiredFields'));
      return;
    }

    if (formData.password.length < 6) {
      toast.error(t('auth.passwordMinLength'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error(t('auth.passwordsNotMatch'));
      return;
    }

    // Talaba uchun guruh majburiy
    if (formData.role === 'student' && !formData.groupId) {
      toast.error(t('auth.selectGroup'));
      return;
    }

    // O'qituvchi uchun kamida bitta fan majburiy
    if (formData.role === 'teacher' && formData.subjectIds.length === 0) {
      toast.error(t('auth.selectAtLeastOneSubject'));
      return;
    }

    // Email o'chirilgan foydalanuvchilar ro'yxatida bo'lsa, ruxsat berish
    // (Bu email qayta ishlatilishi mumkin)
    setLoading(true);
    
    // Nomlarni olish
    const faculty = faculties.find(f => f.id === formData.facultyId);
    const department = departments.find(d => d.id === formData.departmentId);
    const group = groups.find(g => g.id === formData.groupId);
    const selectedSubjects = subjects.filter(s => formData.subjectIds.includes(s.id));

    const userData = {
      displayName: formData.displayName,
      role: formData.role,
      phoneNumber: formData.phoneNumber
    };

    // Talaba uchun qo'shimcha ma'lumotlar
    if (formData.role === 'student') {
      userData.facultyId = formData.facultyId;
      userData.facultyName = faculty?.name || '';
      userData.departmentId = formData.departmentId;
      userData.departmentName = department?.name || '';
      userData.groupId = formData.groupId;
      userData.groupName = group?.name || '';
    }

    // O'qituvchi uchun qo'shimcha ma'lumotlar
    if (formData.role === 'teacher') {
      userData.subjectIds = formData.subjectIds; // Bir nechta fan ID lari
      userData.subjectNames = selectedSubjects.map(s => s.name); // Fan nomlari
      userData.assignedGroups = []; // Admin keyinroq biriktiradi
    }

    const result = await register(formData.email, formData.password, userData);
    
    // Agar talaba ro'yxatdan o'tsa, guruhga qo'shish
    if (result.success && formData.role === 'student' && formData.groupId) {
      await groupService.addStudentToGroup(formData.groupId, result.user.uid);
    }
    
    setLoading(false);

    if (result.success) {
      if (formData.role === 'teacher') {
        toast.success(t('auth.teacherPendingApproval'));
      } else {
        toast.success(t('auth.studentEmailVerification'));
      }
      navigate('/login');
    } else {
      // Email already in use xatosi bo'lsa, bu o'chirilgan foydalanuvchi bo'lishi mumkin
      if (result.error && result.error.includes('email-already-in-use')) {
        toast.error(t('auth.emailAlreadyInUse'));
      } else {
        toast.error(result.error || t('auth.registerError'));
      }
    }
  };

  return (
    <>
      <SEO 
        title={`${t('auth.register')} - Technical English Online Ta'lim Platformasi`}
        description={t('auth.registerDescription')}
        keywords={t('auth.registerKeywords')}
      />
      <div className="auth-container">
        <div ref={vantaRef} className="vanta-background"></div>
        <div className="auth-box auth-box-wide">
        {/* Logo */}
        <div className="auth-logo">
          <div className="brand-icon">
            <img src="/favicon.png" alt="Technical English" className="brand-logo" />
          </div>
          <h1>Technical English</h1>
          <p>{t('auth.platformName')}</p>
        </div>

        {/* Back to Landing Page */}
        <div className="auth-back-link">
          <Link to="/" className="back-link">
            <FiHome /> {t('common.backToHome') || 'Bosh sahifaga qaytish'}
          </Link>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>{t('auth.register')}</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('auth.fullName')} <span className="required">*</span></label>
              <div className="input-with-icon">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  name="displayName"
                  className="form-input"
                  placeholder={t('auth.namePlaceholder')}
                  value={formData.displayName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('common.email')} <span className="required">*</span></label>
              <div className="input-with-icon">
                <FiMail className="input-icon" />
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder={t('auth.emailPlaceholder')}
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('auth.password')} <span className="required">*</span></label>
              <div className="input-with-icon">
                <FiLock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('auth.confirmPassword')} <span className="required">*</span></label>
              <div className="input-with-icon">
                <FiLock className="input-icon" />
                <input
                  type="password"
                  name="confirmPassword"
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('auth.role')} <span className="required">*</span></label>
              <select
                name="role"
                className="form-select"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="student">{t('auth.student')}</option>
                <option value="teacher">{t('auth.teacher')}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('auth.phone')}</label>
              <div className="input-with-icon">
                <FiPhone className="input-icon" />
                <input
                  type="tel"
                  name="phoneNumber"
                  className="form-input"
                  placeholder={t('auth.phonePlaceholder')}
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Talaba uchun - Fakultet, Yo'nalish, Guruh */}
          {formData.role === 'student' && (
            <div className="form-section">
              <h3 className="form-section-title">
                <FiBook /> {t('auth.educationInfo')}
              </h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    {t('auth.faculty')} <span className="required">*</span>
                  </label>
                  <select
                    name="facultyId"
                    className="form-select"
                    value={formData.facultyId}
                    onChange={handleChange}
                    disabled={loadingData}
                    required
                  >
                    <option value="">{t('auth.selectFaculty')}</option>
                    {faculties.map(faculty => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {t('auth.department')} <span className="required">*</span>
                  </label>
                  <select
                    name="departmentId"
                    className="form-select"
                    value={formData.departmentId}
                    onChange={handleChange}
                    disabled={!formData.facultyId || departments.length === 0}
                    required
                  >
                    <option value="">{t('auth.selectDepartment')}</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {t('auth.group')} <span className="required">*</span>
                </label>
                <div className="input-with-icon">
                  <FiUsers className="input-icon" />
                  <select
                    name="groupId"
                    className="form-select form-select-icon"
                    value={formData.groupId}
                    onChange={handleChange}
                    disabled={!formData.departmentId || groups.length === 0}
                    required
                  >
                    <option value="">{t('auth.selectGroup')}</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.year}-kurs)
                      </option>
                    ))}
                  </select>
                </div>
                {formData.departmentId && groups.length === 0 && (
                  <small className="form-hint warning">
                    {t('auth.noGroupsInDepartment')}
                  </small>
                )}
              </div>
            </div>
          )}

          {/* O'qituvchi uchun - Bir nechta fan tanlash */}
          {formData.role === 'teacher' && (
            <div className="form-section">
              <h3 className="form-section-title">
                <FiBookOpen /> {t('auth.specializationSubjects')}
              </h3>
              
              <div className="form-group">
                <label className="form-label">
                  {t('auth.teachingSubjects')} <span className="required">*</span>
                </label>
                {subjects.length === 0 ? (
                  <div className="form-hint warning">
                    {t('auth.noSubjectsCreated')}
                  </div>
                ) : (
                  <div className="subjects-checkbox-list">
                    {subjects.map(subject => (
                      <label key={subject.id} className="subject-checkbox-item">
                        <input
                          type="checkbox"
                          value={subject.id}
                          checked={formData.subjectIds.includes(subject.id)}
                          onChange={(e) => {
                            const subjectId = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              subjectIds: e.target.checked
                                ? [...prev.subjectIds, subjectId]
                                : prev.subjectIds.filter(id => id !== subjectId)
                            }));
                          }}
                        />
                        <span className="checkbox-label">
                          {subject.name} {subject.code ? `(${subject.code})` : ''}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <small className="form-hint">
                  {t('auth.selectMultipleSubjects')}
                </small>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? t('auth.registering') : t('auth.register')}
          </button>
        </form>

        {/* Login Link */}
        <div className="auth-switch">
          <p>{t('auth.hasAccount')} <Link to="/login">{t('auth.login')}</Link></p>
        </div>

        {/* Footer Links */}
        <div className="auth-footer">
          <Link to="/privacy-policy" className="auth-footer-link">
            {t('auth.privacyPolicy')}
          </Link>
          <span className="auth-footer-separator">•</span>
          <Link to="/terms-of-service" className="auth-footer-link">
            {t('auth.termsOfService')}
          </Link>
        </div>
      </div>

    </div>
    </>
  );
};

export default Register;
