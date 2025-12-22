import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { courseService } from '../services/courseService';
import { subjectService } from '../services/subjectService';
import { storageService } from '../services/storageService';
import { getVideoDuration, secondsToMinutes, generateThumbnailFromVideo } from '../utils/videoUtils';
import { 
  FiPlus, 
  FiPlay, 
  FiBook,
  FiEdit, 
  FiTrash2,
  FiVideo,
  FiClock,
  FiFilter,
  FiSearch,
  FiUpload,
  FiX,
  FiUsers,
  FiFile
} from 'react-icons/fi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import { toast } from 'react-toastify';
import './Lessons.css';

const MyLessons = () => {
  const navigate = useNavigate();
  const { userData, isTeacher } = useAuth();
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [showEditLessonModal, setShowEditLessonModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [deletedAttachedFiles, setDeletedAttachedFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  
  // Kurs yaratish formasi
  const [courseFormData, setCourseFormData] = useState({
    title: '',
    description: '',
    subjectId: '',
    thumbnailFile: null
  });
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const thumbnailInputRef = useRef(null);

  // Dars qo'shish formasi
  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    description: '',
    videoFile: null,
    thumbnailFile: null,
    attachedFiles: [],
    duration: null
  });
  const thumbnailLessonInputRef = useRef(null);
  const attachedFilesInputRef = useRef(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [gettingDuration, setGettingDuration] = useState(false);
  const videoInputRef = useRef(null);

  useEffect(() => {
    if (!userData) {
      setLoading(false);
      return;
    }
    
    loadCourses();
    loadTeacherSubjects();
  }, [userData, isTeacher]);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    // URL dan editLesson parametrini o'qish
    const editLessonId = searchParams.get('editLesson');
    const moduleIndex = searchParams.get('moduleIndex');
    const lessonIndex = searchParams.get('lessonIndex');
    
    if (editLessonId && moduleIndex !== null && lessonIndex !== null && courses.length > 0) {
      const course = courses.find(c => c.id === editLessonId);
      if (course) {
        const module = course.modules?.[parseInt(moduleIndex)];
        const lesson = module?.lessons?.[parseInt(lessonIndex)];
        if (lesson) {
          openEditLessonModal(course, parseInt(moduleIndex), parseInt(lessonIndex), lesson);
          // URL dan parametrlarni olib tashlash
          window.history.replaceState({}, '', '/my-lessons');
        }
      }
    }
  }, [courses, searchParams]);

  const loadTeacherSubjects = async () => {
    try {
      const allSubjectsResult = await subjectService.getAllSubjects();
      if (allSubjectsResult.success) {
        if (isTeacher) {
          // O'qituvchining mutaxassisligi fanlarini filtrlash
          // Ro'yxatdan o'tishda 'subjectIds', admin biriktirganda 'assignedSubjects' sifatida saqlanadi
          const teacherSubjectIds = userData.assignedSubjects || userData.subjectIds || [];
          const filteredSubjects = allSubjectsResult.data.filter(subject => 
            teacherSubjectIds.includes(subject.id)
          );
          setSubjects(filteredSubjects);
        } else {
          // Talabalar va boshqalar uchun: barcha fanlar
          setSubjects(allSubjectsResult.data);
        }
      }
    } catch (error) {
      console.error('Load subjects error:', error);
    }
  };

  const loadCourses = async () => {
    if (!userData) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      if (isTeacher) {
        // O'qituvchi uchun: faqat o'z kurslari
        const result = await courseService.getCoursesByInstructor(userData.uid);
        if (result.success) {
          setCourses(result.data || []);
        }
      } else {
        // Talabalar va boshqalar uchun: barcha kurslar
        const result = await courseService.getAllCourses();
        if (result.success) {
          setCourses(result.data || []);
        }
      }
    } catch (error) {
      console.error('Load courses error:', error);
      toast.error('Kurslarni yuklashda xatolik');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Video fayl turini tekshirish
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      toast.error('Faqat video fayllar (MP4, WebM, OGG, MOV, AVI) qabul qilinadi');
      return;
    }

    // Fayl hajmini tekshirish (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      toast.error('Video hajmi 500MB dan oshmasligi kerak');
      return;
    }

    setLessonFormData({ ...lessonFormData, videoFile: file });
    setGettingDuration(true);

    try {
      // Video davomiyligini olish
      const durationInSeconds = await getVideoDuration(file);
      const durationInMinutes = secondsToMinutes(durationInSeconds);
      setLessonFormData(prev => ({ ...prev, duration: durationInMinutes }));
      toast.success(`Video davomiyligi: ${durationInMinutes} daqiqa`);
    } catch (error) {
      console.error('Get video duration error:', error);
      toast.error('Video davomiyligini olishda xatolik');
    } finally {
      setGettingDuration(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    
    if (!courseFormData.title || !courseFormData.subjectId) {
      toast.error('Kurs nomi va fan tanlash majburiy');
      return;
    }

    if (!courseFormData.thumbnailFile) {
      toast.error('Thumbnail yuklash majburiy');
      return;
    }

    setUploadingThumbnail(true);

    try {
      const selectedSubject = subjects.find(s => s.id === courseFormData.subjectId);
      
      // Kursni yaratish (thumbnail yuklashdan oldin)
      const courseResult = await courseService.createCourse({
        title: courseFormData.title,
        description: courseFormData.description || '',
        category: selectedSubject?.name || '',
        subjectId: courseFormData.subjectId,
        subjectName: selectedSubject?.name || '',
        instructorId: userData.uid,
        instructorName: userData.displayName,
        thumbnailURL: '/default-course.jpg'
      });

      if (!courseResult.success) {
        throw new Error('Kurs yaratishda xatolik');
      }

      const courseId = courseResult.courseId;

      // Thumbnail yuklash
      const thumbnailResult = await storageService.uploadCourseThumbnail(
        courseId,
        courseFormData.thumbnailFile,
        () => {}
      );

      if (thumbnailResult.success) {
        // Kursni thumbnail URL bilan yangilash
        await courseService.updateCourse(courseId, {
          thumbnailURL: thumbnailResult.url
        });

        toast.success('Kurs muvaffaqiyatli yaratildi!');
        setShowCreateCourseModal(false);
        setCourseFormData({ title: '', description: '', subjectId: '', thumbnailFile: null });
        if (thumbnailInputRef.current) {
          thumbnailInputRef.current.value = '';
        }
        loadCourses();
      } else {
        throw new Error('Thumbnail yuklashda xatolik');
      }
    } catch (error) {
      console.error('Create course error:', error);
      toast.error(error.message || 'Kurs yaratishda xatolik');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    
    if (!lessonFormData.title) {
      toast.error('Dars nomi majburiy');
      return;
    }

    if (!selectedCourse) {
      toast.error('Kurs tanlanmagan');
      return;
    }

    // Agar modul bo'lmasa, avtomatik yaratish
    let moduleId = selectedCourse.modules?.[0]?.moduleId;
    if (!moduleId) {
      // Birinchi modulni yaratish
      const moduleResult = await courseService.addModule(selectedCourse.id, {
        title: 'Asosiy modul',
        description: ''
      });
      if (!moduleResult.success) {
        toast.error('Modul yaratishda xatolik');
        return;
      }
      // Yangi modul ID sini olish
      const updatedCourseResult = await courseService.getCourse(selectedCourse.id);
      if (updatedCourseResult.success) {
        moduleId = updatedCourseResult.data.modules?.[0]?.moduleId;
      }
    }

    if (!moduleId) {
      toast.error('Modul topilmadi');
      return;
    }

    setUploadingVideo(true);
    setUploadProgress(0);

    try {
      let videoURL = '';
      let videoType = 'uploaded';
      let thumbnailURL = '';

      // Video fayl yuklash
      if (lessonFormData.videoFile) {
        const videoPath = `courses/${selectedCourse.id}/lessons/video_${Date.now()}.${lessonFormData.videoFile.name.split('.').pop()}`;
        const uploadResult = await storageService.uploadFile(
          lessonFormData.videoFile,
          videoPath,
          (progress) => setUploadProgress(Math.round(progress))
        );

        if (uploadResult.success) {
          videoURL = uploadResult.url;
        } else {
          throw new Error('Video yuklashda xatolik');
        }

        // Thumbnail yuklash yoki videodan yaratish
        if (lessonFormData.thumbnailFile) {
          // Foydalanuvchi thumbnail yuklagan
          const thumbnailPath = `courses/${selectedCourse.id}/lessons/thumbnails/thumb_${Date.now()}.jpg`;
          const thumbnailUploadResult = await storageService.uploadFile(
            lessonFormData.thumbnailFile,
            thumbnailPath,
            () => {}
          );
          if (thumbnailUploadResult.success) {
            thumbnailURL = thumbnailUploadResult.url;
          }
        } else {
          // Videodan thumbnail yaratish
          try {
            const thumbnailBlob = await generateThumbnailFromVideo(lessonFormData.videoFile, 1);
            const thumbnailFile = new File([thumbnailBlob], `thumbnail_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const thumbnailPath = `courses/${selectedCourse.id}/lessons/thumbnails/thumb_${Date.now()}.jpg`;
            const thumbnailUploadResult = await storageService.uploadFile(
              thumbnailFile,
              thumbnailPath,
              () => {}
            );
            if (thumbnailUploadResult.success) {
              thumbnailURL = thumbnailUploadResult.url;
            }
          } catch (error) {
            console.error('Generate thumbnail error:', error);
            // Thumbnail yaratishda xatolik bo'lsa, davom etamiz
          }
        }
      }

      // Qo'shimcha fayllar yuklash
      const attachedFilesURLs = [];
      if (lessonFormData.attachedFiles && lessonFormData.attachedFiles.length > 0) {
        for (const file of lessonFormData.attachedFiles) {
          const filePath = `courses/${selectedCourse.id}/lessons/attachments/${Date.now()}_${file.name}`;
          const fileUploadResult = await storageService.uploadFile(
            file,
            filePath,
            () => {}
          );
          if (fileUploadResult.success) {
            attachedFilesURLs.push({
              name: file.name,
              url: fileUploadResult.url,
              type: file.type,
              size: file.size
            });
          }
        }
      }

      // Darsni kursga qo'shish
      const lessonData = {
        title: lessonFormData.title,
        description: lessonFormData.description || '',
        videoURL: videoURL,
        videoType: videoType,
        thumbnailURL: thumbnailURL,
        attachedFiles: attachedFilesURLs,
        duration: lessonFormData.duration || 0,
        type: 'video'
      };

      const result = await courseService.addLessonToModule(
        selectedCourse.id,
        moduleId,
        lessonData
      );

      if (result.success) {
        toast.success('Dars muvaffaqiyatli qo\'shildi!');
        setShowAddLessonModal(false);
        setLessonFormData({ title: '', description: '', videoFile: null, thumbnailFile: null, attachedFiles: [], duration: null });
        setSelectedCourse(null);
        if (videoInputRef.current) {
          videoInputRef.current.value = '';
        }
        if (thumbnailLessonInputRef.current) {
          thumbnailLessonInputRef.current.value = '';
        }
        if (attachedFilesInputRef.current) {
          attachedFilesInputRef.current.value = '';
        }
        loadCourses();
      } else {
        toast.error('Dars qo\'shishda xatolik');
      }
    } catch (error) {
      console.error('Add lesson error:', error);
      toast.error(error.message || 'Dars qo\'shishda xatolik');
    } finally {
      setUploadingVideo(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteCourse = (courseId) => {
    setConfirmData(courseId);
    setConfirmAction(() => async () => {
      const result = await courseService.deleteCourse(courseId);
      if (result.success) {
        toast.success('Kurs o\'chirildi');
        loadCourses();
      } else {
        toast.error('Kurs o\'chirishda xatolik');
      }
    });
    setShowConfirmModal(true);
  };

  const openAddLessonModal = (course) => {
    setSelectedCourse(course);
    setShowAddLessonModal(true);
  };

  const openEditCourseModal = (course) => {
    setEditingCourse(course);
    setCourseFormData({
      title: course.title,
      description: course.description || '',
      subjectId: course.subjectId || '',
      thumbnailFile: null
    });
    setShowEditCourseModal(true);
  };

  const openEditLessonModal = (course, moduleIndex, lessonIndex, lesson) => {
    setSelectedCourse(course);
    setEditingLesson({ moduleIndex, lessonIndex, lesson });
    setLessonFormData({
      title: lesson.title || '',
      description: lesson.description || '',
      videoFile: null,
      thumbnailFile: null,
      attachedFiles: [],
      duration: lesson.duration || null
    });
    setShowEditLessonModal(true);
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    
    if (!editingCourse) return;
    
    if (!courseFormData.title || !courseFormData.subjectId) {
      toast.error('Kurs nomi va fan tanlash majburiy');
      return;
    }

    setUploadingThumbnail(true);

    try {
      const selectedSubject = subjects.find(s => s.id === courseFormData.subjectId);
      
      const updates = {
        title: courseFormData.title,
        description: courseFormData.description || '',
        category: selectedSubject?.name || '',
        subjectId: courseFormData.subjectId,
        subjectName: selectedSubject?.name || ''
      };

      // Thumbnail yangilash (agar yangi fayl yuklangan bo'lsa)
      if (courseFormData.thumbnailFile) {
        const thumbnailResult = await storageService.uploadCourseThumbnail(
          editingCourse.id,
          courseFormData.thumbnailFile,
          () => {}
        );

        if (thumbnailResult.success) {
          updates.thumbnailURL = thumbnailResult.url;
        }
      }

      const result = await courseService.updateCourse(editingCourse.id, updates);

      if (result.success) {
        toast.success('Kurs muvaffaqiyatli yangilandi!');
        setShowEditCourseModal(false);
        setEditingCourse(null);
        setCourseFormData({ title: '', description: '', subjectId: '', thumbnailFile: null });
        if (thumbnailInputRef.current) {
          thumbnailInputRef.current.value = '';
        }
        loadCourses();
      } else {
        throw new Error('Kurs yangilashda xatolik');
      }
    } catch (error) {
      console.error('Update course error:', error);
      toast.error(error.message || 'Kurs yangilashda xatolik');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleUpdateLesson = async (e) => {
    e.preventDefault();
    
    if (!editingLesson || !selectedCourse) {
      toast.error('Dars ma\'lumotlari topilmadi');
      return;
    }

    if (!lessonFormData.title) {
      toast.error('Dars nomi majburiy');
      return;
    }

    setUploadingVideo(true);
    setUploadProgress(0);

    try {
      const { moduleIndex, lessonIndex, lesson } = editingLesson;
      const moduleId = selectedCourse.modules?.[moduleIndex]?.moduleId;
      
      if (!moduleId) {
        throw new Error('Modul topilmadi');
      }

      let videoURL = lesson.videoURL || '';
      let thumbnailURL = lesson.thumbnailURL || '';

      // Video yangilash (agar yangi fayl yuklangan bo'lsa)
      if (lessonFormData.videoFile) {
        const videoPath = `courses/${selectedCourse.id}/lessons/video_${Date.now()}.${lessonFormData.videoFile.name.split('.').pop()}`;
        const uploadResult = await storageService.uploadFile(
          lessonFormData.videoFile,
          videoPath,
          (progress) => setUploadProgress(Math.round(progress))
        );

        if (uploadResult.success) {
          videoURL = uploadResult.url;
        } else {
          throw new Error('Video yuklashda xatolik');
        }
      }

      // Thumbnail yangilash (video blokidan mustaqil)
      if (lessonFormData.thumbnailFile) {
        // Yangi thumbnail fayl yuklangan
        const thumbnailPath = `courses/${selectedCourse.id}/lessons/thumbnails/thumb_${Date.now()}.jpg`;
        const thumbnailUploadResult = await storageService.uploadFile(
          lessonFormData.thumbnailFile,
          thumbnailPath,
          () => {}
        );
        if (thumbnailUploadResult.success) {
          thumbnailURL = thumbnailUploadResult.url;
        }
      } else if (lessonFormData.videoFile && !lesson.thumbnailURL) {
        // Yangi video yuklangan va oldin thumbnail bo'lmasa - videodan yaratish
        try {
          const thumbnailBlob = await generateThumbnailFromVideo(lessonFormData.videoFile, 1);
          const thumbnailFile = new File([thumbnailBlob], `thumbnail_${Date.now()}.jpg`, { type: 'image/jpeg' });
          const thumbnailPath = `courses/${selectedCourse.id}/lessons/thumbnails/thumb_${Date.now()}.jpg`;
          const thumbnailUploadResult = await storageService.uploadFile(
            thumbnailFile,
            thumbnailPath,
            () => {}
          );
          if (thumbnailUploadResult.success) {
            thumbnailURL = thumbnailUploadResult.url;
          }
        } catch (error) {
          console.error('Generate thumbnail error:', error);
        }
      }

      // Qo'shimcha fayllar yangilash
      // O'chirilgan fayllarni olib tashlash
      let attachedFilesURLs = (lesson.attachedFiles || []).filter((file, index) => 
        !deletedAttachedFiles.includes(index)
      );
      
      // Yangi fayllar qo'shish
      if (lessonFormData.attachedFiles && lessonFormData.attachedFiles.length > 0) {
        for (const file of lessonFormData.attachedFiles) {
          const filePath = `courses/${selectedCourse.id}/lessons/attachments/${Date.now()}_${file.name}`;
          const fileUploadResult = await storageService.uploadFile(
            file,
            filePath,
            () => {}
          );
          if (fileUploadResult.success) {
            attachedFilesURLs.push({
              name: file.name,
              url: fileUploadResult.url,
              type: file.type,
              size: file.size
            });
          }
        }
      }

      const updates = {
        title: lessonFormData.title,
        description: lessonFormData.description || '',
        videoURL: videoURL,
        thumbnailURL: thumbnailURL,
        attachedFiles: attachedFilesURLs,
        duration: lessonFormData.duration || lesson.duration || 0
      };

      if (lessonFormData.videoFile) {
        updates.videoType = 'uploaded';
      }

      const result = await courseService.updateLessonInModule(
        selectedCourse.id,
        moduleId,
        lesson.lessonId,
        updates
      );

      if (result.success) {
        toast.success('Dars muvaffaqiyatli yangilandi!');
        setShowEditLessonModal(false);
        setEditingLesson(null);
        setSelectedCourse(null);
        setDeletedAttachedFiles([]);
        setLessonFormData({ title: '', description: '', videoFile: null, thumbnailFile: null, attachedFiles: [], duration: null });
        if (videoInputRef.current) {
          videoInputRef.current.value = '';
        }
        if (thumbnailLessonInputRef.current) {
          thumbnailLessonInputRef.current.value = '';
        }
        if (attachedFilesInputRef.current) {
          attachedFilesInputRef.current.value = '';
        }
        loadCourses();
      } else {
        toast.error('Dars yangilashda xatolik');
      }
    } catch (error) {
      console.error('Update lesson error:', error);
      toast.error(error.message || 'Dars yangilashda xatolik');
    } finally {
      setUploadingVideo(false);
      setUploadProgress(0);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (course.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject === 'all' || course.subjectId === filterSubject;
    return matchesSearch && matchesSubject;
  });

  const getTotalLessons = (course) => {
    if (!course.modules || course.modules.length === 0) return 0;
    return course.modules.reduce((total, module) => {
      return total + (module.lessons?.length || 0);
    }, 0);
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="lessons-page">
      <div className="page-header">
        <div>
          <h1>{isTeacher ? 'Mening kurslarim' : 'Barcha kurslar'}</h1>
          <p>{isTeacher ? 'Siz yaratgan video kurslar va darslar' : 'Universitetning barcha video kurslari'}</p>
        </div>
        {isTeacher && (
          <button className="btn btn-primary" onClick={() => setShowCreateCourseModal(true)}>
            <FiPlus /> Yangi kurs yaratish
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Kurslarni qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <FiFilter />
          <select 
            className="filter-select"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          >
            <option value="all">Barcha fanlar</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="empty-state-large">
          <FiBook size={64} />
          <h2>{isTeacher ? 'Hozircha kurslar yo\'q' : 'Kurslar topilmadi'}</h2>
          <p>
            {isTeacher 
              ? 'Yangi kurs yaratish uchun yuqoridagi tugmani bosing'
              : 'Qidiruv shartlarini o\'zgartiring'}
          </p>
        </div>
      ) : (
        <div className="lessons-grid">
          {filteredCourses.map((course) => (
            <div key={course.id} className="lesson-card">
              <div className="lesson-thumbnail">
                {course.thumbnailURL ? (
                  <img 
                    src={course.thumbnailURL} 
                    alt={course.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div className="video-preview">
                    <FiBook className="play-icon" />
                  </div>
                )}
                <div className="lesson-subject">{course.category || course.subjectName}</div>
              </div>
              
              <div className="lesson-body">
                <h3>{course.title}</h3>
                <p className="lesson-description">{course.description || 'Tavsif kiritilmagan'}</p>
                
                <div className="lesson-teacher">
                  <img 
                    src={course.instructorPhoto || '/default-avatar.png'} 
                    alt={course.instructorName}
                    className="teacher-avatar"
                  />
                  <span>{course.instructorName}</span>
                </div>

                <div className="lesson-stats">
                  <div className="stat-item">
                    <FiBook />
                    <span>{getTotalLessons(course)} dars</span>
                  </div>
                  <div className="stat-item">
                    <FiUsers />
                    <span>{course.views || 0} ko'rish</span>
                  </div>
                </div>
              </div>

              <div className="lesson-footer">
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(`/course/${course.id}`)}
                >
                  <FiPlay /> Ko'rish
                </button>
                {isTeacher && course.instructorId === userData.uid && (
                  <>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => openAddLessonModal(course)}
                    >
                      <FiPlus /> Dars qo'shish
                    </button>
                    <div className="lesson-actions">
                      <button 
                        className="btn-icon" 
                        onClick={() => openEditCourseModal(course)}
                        title="Tahrirlash"
                      >
                        <FiEdit />
                      </button>
                      <button 
                        className="btn-icon btn-danger" 
                        onClick={() => handleDeleteCourse(course.id)}
                        title="O'chirish"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      <Modal
        isOpen={showCreateCourseModal}
        onClose={() => setShowCreateCourseModal(false)}
        title="Yangi kurs yaratish"
        size="large"
      >
        <form onSubmit={handleCreateCourse} className="lesson-form">
          <div className="form-group">
            <label className="form-label">Kurs nomi *</label>
            <input
              type="text"
              className="form-input"
              value={courseFormData.title}
              onChange={(e) => setCourseFormData({ ...courseFormData, title: e.target.value })}
              placeholder="Masalan: Matematika asoslari"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tavsif</label>
            <textarea
              className="form-textarea"
              value={courseFormData.description}
              onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
              placeholder="Kurs haqida qisqacha ma'lumot..."
              rows="4"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fan *</label>
            <select
              className="form-select"
              value={courseFormData.subjectId}
              onChange={(e) => setCourseFormData({ ...courseFormData, subjectId: e.target.value })}
              required
            >
              <option value="">Fan tanlang</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
            {subjects.length === 0 && (
              <p className="form-help" style={{ color: '#ef4444' }}>
                Sizda mutaxassislik fanlari topilmadi. Admin sizga fan biriktirishi kerak.
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Thumbnail *</label>
            <div className="file-upload-wrapper">
              <input
                type="file"
                ref={thumbnailInputRef}
                className="file-input-hidden"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setCourseFormData({ ...courseFormData, thumbnailFile: file });
                  }
                }}
                required
              />
              <button
                type="button"
                className="file-upload-btn"
                onClick={() => thumbnailInputRef.current?.click()}
              >
                <FiUpload /> Rasm yuklash
              </button>
            </div>
            {courseFormData.thumbnailFile && (
              <p className="form-help">
                Tanlangan: {courseFormData.thumbnailFile.name}
              </p>
            )}
            <p className="form-help">Kurs uchun rasm yuklash majburiy</p>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreateCourseModal(false)}>
              Bekor qilish
            </button>
            <button type="submit" className="btn btn-primary">
              Yaratish
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Course Modal */}
      <Modal
        isOpen={showEditCourseModal}
        onClose={() => {
          setShowEditCourseModal(false);
          setEditingCourse(null);
          setCourseFormData({ title: '', description: '', subjectId: '', thumbnailFile: null });
          if (thumbnailInputRef.current) {
            thumbnailInputRef.current.value = '';
          }
        }}
        title="Kursni tahrirlash"
        size="large"
      >
        <form onSubmit={handleUpdateCourse} className="lesson-form">
          <div className="form-group">
            <label className="form-label">Kurs nomi *</label>
            <input
              type="text"
              className="form-input"
              value={courseFormData.title}
              onChange={(e) => setCourseFormData({ ...courseFormData, title: e.target.value })}
              placeholder="Masalan: Matematika asoslari"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tavsif</label>
            <textarea
              className="form-textarea"
              value={courseFormData.description}
              onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
              placeholder="Kurs haqida qisqacha ma'lumot..."
              rows="4"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fan *</label>
            <select
              className="form-select"
              value={courseFormData.subjectId}
              onChange={(e) => setCourseFormData({ ...courseFormData, subjectId: e.target.value })}
              required
            >
              <option value="">Fan tanlang</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Thumbnail (ixtiyoriy)</label>
            <div className="file-upload-wrapper">
              <input
                type="file"
                ref={thumbnailInputRef}
                className="file-input-hidden"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setCourseFormData({ ...courseFormData, thumbnailFile: file });
                  }
                }}
              />
              <button
                type="button"
                className="file-upload-btn"
                onClick={() => thumbnailInputRef.current?.click()}
              >
                <FiUpload /> Rasm yuklash
              </button>
            </div>
            {editingCourse?.thumbnailURL && !courseFormData.thumbnailFile && (
              <p className="form-help">
                Hozirgi thumbnail: <img src={editingCourse.thumbnailURL} alt="Current thumbnail" style={{ width: '100px', height: 'auto', marginTop: '0.5rem', borderRadius: '4px' }} />
              </p>
            )}
            {courseFormData.thumbnailFile && (
              <p className="form-help">
                Yangi fayl tanlangan: {courseFormData.thumbnailFile.name}
              </p>
            )}
            <p className="form-help">Yangi thumbnail yuklash (ixtiyoriy)</p>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => {
              setShowEditCourseModal(false);
              setEditingCourse(null);
              setCourseFormData({ title: '', description: '', subjectId: '', thumbnailFile: null });
              if (thumbnailInputRef.current) {
                thumbnailInputRef.current.value = '';
              }
            }}>
              Bekor qilish
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploadingThumbnail}>
              {uploadingThumbnail ? 'Yuklanmoqda...' : 'Yangilash'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Lesson Modal */}
      <Modal
        isOpen={showAddLessonModal}
        onClose={() => {
          setShowAddLessonModal(false);
          setLessonFormData({ title: '', description: '', videoFile: null, thumbnailFile: null, attachedFiles: [], duration: null });
          setSelectedCourse(null);
          if (videoInputRef.current) {
            videoInputRef.current.value = '';
          }
          if (thumbnailLessonInputRef.current) {
            thumbnailLessonInputRef.current.value = '';
          }
          if (attachedFilesInputRef.current) {
            attachedFilesInputRef.current.value = '';
          }
        }}
        title={`Yangi dars qo'shish - ${selectedCourse?.title || ''}`}
        size="large"
      >
        <form onSubmit={handleAddLesson} className="lesson-form">
          <div className="form-group">
            <label className="form-label">Dars nomi *</label>
            <input
              type="text"
              className="form-input"
              value={lessonFormData.title}
              onChange={(e) => setLessonFormData({ ...lessonFormData, title: e.target.value })}
              placeholder="Masalan: 1-dars: Kirish"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tavsif</label>
            <textarea
              className="form-textarea"
              value={lessonFormData.description}
              onChange={(e) => setLessonFormData({ ...lessonFormData, description: e.target.value })}
              placeholder="Dars haqida qisqacha ma'lumot..."
              rows="4"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Video fayl *</label>
            <div className="file-upload-wrapper">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoFileChange}
                className="file-input-hidden"
                required
              />
              <button
                type="button"
                className="file-upload-btn"
                onClick={() => videoInputRef.current?.click()}
              >
                <FiUpload /> Video yuklash
              </button>
            </div>
            {gettingDuration && (
              <p className="form-help">Video davomiyligi o'qilmoqda...</p>
            )}
            {lessonFormData.videoFile && (
              <div className="selected-file-info">
                <div className="file-info-row">
                  <span>{lessonFormData.videoFile.name}</span>
                  <button
                    type="button"
                    className="btn-icon-small"
                    onClick={() => {
                      setLessonFormData({ ...lessonFormData, videoFile: null, duration: null });
                      if (videoInputRef.current) {
                        videoInputRef.current.value = '';
                      }
                    }}
                  >
                    <FiX />
                  </button>
                </div>
                {lessonFormData.duration && (
                  <p className="form-help">
                    Video davomiyligi: {lessonFormData.duration} daqiqa
                  </p>
                )}
              </div>
            )}
            <p className="form-help">MP4, WebM, OGG, MOV, AVI • Maksimum 500MB</p>
          </div>

          <div className="form-group">
            <label className="form-label">Thumbnail (ixtiyoriy)</label>
            <div className="file-upload-wrapper">
              <input
                type="file"
                ref={thumbnailLessonInputRef}
                className="file-input-hidden"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setLessonFormData({ ...lessonFormData, thumbnailFile: file });
                  }
                }}
              />
              <button
                type="button"
                className="file-upload-btn"
                onClick={() => thumbnailLessonInputRef.current?.click()}
              >
                <FiUpload /> Rasm yuklash
              </button>
            </div>
            {lessonFormData.thumbnailFile && (
              <p className="form-help">
                Tanlangan: {lessonFormData.thumbnailFile.name}
              </p>
            )}
            <p className="form-help">
              Agar thumbnail kiritilmasa, video fayldan avtomatik yaratiladi
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Qo'shimcha fayllar (ixtiyoriy)</label>
            <div className="file-upload-wrapper">
              <input
                type="file"
                ref={attachedFilesInputRef}
                className="file-input-hidden"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    setLessonFormData({ 
                      ...lessonFormData, 
                      attachedFiles: [...lessonFormData.attachedFiles, ...files]
                    });
                  }
                }}
              />
              <button
                type="button"
                className="file-upload-btn"
                onClick={() => attachedFilesInputRef.current?.click()}
              >
                <FiUpload /> Fayl yuklash
              </button>
            </div>
            {lessonFormData.attachedFiles && lessonFormData.attachedFiles.length > 0 && (
              <div className="attached-files-list">
                {lessonFormData.attachedFiles.map((file, index) => (
                  <div key={index} className="attached-file-item">
                    <div className="file-info-row">
                      <span>{file.name}</span>
                      <span className="file-size">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <button
                        type="button"
                        className="btn-icon-small"
                        onClick={() => {
                          const newFiles = lessonFormData.attachedFiles.filter((_, i) => i !== index);
                          setLessonFormData({ ...lessonFormData, attachedFiles: newFiles });
                        }}
                      >
                        <FiX />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="form-help">
              PDF, Word, Excel, PowerPoint va boshqa hujjatlar (Maksimum 50MB har bir fayl)
            </p>
          </div>

          {uploadingVideo && (
            <div className="upload-progress-container">
              <div className="upload-progress-bar">
                <div 
                  className="upload-progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="upload-progress-text">{uploadProgress}% yuklanmoqda...</p>
            </div>
          )}

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                setShowAddLessonModal(false);
                setLessonFormData({ title: '', description: '', videoFile: null, duration: null });
                setSelectedCourse(null);
                if (videoInputRef.current) {
                  videoInputRef.current.value = '';
                }
              }}
              disabled={uploadingVideo}
            >
              Bekor qilish
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={uploadingVideo || gettingDuration}
            >
              {uploadingVideo ? 'Yuklanmoqda...' : 'Qo\'shish'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Lesson Modal */}
      <Modal
        isOpen={showEditLessonModal}
        onClose={() => {
          setShowEditLessonModal(false);
          setEditingLesson(null);
          setSelectedCourse(null);
          setDeletedAttachedFiles([]);
          setLessonFormData({ title: '', description: '', videoFile: null, thumbnailFile: null, attachedFiles: [], duration: null });
          if (videoInputRef.current) {
            videoInputRef.current.value = '';
          }
          if (thumbnailLessonInputRef.current) {
            thumbnailLessonInputRef.current.value = '';
          }
          if (attachedFilesInputRef.current) {
            attachedFilesInputRef.current.value = '';
          }
        }}
        title={`Darsni tahrirlash - ${selectedCourse?.title || ''}`}
        size="large"
      >
        <form onSubmit={handleUpdateLesson} className="lesson-form">
          <div className="form-group">
            <label className="form-label">Dars nomi *</label>
            <input
              type="text"
              className="form-input"
              value={lessonFormData.title}
              onChange={(e) => setLessonFormData({ ...lessonFormData, title: e.target.value })}
              placeholder="Masalan: 1-dars: Kirish"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tavsif</label>
            <textarea
              className="form-textarea"
              value={lessonFormData.description}
              onChange={(e) => setLessonFormData({ ...lessonFormData, description: e.target.value })}
              placeholder="Dars haqida qisqacha ma'lumot..."
              rows="4"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Video fayl (ixtiyoriy - yangilash uchun)</label>
            <div className="file-upload-wrapper">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoFileChange}
                className="file-input-hidden"
              />
              <button
                type="button"
                className="file-upload-btn"
                onClick={() => videoInputRef.current?.click()}
              >
                <FiUpload /> Video yuklash
              </button>
            </div>

            {gettingDuration && (
              <p className="form-help">Video davomiyligi o'qilmoqda...</p>
            )}
            {lessonFormData.videoFile && (
              <div className="selected-file-info">
                <div className="file-info-row">
                  <span>{lessonFormData.videoFile.name}</span>
                  <button
                    type="button"
                    className="btn-icon-small"
                    onClick={() => {
                      setLessonFormData({ ...lessonFormData, videoFile: null, duration: null });
                      if (videoInputRef.current) {
                        videoInputRef.current.value = '';
                      }
                    }}
                  >
                    <FiX />
                  </button>
                </div>
                {lessonFormData.duration && (
                  <p className="form-help">
                    Video davomiyligi: {lessonFormData.duration} daqiqa
                  </p>
                )}
              </div>
            )}
            <p className="form-help">MP4, WebM, OGG, MOV, AVI • Maksimum 500MB</p>
          </div>

          <div className="form-group">
            <label className="form-label">Thumbnail (ixtiyoriy)</label>
            <div className="file-upload-wrapper">
              <input
                type="file"
                ref={thumbnailLessonInputRef}
                className="file-input-hidden"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setLessonFormData({ ...lessonFormData, thumbnailFile: file });
                  }
                }}
              />
              <button
                type="button"
                className="file-upload-btn"
                onClick={() => thumbnailLessonInputRef.current?.click()}
              >
                <FiUpload /> Rasm yuklash
              </button>
            </div>
            {editingLesson?.lesson?.thumbnailURL && !lessonFormData.thumbnailFile && (
              <p className="form-help">
                Hozirgi thumbnail mavjud. Yangi thumbnail yuklash ixtiyoriy.
              </p>
            )}
            {lessonFormData.thumbnailFile && (
              <p className="form-help">
                Tanlangan: {lessonFormData.thumbnailFile.name}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Qo'shimcha fayllar (ixtiyoriy)</label>
            <div className="file-upload-wrapper">
              <input
                type="file"
                ref={attachedFilesInputRef}
                className="file-input-hidden"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    setLessonFormData({ 
                      ...lessonFormData, 
                      attachedFiles: [...lessonFormData.attachedFiles, ...files]
                    });
                  }
                }}
              />
              <button
                type="button"
                className="file-upload-btn"
                onClick={() => attachedFilesInputRef.current?.click()}
              >
                <FiUpload /> Fayl yuklash
              </button>
            </div>
            {editingLesson?.lesson?.attachedFiles && editingLesson.lesson.attachedFiles.length > 0 && (
              <div className="attached-files-list" style={{ marginTop: '0.5rem' }}>
                <p className="form-help" style={{ marginBottom: '0.5rem' }}>Mavjud fayllar:</p>
                {editingLesson.lesson.attachedFiles.map((file, index) => {
                  if (deletedAttachedFiles.includes(index)) {
                    return null; // O'chirilgan fayllarni ko'rsatma
                  }
                  return (
                    <div key={index} className="attached-file-item">
                      <div className="file-info-row">
                        <span>{file.name}</span>
                        {file.size && (
                          <span className="file-size">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        )}
                        <button
                          type="button"
                          className="btn-icon-small btn-danger"
                          onClick={() => {
                            setDeletedAttachedFiles([...deletedAttachedFiles, index]);
                          }}
                          title="O'chirish"
                        >
                          <FiX />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {lessonFormData.attachedFiles && lessonFormData.attachedFiles.length > 0 && (
              <div className="attached-files-list">
                <p className="form-help" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>Yangi fayllar:</p>
                {lessonFormData.attachedFiles.map((file, index) => (
                  <div key={index} className="attached-file-item">
                    <div className="file-info-row">
                      <span>{file.name}</span>
                      <span className="file-size">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <button
                        type="button"
                        className="btn-icon-small"
                        onClick={() => {
                          const newFiles = lessonFormData.attachedFiles.filter((_, i) => i !== index);
                          setLessonFormData({ ...lessonFormData, attachedFiles: newFiles });
                        }}
                      >
                        <FiX />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="form-help">
              PDF, Word, Excel, PowerPoint va boshqa hujjatlar (Maksimum 50MB har bir fayl)
            </p>
          </div>

          {uploadingVideo && (
            <div className="upload-progress-container">
              <div className="upload-progress-bar">
                <div 
                  className="upload-progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="upload-progress-text">{uploadProgress}% yuklanmoqda...</p>
            </div>
          )}

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                setShowEditLessonModal(false);
                setEditingLesson(null);
                setSelectedCourse(null);
                setDeletedAttachedFiles([]);
                setLessonFormData({ title: '', description: '', videoFile: null, thumbnailFile: null, attachedFiles: [], duration: null });
                if (videoInputRef.current) {
                  videoInputRef.current.value = '';
                }
                if (thumbnailLessonInputRef.current) {
                  thumbnailLessonInputRef.current.value = '';
                }
                if (attachedFilesInputRef.current) {
                  attachedFilesInputRef.current.value = '';
                }
              }}
            >
              Bekor qilish
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploadingVideo}>
              {uploadingVideo ? 'Yuklanmoqda...' : 'Yangilash'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setConfirmAction(null);
          setConfirmData(null);
        }}
        onConfirm={() => {
          if (confirmAction) {
            confirmAction();
          }
        }}
        title="Tasdiqlash"
        message="Kursni o'chirmoqchimisiz? Barcha darslar ham o'chiriladi."
        confirmText="Ha, o'chirish"
        cancelText="Bekor qilish"
        type="danger"
      />
    </div>
  );
};

export default MyLessons;

