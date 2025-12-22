// User Roles
export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student'
};

// Course Categories
export const CATEGORIES = [
  'Matematika',
  'Fizika',
  'Kimyo',
  'Biologiya',
  'Informatika',
  'Tarix',
  'Adabiyot',
  'Tillar',
  'Iqtisodiyot',
  'Huquq',
  'Boshqa'
];

// Assignment Types
export const ASSIGNMENT_TYPES = {
  TEXT: 'text',
  FILE: 'file',
  CODE: 'code'
};

// Quiz Question Types
export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: 'multiple_choice',
  TRUE_FALSE: 'true_false',
  SHORT_ANSWER: 'short_answer',
  ESSAY: 'essay'
};

// Attendance Status
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused'
};

// Notification Types
export const NOTIFICATION_TYPES = {
  ANNOUNCEMENT: 'announcement',
  ASSIGNMENT: 'assignment',
  GRADE: 'grade',
  MESSAGE: 'message',
  COURSE: 'course',
  SYSTEM: 'system'
};

// File Upload Limits (in MB)
export const UPLOAD_LIMITS = {
  PROFILE_PICTURE: 5,
  COURSE_THUMBNAIL: 5,
  VIDEO: 500,
  DOCUMENT: 50,
  ASSIGNMENT: 50
};

// Supported File Types
export const FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  VIDEO: ['video/mp4', 'video/webm', 'video/ogg'],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
};

// Date Formats
export const DATE_FORMATS = {
  FULL: 'dd MMMM yyyy, HH:mm',
  DATE_ONLY: 'dd MMMM yyyy',
  TIME_ONLY: 'HH:mm',
  SHORT: 'dd.MM.yyyy'
};

// Pagination
export const ITEMS_PER_PAGE = 10;

// Grade Scales (5 ballik tizim)
export const GRADE_SCALE_5 = {
  5: { min: 5, max: 5, label: 'A\'lo', color: '#10b981' },
  4: { min: 4, max: 4, label: 'Yaxshi', color: '#3b82f6' },
  3: { min: 3, max: 3, label: 'Qoniqarli', color: '#f59e0b' },
  2: { min: 2, max: 2, label: 'Qoniqarsiz', color: '#ef4444' },
  1: { min: 1, max: 1, label: 'Yomon', color: '#dc2626' }
};

// Semestrlar
export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

// Kurslar (yillar)
export const YEARS = [1, 2, 3, 4];

// Hafta kunlari
export const WEEKDAYS = [
  'Dushanba',
  'Seshanba',
  'Chorshanba',
  'Payshanba',
  'Juma',
  'Shanba'
];

export const TOAST_CONFIG = {
  position: 'top-right',
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true
};

