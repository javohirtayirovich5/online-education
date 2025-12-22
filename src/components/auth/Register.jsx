import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiPhone, FiBook, FiUsers, FiBookOpen } from 'react-icons/fi';
import { facultyService } from '../../services/facultyService';
import { departmentService } from '../../services/departmentService';
import { groupService } from '../../services/groupService';
import { subjectService } from '../../services/subjectService';
import './Auth.css';

const Register = () => {
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
      toast.error('Barcha majburiy maydonlarni to\'ldiring');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Parollar mos kelmayapti');
      return;
    }

    // Talaba uchun guruh majburiy
    if (formData.role === 'student' && !formData.groupId) {
      toast.error('Guruhni tanlang');
      return;
    }

    // O'qituvchi uchun kamida bitta fan majburiy
    if (formData.role === 'teacher' && formData.subjectIds.length === 0) {
      toast.error('Kamida bitta mutaxassislik fanni tanlang');
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
        toast.success('Ro\'yxatdan o\'tdingiz! Admin tasdiqlaganidan keyin tizimga kira olasiz.');
      } else {
        toast.success('Ro\'yxatdan o\'tdingiz! Email manzilingizni tasdiqlang.');
      }
      navigate('/login');
    } else {
      // Email already in use xatosi bo'lsa, bu o'chirilgan foydalanuvchi bo'lishi mumkin
      if (result.error && result.error.includes('email-already-in-use')) {
        toast.error('Bu email allaqachon ro\'yxatdan o\'tgan. Agar bu sizning emailingiz bo\'lsa, tizimga kiring yoki parolni tiklang.');
      } else {
        toast.error(result.error || 'Ro\'yxatdan o\'tishda xatolik yuz berdi');
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box auth-box-wide">
        {/* Logo */}
        <div className="auth-logo">
          <div className="brand-icon">
            <span>📚</span>
          </div>
          <h1>EduPro</h1>
          <p>Online Ta'lim Platformasi</p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Ro'yxatdan o'tish</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">To'liq ism <span className="required">*</span></label>
              <div className="input-with-icon">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  name="displayName"
                  className="form-input"
                  placeholder="Ism Familiya"
                  value={formData.displayName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email <span className="required">*</span></label>
              <div className="input-with-icon">
                <FiMail className="input-icon" />
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Parol <span className="required">*</span></label>
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
              <label className="form-label">Parolni tasdiqlash <span className="required">*</span></label>
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
              <label className="form-label">Rol <span className="required">*</span></label>
              <select
                name="role"
                className="form-select"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="student">Talaba</option>
                <option value="teacher">O'qituvchi</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Telefon</label>
              <div className="input-with-icon">
                <FiPhone className="input-icon" />
                <input
                  type="tel"
                  name="phoneNumber"
                  className="form-input"
                  placeholder="+998901234567"
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
                <FiBook /> Ta'lim ma'lumotlari
              </h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Fakultet <span className="required">*</span>
                  </label>
                  <select
                    name="facultyId"
                    className="form-select"
                    value={formData.facultyId}
                    onChange={handleChange}
                    disabled={loadingData}
                    required
                  >
                    <option value="">Fakultetni tanlang</option>
                    {faculties.map(faculty => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Yo'nalish <span className="required">*</span>
                  </label>
                  <select
                    name="departmentId"
                    className="form-select"
                    value={formData.departmentId}
                    onChange={handleChange}
                    disabled={!formData.facultyId || departments.length === 0}
                    required
                  >
                    <option value="">Yo'nalishni tanlang</option>
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
                  Guruh <span className="required">*</span>
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
                    <option value="">Guruhni tanlang</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.year}-kurs)
                      </option>
                    ))}
                  </select>
                </div>
                {formData.departmentId && groups.length === 0 && (
                  <small className="form-hint warning">
                    Bu yo'nalishda hali guruhlar mavjud emas
                  </small>
                )}
              </div>
            </div>
          )}

          {/* O'qituvchi uchun - Bir nechta fan tanlash */}
          {formData.role === 'teacher' && (
            <div className="form-section">
              <h3 className="form-section-title">
                <FiBookOpen /> Mutaxassislik fanlar
              </h3>
              
              <div className="form-group">
                <label className="form-label">
                  O'qitadigan fanlar <span className="required">*</span>
                </label>
                {subjects.length === 0 ? (
                  <div className="form-hint warning">
                    Hali fanlar yaratilmagan. Admin fanlar yaratishi kerak.
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
                  Bir nechta mutaxassislik fanni tanlashingiz mumkin. Admin sizni guruhlarga biriktirgandan keyin dars o'tishingiz mumkin.
                </small>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Ro\'yxatdan o\'tish...' : 'Ro\'yxatdan o\'tish'}
          </button>
        </form>

        {/* Login Link */}
        <div className="auth-switch">
          <p>Hisobingiz bormi? <Link to="/login">Kirish</Link></p>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="auth-background">
        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
        <div className="bg-shape shape-3"></div>
      </div>
    </div>
  );
};

export default Register;
