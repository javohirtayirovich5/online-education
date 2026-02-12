import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { uz } from 'date-fns/locale';

// Format date
export const formatDate = (date, formatStr = 'dd MMMM yyyy, HH:mm') => {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string'
      ? parseISO(date)
      : (date?.toDate ? date.toDate() : date);

    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
    return format(dateObj, formatStr, { locale: uz });
  } catch (error) {
    console.error('Format date error:', error);
    return '';
  }
};

// Format relative time (e.g., "2 soat oldin")
export const formatRelativeTime = (date) => {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string'
      ? parseISO(date)
      : (date?.toDate ? date.toDate() : date);
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: uz });
  } catch (error) {
    console.error('Format relative time error:', error);
    return '';
  }
};

// Truncate text
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Format file size
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// Validate email
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Validate phone number (Uzbekistan format)
export const validatePhone = (phone) => {
  const re = /^\+998[0-9]{9}$/;
  return re.test(phone);
};

// Calculate grade letter
export const getGradeLetter = (score) => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

// Calculate average grade
export const calculateAverage = (grades) => {
  if (!grades || grades.length === 0) return 0;
  const sum = grades.reduce((acc, grade) => acc + grade, 0);
  return Math.round((sum / grades.length) * 100) / 100;
};

// Calculate course progress
export const calculateProgress = (completed, total) => {
  if (!total || total === 0) return 0;
  return Math.round((completed / total) * 100);
};

// Generate random ID
export const generateId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Get initials from name
export const getInitials = (name) => {
  if (!name) return '';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

// Sort array by key
export const sortBy = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    if (order === 'asc') {
      return a[key] > b[key] ? 1 : -1;
    }
    return a[key] < b[key] ? 1 : -1;
  });
};

// Filter array by search term
export const filterBySearch = (array, searchTerm, keys) => {
  if (!searchTerm) return array;
  const term = searchTerm.toLowerCase();
  return array.filter(item =>
    keys.some(key => {
      const value = item[key];
      return value && value.toString().toLowerCase().includes(term);
    })
  );
};

// Group array by key
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
};

// Check if date is past
export const isPastDate = (date) => {
  if (!date) return false;
  try {
    const dateObj = typeof date === 'string'
      ? parseISO(date)
      : (date?.toDate ? date.toDate() : date);
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return false;
    return dateObj < new Date();
  } catch (e) {
    return false;
  }
};

// Check if date is today
export const isToday = (date) => {
  if (!date) return false;
  try {
    const dateObj = typeof date === 'string'
      ? parseISO(date)
      : (date?.toDate ? date.toDate() : date);
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return false;
    const today = new Date();
    return dateObj.toDateString() === today.toDateString();
  } catch (e) {
    return false;
  }
};

// Get color for grade
export const getGradeColor = (score) => {
  if (score >= 90) return '#10b981'; // green
  if (score >= 80) return '#3b82f6'; // blue
  if (score >= 70) return '#f59e0b'; // orange
  if (score >= 60) return '#f97316'; // dark orange
  return '#ef4444'; // red
};

// Get status badge color
export const getStatusColor = (status) => {
  const colors = {
    active: '#10b981',
    inactive: '#6b7280',
    pending: '#f59e0b',
    approved: '#3b82f6',
    rejected: '#ef4444',
    completed: '#10b981',
    ongoing: '#3b82f6',
    draft: '#6b7280'
  };
  return colors[status] || colors.inactive;
};

// Calculate time remaining until due date
export const getTimeRemaining = (dueDate) => {
  if (!dueDate) return null;
  
  try {
    const due = typeof dueDate === 'string'
      ? parseISO(dueDate)
      : (dueDate?.toDate ? dueDate.toDate() : dueDate);
    if (!(due instanceof Date) || isNaN(due.getTime())) return null;
    const now = new Date();
    const diff = due - now;
    
    if (diff < 0) {
      return { expired: true, text: 'Muddat o\'tgan' };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return { expired: false, days, hours, minutes, text: `${days} kun, ${hours} soat qoldi` };
    } else if (hours > 0) {
      return { expired: false, days: 0, hours, minutes, text: `${hours} soat, ${minutes} daqiqa qoldi` };
    } else {
      return { expired: false, days: 0, hours: 0, minutes, text: `${minutes} daqiqa qoldi` };
    }
  } catch (error) {
    console.error('Calculate time remaining error:', error);
    return null;
  }
};

