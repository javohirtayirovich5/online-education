import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { courseService } from '../services/courseService';
import { subjectService } from '../services/subjectService';
import { storageService } from '../services/storageService';
import { getVideoDuration, secondsToMinutes, generateThumbnailFromVideo } from '../utils/videoUtils';
import { useTranslation } from '../hooks/useTranslation';
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
  FiFile,
  FiMoreVertical
} from 'react-icons/fi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import '../components/common/LoadingSpinner.css';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import { toast } from 'react-toastify';
import './Lessons.css';

const MyLessons = () => {
  const navigate = useNavigate();
  const { userData, isTeacher } = useAuth();
  const { t } = useTranslation();
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
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRefs = useRef({});
  
  // Kurs yaratish formasi
  const [courseFormData, setCourseFormData] = useState({
    title: '',
    description: '',
    subjectId: '',
    thumbnailFile: null
  });
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const thumbnailInputRef = useRef(null);

  // Dars qo'shish formasi
  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    description: '',
    videoFile: null,
    thumbnailFile: null,
    attachedFiles: [],
    duration: null,
    videoSource: 'upload', // 'upload' yoki 'youtube'
    youtubeUrl: ''
  });
  const thumbnailLessonInputRef = useRef(null);
  const attachedFilesInputRef = useRef(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [gettingDuration, setGettingDuration] = useState(false);
  const [loadingYouTubeInfo, setLoadingYouTubeInfo] = useState(false);
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

    // CourseDetail'dan dars qo'shish uchun courseId va addLesson parametrlarini o'qish
    const courseId = searchParams.get('courseId');
    const addLesson = searchParams.get('addLesson');
    
    if (courseId && addLesson === 'true' && courses.length > 0) {
      const course = courses.find(c => c.id === courseId);
      if (course) {
        openAddLessonModal(course);
        // URL dan parametrlarni olib tashlash
        window.history.replaceState({}, '', '/my-lessons');
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
        // O'qituvchi uchun: barcha kurslar (boshqa o'qituvchilarnikini ham ko'radi)
        const result = await courseService.getAllCourses();
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

  // YouTube URL ni validate qilish va video ID ni extract qilish
  const validateYouTubeUrl = (url) => {
    if (!url || !url.trim()) return { valid: false, error: 'URL kiritilmagan' };
    
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(url)) {
      return { valid: false, error: 'Noto\'g\'ri YouTube URL' };
    }

    // YouTube video ID ni extract qilish
    let videoId = '';
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        videoId = match[1];
        break;
      }
    }

    if (!videoId) {
      return { valid: false, error: 'YouTube video ID topilmadi' };
    }

    return { valid: true, videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
  };

  // YouTube videodan ma'lumotlarni olish (oEmbed API)
  const fetchYouTubeVideoInfo = async (videoUrl) => {
    try {
      const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
      const response = await fetch(oEmbedUrl);
      
      if (!response.ok) {
        throw new Error('YouTube video ma\'lumotlarini olishda xatolik');
      }
      
      const data = await response.json();
      return {
        success: true,
        title: data.title || '',
        author: data.author_name || '',
        thumbnail: data.thumbnail_url || ''
      };
    } catch (error) {
      console.error('Fetch YouTube info error:', error);
      return {
        success: false,
        error: error.message || 'YouTube video ma\'lumotlarini olishda xatolik'
      };
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

    setLessonFormData({ ...lessonFormData, videoFile: file, videoSource: 'upload', youtubeUrl: '' });
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

  const handleYouTubeUrlChange = async (e) => {
    const url = e.target.value;
    setLessonFormData({ ...lessonFormData, youtubeUrl: url, videoFile: null, duration: null });
    
    if (url && url.trim()) {
      const validation = validateYouTubeUrl(url);
      if (!validation.valid) {
        // Xatolikni faqat to'liq URL kiritilganda ko'rsatish
        if (url.length > 20) {
          toast.error(validation.error);
        }
      } else {
        // To'g'ri URL bo'lsa, yangilash va video ma'lumotlarini olish
        const validatedUrl = validation.url;
        setLessonFormData(prev => ({ ...prev, youtubeUrl: validatedUrl }));
        
        // YouTube videodan ma'lumotlarni olish
        setLoadingYouTubeInfo(true);
        const videoInfo = await fetchYouTubeVideoInfo(validatedUrl);
        setLoadingYouTubeInfo(false);
        
        if (videoInfo.success) {
          // Video nomi va tavsifni avtomatik to'ldirish (faqat bo'sh bo'lsa)
          setLessonFormData(prev => ({
            ...prev,
            title: prev.title.trim() || videoInfo.title, // Faqat bo'sh bo'lsa to'ldirish
            description: prev.description.trim() || (videoInfo.author ? `Muallif: ${videoInfo.author}` : 'YouTube video')
          }));
          toast.success('YouTube video ma\'lumotlari yuklandi!');
        } else {
          toast.warning('Video ma\'lumotlarini olishda xatolik. Qo\'lda kiriting.');
        }
      }
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    
    // Agar kurs yaratilmoqda bo'lsa, qayta bosilishini oldini olish
    if (creatingCourse) {
      return;
    }
    
    if (!courseFormData.title || !courseFormData.subjectId) {
      toast.error(t('lessons.courseNameAndSubjectRequired'));
      return;
    }

    if (!courseFormData.thumbnailFile) {
      toast.error(t('lessons.thumbnailRequired'));
      return;
    }

    setCreatingCourse(true);
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
        throw new Error(t('lessons.courseCreateError'));
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

        toast.success(t('lessons.courseCreatedSuccess'));
        setShowCreateCourseModal(false);
        setCourseFormData({ title: '', description: '', subjectId: '', thumbnailFile: null });
        if (thumbnailInputRef.current) {
          thumbnailInputRef.current.value = '';
        }
        loadCourses();
      } else {
        throw new Error(t('lessons.thumbnailUploadError'));
      }
    } catch (error) {
      console.error('Create course error:', error);
      toast.error(error.message || t('lessons.courseCreateError'));
    } finally {
      setUploadingThumbnail(false);
      setCreatingCourse(false);
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    
    if (!lessonFormData.title) {
      toast.error(t('lessons.lessonTitleRequired'));
      return;
    }

    if (!selectedCourse) {
      toast.error(t('lessons.courseNotSelected'));
      return;
    }

    // Video manbasi tekshirish
    if (lessonFormData.videoSource === 'youtube') {
      if (!lessonFormData.youtubeUrl || !lessonFormData.youtubeUrl.trim()) {
        toast.error(t('lessons.youtubeUrlRequired'));
        return;
      }
      const validation = validateYouTubeUrl(lessonFormData.youtubeUrl);
      if (!validation.valid) {
        toast.error(validation.error || t('lessons.invalidYouTubeUrl'));
        return;
      }
    } else {
      if (!lessonFormData.videoFile) {
        toast.error(t('lessons.videoFileOrUrlRequired'));
        return;
      }
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
        toast.error(t('lessons.moduleCreateError'));
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

      // Video manbasi: yuklangan fayl yoki YouTube link
      if (lessonFormData.videoSource === 'youtube' && lessonFormData.youtubeUrl) {
        // YouTube link
        const validation = validateYouTubeUrl(lessonFormData.youtubeUrl);
        if (!validation.valid) {
          toast.error(validation.error || t('lessons.invalidYouTubeUrl'));
          setUploadingVideo(false);
          return;
        }
        videoURL = validation.url;
        videoType = 'youtube';
        // YouTube uchun thumbnail URL ni olish (ixtiyoriy)
        if (validation.videoId) {
          thumbnailURL = `https://img.youtube.com/vi/${validation.videoId}/maxresdefault.jpg`;
        }
      } else if (lessonFormData.videoFile) {
      // Video fayl yuklash
        const videoPath = `courses/${selectedCourse.id}/lessons/video_${Date.now()}.${lessonFormData.videoFile.name.split('.').pop()}`;
        const uploadResult = await storageService.uploadFile(
          lessonFormData.videoFile,
          videoPath,
          (progress) => setUploadProgress(Math.round(progress))
        );

        if (uploadResult.success) {
          videoURL = uploadResult.url;
        } else {
          throw new Error(t('lessons.videoUploadError'));
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
        toast.error(t('lessons.lessonAddError'));
      }
    } catch (error) {
      console.error('Add lesson error:', error);
      toast.error(error.message || t('lessons.lessonAddError'));
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
        toast.success(t('lessons.courseDeleted'));
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
      duration: lesson.duration || null,
      videoSource: lesson.videoType === 'youtube' ? 'youtube' : 'upload',
      youtubeUrl: lesson.videoType === 'youtube' ? (lesson.videoURL || '') : ''
    });
    setShowEditLessonModal(true);
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    
    if (!editingCourse) return;
    
    if (!courseFormData.title || !courseFormData.subjectId) {
      toast.error(t('lessons.courseNameAndSubjectRequired'));
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
      toast.error(t('lessons.lessonDataNotFound'));
      return;
    }

    if (!lessonFormData.title) {
      toast.error(t('lessons.lessonTitleRequired'));
      return;
    }

    setUploadingVideo(true);
    setUploadProgress(0);

    try {
      const { moduleIndex, lessonIndex, lesson } = editingLesson;
      const moduleId = selectedCourse.modules?.[moduleIndex]?.moduleId;
      
      if (!moduleId) {
        throw new Error(t('lessons.moduleNotFound'));
      }

      let videoURL = lesson.videoURL || '';
      let videoType = lesson.videoType || 'uploaded';
      let thumbnailURL = lesson.thumbnailURL || '';

      // Video yangilash: YouTube link yoki yangi fayl
      if (lessonFormData.videoSource === 'youtube' && lessonFormData.youtubeUrl) {
        // YouTube link
        const validation = validateYouTubeUrl(lessonFormData.youtubeUrl);
        if (!validation.valid) {
          toast.error(validation.error || t('lessons.invalidYouTubeUrl'));
          setUploadingVideo(false);
          return;
        }
        videoURL = validation.url;
        videoType = 'youtube';
        // YouTube uchun thumbnail URL ni olish (ixtiyoriy)
        if (validation.videoId) {
          thumbnailURL = `https://img.youtube.com/vi/${validation.videoId}/maxresdefault.jpg`;
        }
      } else if (lessonFormData.videoFile) {
        // Video fayl yangilash
        const videoPath = `courses/${selectedCourse.id}/lessons/video_${Date.now()}.${lessonFormData.videoFile.name.split('.').pop()}`;
        const uploadResult = await storageService.uploadFile(
          lessonFormData.videoFile,
          videoPath,
          (progress) => setUploadProgress(Math.round(progress))
        );

        if (uploadResult.success) {
          videoURL = uploadResult.url;
        } else {
          throw new Error(t('lessons.videoUploadError'));
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
        videoType: videoType,
        thumbnailURL: thumbnailURL,
        attachedFiles: attachedFilesURLs,
        duration: lessonFormData.duration || lesson.duration || 0
      };

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
        toast.error(t('lessons.lessonUpdateError'));
      }
    } catch (error) {
      console.error('Update lesson error:', error);
      toast.error(error.message || t('lessons.lessonUpdateError'));
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
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '60vh',
        width: '100%'
      }}>
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="lessons-page ">
      <div className="page-header">
        <div>
          <h1>{t('lessons.myCourses')}</h1>
        </div>
        {isTeacher && (
          <button className="btn btn-primary" onClick={() => setShowCreateCourseModal(true)}>
            <FiPlus /> {t('lessons.addCourse')}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder={t('lessons.searchCourses') + '...'}
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
            <option value="all">{t('grades.allSubjects')}</option>
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
          <h2>{isTeacher ? t('lessons.noLessons') : t('lessons.coursesNotFound')}</h2>
          <p>
            {isTeacher 
              ? t('lessons.addLesson')
              : t('lessons.changeSearchCriteria')}
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
                    <span>{getTotalLessons(course)} {t('lessons.lessonsCount')}</span>
                  </div>
                  <div className="stat-item">
                    <FiUsers />
                    <span>{course.views || 0} {t('lessons.views')}</span>
                  </div>
                </div>
              </div>

              <div className="lesson-footer">
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(`/course/${course.id}`)}
                >
                  <FiPlay /> {t('common.view')}
                </button>
                {isTeacher && course.instructorId === userData.uid && (
                  <>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => openAddLessonModal(course)}
                    >
                      <FiPlus /> {t('lessons.addLesson')}
                    </button>
                    <div className="lesson-actions-menu" ref={el => menuRefs.current[course.id] = el}>
                      <button 
                        className="btn-icon-menu" 
                        onClick={() => setOpenMenuId(openMenuId === course.id ? null : course.id)}
                        aria-label="More actions"
                      >
                        <FiMoreVertical />
                      </button>
                      {openMenuId === course.id && (
                        <div className="lesson-menu-dropdown">
                          <button 
                            className="lesson-menu-item"
                            onClick={() => {
                              setOpenMenuId(null);
                              openEditCourseModal(course);
                            }}
                          >
                            <FiEdit /> {t('common.edit')}
                          </button>
                          <button 
                            className="lesson-menu-item lesson-menu-item-danger"
                            onClick={() => {
                              setOpenMenuId(null);
                              handleDeleteCourse(course.id);
                            }}
                          >
                            <FiTrash2 /> {t('common.delete')}
                          </button>
                        </div>
                      )}
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
        title={t('lessons.addCourse')}
        size="large"
      >
        <form onSubmit={handleCreateCourse} className="lesson-form">
          <div className="form-group">
            <label className="form-label">{t('lessons.courseTitle')} *</label>
            <input
              type="text"
              className="form-input"
              value={courseFormData.title}
              onChange={(e) => setCourseFormData({ ...courseFormData, title: e.target.value })}
              placeholder={t('lessons.courseTitleExample')}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('lessons.courceDescription')}</label>
            <textarea
              className="form-textarea"
              value={courseFormData.description}
              onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
              placeholder={t('lessons.courseDescriptionExample')}
              rows="4"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('grades.subject')} *</label>
            <select
              className="form-select"
              value={courseFormData.subjectId}
              onChange={(e) => setCourseFormData({ ...courseFormData, subjectId: e.target.value })}
              required
            >
              <option value="">{t('grades.selectSubject')}</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
            {subjects.length === 0 && (
              <p className="form-help" style={{ color: 'var(--error)' }}>
                {t('lessons.noSubjectsAssigned')}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">{t('lessons.thumbnail')} *</label>
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
                <FiUpload /> {t('lessons.uploadImage')}
              </button>
            </div>
            {courseFormData.thumbnailFile && (
              <p className="form-help">
                  {t('lessons.selected')}: {courseFormData.thumbnailFile.name}
              </p>
            )}
            <p className="form-help">{t('lessons.thumbnailRequired')}</p>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                if (!creatingCourse) {
                  setShowCreateCourseModal(false);
                }
              }}
              disabled={creatingCourse}
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={creatingCourse}
            >
              {creatingCourse ? (
                <>
                  <div className="loader loader-small" style={{ display: 'inline-block', marginRight: '0.5rem' }}></div>
                  <span>Yaratilmoqda...</span>
                </>
              ) : (
                t('common.create')
              )}
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
        title={t('lessons.editCourse')}
        size="large"
      >
        <form onSubmit={handleUpdateCourse} className="lesson-form">
          <div className="form-group">
            <label className="form-label">{t('lessons.courseTitle')} *</label>
            <input
              type="text"
              className="form-input"
              value={courseFormData.title}
              onChange={(e) => setCourseFormData({ ...courseFormData, title: e.target.value })}
              placeholder={t('lessons.courseTitleExample')}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('lessons.lessonDescription')}</label>
            <textarea
              className="form-textarea"
              value={courseFormData.description}
              onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
              placeholder={t('lessons.courseDescriptionExample')}
              rows="4"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('grades.subject')} *</label>
            <select
              className="form-select"
              value={courseFormData.subjectId}
              onChange={(e) => setCourseFormData({ ...courseFormData, subjectId: e.target.value })}
              required
            >
              <option value="">{t('grades.selectSubject')}</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('lessons.thumbnail')} ({t('common.optional')})</label>
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
                <FiUpload /> {t('lessons.uploadImage')}
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
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploadingThumbnail}>
              {uploadingThumbnail ? t('common.uploading') : t('common.update')}
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
        title={`${t('lessons.addLesson')} - ${selectedCourse?.title || ''}`}
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
              placeholder={t('lessons.lessonDescriptionExample')}
              rows="4"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('lessons.videoSource')} *</label>
            
            {/* Video manbasi tanlash */}
            <div className="video-source-toggle" style={{ marginBottom: '16px' }}>
              <label className="toggle-option">
                <input
                  type="radio"
                  name="videoSource"
                  value="upload"
                  checked={lessonFormData.videoSource === 'upload'}
                  onChange={(e) => {
                    setLessonFormData({ 
                      ...lessonFormData, 
                      videoSource: e.target.value,
                      videoFile: null,
                      youtubeUrl: '',
                      duration: null
                    });
                    if (videoInputRef.current) {
                      videoInputRef.current.value = '';
                    }
                  }}
                />
                <span>{t('lessons.videoFile')}</span>
              </label>
              <label className="toggle-option">
                <input
                  type="radio"
                  name="videoSource"
                  value="youtube"
                  checked={lessonFormData.videoSource === 'youtube'}
                  onChange={(e) => {
                    setLessonFormData({ 
                      ...lessonFormData, 
                      videoSource: e.target.value,
                      videoFile: null,
                      duration: null
                    });
                    if (videoInputRef.current) {
                      videoInputRef.current.value = '';
                    }
                  }}
                />
                <span>{t('lessons.youtubeUrl')}</span>
              </label>
            </div>

            {lessonFormData.videoSource === 'upload' ? (
              <>
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
                <FiUpload /> {t('lessons.uploadVideo')}
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
              </>
            ) : (
              <>
                <input
                  type="text"
                  className="form-input"
                  value={lessonFormData.youtubeUrl}
                  onChange={handleYouTubeUrlChange}
                  placeholder={t('lessons.youtubeUrlExample')}
                  disabled={loadingYouTubeInfo}
                />
                {loadingYouTubeInfo && (
                  <p className="form-help" style={{ color: 'var(--info)', marginTop: '8px' }}>
                    ⏳ YouTube video ma'lumotlari olinmoqda...
                  </p>
                )}
                {lessonFormData.youtubeUrl && !loadingYouTubeInfo && (
                  <div className="selected-file-info" style={{ marginTop: '8px' }}>
                    <div className="file-info-row">
                      <span style={{ color: 'var(--success)' }}>✓ {t('lessons.youtubeLinkAdded')}</span>
                      <button
                        type="button"
                        className="btn-icon-small"
                        onClick={() => {
                          setLessonFormData({ ...lessonFormData, youtubeUrl: '' });
                        }}
                      >
                        <FiX />
                      </button>
                    </div>
                  </div>
                )}
                <p className="form-help">
                  {t('lessons.youtubeUrlHelp')}
                </p>
              </>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">{t('lessons.thumbnail')} ({t('common.optional')})</label>
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
                <FiUpload /> {t('lessons.uploadImage')}
              </button>
            </div>
            {lessonFormData.thumbnailFile && (
              <p className="form-help">
                  {t('lessons.selected')}: {lessonFormData.thumbnailFile.name}
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
        setLessonFormData({ 
          title: '', 
          description: '', 
          videoFile: null, 
          thumbnailFile: null,
          attachedFiles: [],
          duration: null,
          videoSource: 'upload',
          youtubeUrl: ''
        });
                setSelectedCourse(null);
                if (videoInputRef.current) {
                  videoInputRef.current.value = '';
                }
              }}
              disabled={uploadingVideo}
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={uploadingVideo || gettingDuration}
            >
              {uploadingVideo ? t('common.uploading') : t('common.add')}
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
          setLessonFormData({ 
            title: '', 
            description: '', 
            videoFile: null, 
            thumbnailFile: null, 
            attachedFiles: [], 
            duration: null,
            videoSource: 'upload',
            youtubeUrl: ''
          });
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
              placeholder={t('lessons.lessonDescriptionExample')}
              rows="4"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Video manbasi (ixtiyoriy - yangilash uchun)</label>
            
            {/* Video manbasi tanlash */}
            <div className="video-source-toggle" style={{ marginBottom: '16px' }}>
              <label className="toggle-option">
                <input
                  type="radio"
                  name="videoSource-edit"
                  value="upload"
                  checked={lessonFormData.videoSource === 'upload'}
                  onChange={(e) => {
                    setLessonFormData({ 
                      ...lessonFormData, 
                      videoSource: e.target.value,
                      videoFile: null,
                      youtubeUrl: '',
                      duration: null
                    });
                    if (videoInputRef.current) {
                      videoInputRef.current.value = '';
                    }
                  }}
                />
                <span>{t('lessons.videoFile')}</span>
              </label>
              <label className="toggle-option">
                <input
                  type="radio"
                  name="videoSource-edit"
                  value="youtube"
                  checked={lessonFormData.videoSource === 'youtube'}
                  onChange={(e) => {
                    setLessonFormData({ 
                      ...lessonFormData, 
                      videoSource: e.target.value,
                      videoFile: null,
                      duration: null
                    });
                    if (videoInputRef.current) {
                      videoInputRef.current.value = '';
                    }
                  }}
                />
                <span>{t('lessons.youtubeUrl')}</span>
              </label>
            </div>

            {lessonFormData.videoSource === 'upload' ? (
              <>
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
                <FiUpload /> {t('lessons.uploadVideo')}
              </button>
            </div>
                {editingLesson?.lesson?.videoType === 'uploaded' && !lessonFormData.videoFile && (
                  <p className="form-help" style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                    Hozirgi video: {editingLesson.lesson.videoURL ? 'Yuklangan video' : 'Video mavjud emas'}
                  </p>
                )}
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
              </>
            ) : (
              <>
                <input
                  type="text"
                  className="form-input"
                  value={lessonFormData.youtubeUrl}
                  onChange={handleYouTubeUrlChange}
                  placeholder={t('lessons.youtubeUrlExample')}
                  disabled={loadingYouTubeInfo}
                />
                {loadingYouTubeInfo && (
                  <p className="form-help" style={{ color: 'var(--info)', marginTop: '8px' }}>
                    ⏳ YouTube video ma'lumotlari olinmoqda...
                  </p>
                )}
                {editingLesson?.lesson?.videoType === 'youtube' && !lessonFormData.youtubeUrl && !loadingYouTubeInfo && (
                  <p className="form-help" style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                    {t('lessons.currentVideo')}: {t('lessons.youtubeUrl')}
                  </p>
                )}
                {lessonFormData.youtubeUrl && !loadingYouTubeInfo && (
                  <div className="selected-file-info" style={{ marginTop: '8px' }}>
                    <div className="file-info-row">
                      <span style={{ color: 'var(--success)' }}>✓ {t('lessons.youtubeLinkAdded')}</span>
                      <button
                        type="button"
                        className="btn-icon-small"
                        onClick={() => {
                          setLessonFormData({ ...lessonFormData, youtubeUrl: '' });
                        }}
                      >
                        <FiX />
                      </button>
                    </div>
                  </div>
                )}
                <p className="form-help">
                  {t('lessons.youtubeUrlHelp')}
                </p>
              </>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">{t('lessons.thumbnail')} ({t('common.optional')})</label>
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
                <FiUpload /> {t('lessons.uploadImage')}
              </button>
            </div>
            {editingLesson?.lesson?.thumbnailURL && !lessonFormData.thumbnailFile && (
              <p className="form-help">
                Hozirgi thumbnail mavjud. Yangi thumbnail yuklash ixtiyoriy.
              </p>
            )}
            {lessonFormData.thumbnailFile && (
              <p className="form-help">
                  {t('lessons.selected')}: {lessonFormData.thumbnailFile.name}
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
              {t('common.cancel')}
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
        title={t('common.confirm')}
        message={t('lessons.deleteCourseConfirm')}
        confirmText={t('common.yesDelete')}
        cancelText={t('common.cancel')}
        type="danger"
      />
    </div>
  );
};

export default MyLessons;

