import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiX, FiCheck, FiCheckCircle, FiTrash2 } from 'react-icons/fi';
import { notificationService } from '../../services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';
import { toast } from 'react-toastify';
import './NotificationDropdown.css';

const NotificationDropdown = ({ userId, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unsubscribe, setUnsubscribe] = useState(null);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);

    // Subscribe to real-time notifications
    const unsub = notificationService.subscribeToNotifications(
      userId,
      (result) => {
        if (result.success) {
          setNotifications(result.data);
        }
        setLoading(false);
      },
      { limitCount: 10 }
    );

    setUnsubscribe(() => unsub);

    return () => {
      if (unsub) unsub();
    };
  }, [userId]);

  const handleMarkAsRead = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(notificationId);
    } catch (error) {
      toast.error('Bildirishnomani o\'qish belgilashda xato');
    }
  };

  const handleDelete = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(notificationId);
      toast.success('Bildirishnoma o\'chirildi');
    } catch (error) {
      toast.error('Bildirishnomani o\'chirishda xato');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(userId);
      toast.success('Barcha bildirishnomalar o\'qilgan deb belgilandi');
    } catch (error) {
      toast.error('Xatolik yuzaga keldi');
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      test_created: '📝',
      test_graded: '✅',
      assignment_created: '📋',
      assignment_graded: '✔️',
      grade_posted: '📊',
      announcement: '📢',
      comment: '💬',
      enrollment: '🎓',
      system: 'ℹ️'
    };
    return icons[type] || '🔔';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      return formatDistanceToNow(timestamp.toDate ? timestamp.toDate() : new Date(timestamp), {
        addSuffix: true,
        locale: uz
      });
    } catch (error) {
      return '';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="notification-dropdown">
      <div className="dropdown-header">
        <div className="header-title">
          <h3>Bildirishnomalar</h3>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </div>
        <button 
          className="close-btn"
          onClick={onClose}
          title="Yopish"
        >
          <FiX size={18} />
        </button>
      </div>

      {unreadCount > 0 && (
        <button 
          className="mark-all-btn"
          onClick={handleMarkAllAsRead}
        >
          <FiCheckCircle size={16} /> Barchasini o'qilgan deb belgilash
        </button>
      )}

      {loading ? (
        <div className="notification-loading">
          <p>Yuklanmoqda...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="notification-empty">
          <p>Bildirishnomalar yo'q</p>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="notification-content">
                <p className="notification-title">{notification.title}</p>
                <p className="notification-text">{notification.message}</p>
                <span className="notification-time">
                  {formatTime(notification.createdAt)}
                </span>
              </div>

              <div className="notification-actions">
                {!notification.isRead && (
                  <button
                    className="action-btn"
                    onClick={(e) => handleMarkAsRead(notification.id, e)}
                    title="O'qilgan deb belgilash"
                  >
                    <FiCheck size={16} />
                  </button>
                )}
                <button
                  className="action-btn delete-btn"
                  onClick={(e) => handleDelete(notification.id, e)}
                  title="O'chirish"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Link to="/notifications" className="view-all-link">
        Barchasini ko'rish →
      </Link>
    </div>
  );
};

export default NotificationDropdown;
