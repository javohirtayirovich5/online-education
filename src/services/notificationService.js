import { db } from './firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

class NotificationService {
  // Get user's notifications (real-time)
  subscribeToNotifications(userId, callback, options = {}) {
    const { limitCount = 10 } = options;
    
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
      // orderBy removed - using client-side sort instead
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        let notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Client-side sorting by createdAt descending
        notifications = notifications.sort((a, b) => {
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return timeB - timeA;
        }).slice(0, limitCount);
        
        callback({ success: true, data: notifications });
      },
      (error) => {
        console.error('Error fetching notifications:', error);
        callback({ success: false, error: error.message });
      }
    );

    return unsubscribe;
  }

  // Get unread notifications count
  subscribeToUnreadCount(userId, callback) {
    const unreadQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(
      unreadQuery,
      (snapshot) => {
        callback(snapshot.size);
      },
      (error) => {
        console.error('Error fetching unread count:', error);
        callback(0);
      }
    );

    return unsubscribe;
  }

  // Get all notifications for user (paginated)
  async getNotifications(userId, pageSize = 20, startAfter = null) {
    try {
      // Simple query without orderBy - using client-side sort
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(notificationsQuery);
      let notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Client-side sorting by createdAt descending
      notifications = notifications.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });

      // Apply pagination on sorted results
      const paginatedNotifications = notifications.slice(0, pageSize);
      const hasMore = notifications.length > pageSize;

      return {
        success: true,
        data: paginatedNotifications,
        hasMore,
        lastDoc: paginatedNotifications.length > 0 ? snapshot.docs[paginatedNotifications.length - 1] : null
      };
    } catch (error) {
      console.error('Error getting notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Create notification
  async createNotification(notificationData) {
    try {
      const notification = await addDoc(
        collection(db, 'notifications'),
        {
          ...notificationData,
          isRead: false,
          createdAt: serverTimestamp()
        }
      );

      return { success: true, data: { id: notification.id, ...notificationData } };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark as read
  async markAsRead(notificationId) {
    try {
      await updateDoc(
        doc(db, 'notifications', notificationId),
        { isRead: true, readAt: serverTimestamp() }
      );

      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark all as read for user
  async markAllAsRead(userId) {
    try {
      const batch = writeBatch(db);
      
      const snapshot = await getDocs(
        query(
          collection(db, 'notifications'),
          where('userId', '==', userId),
          where('isRead', '==', false)
        )
      );

      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          isRead: true,
          readAt: serverTimestamp()
        });
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Error marking all as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete all notifications for user
  async deleteAllNotifications(userId) {
    try {
      const batch = writeBatch(db);
      
      const snapshot = await getDocs(
        query(
          collection(db, 'notifications'),
          where('userId', '==', userId)
        )
      );

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Clean up old notifications (older than 30 days)
  async cleanupOldNotifications(userId) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const batch = writeBatch(db);
      
      const snapshot = await getDocs(
        query(
          collection(db, 'notifications'),
          where('userId', '==', userId),
          where('createdAt', '<', thirtyDaysAgo)
        )
      );

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return { success: true, deletedCount: snapshot.size };
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Get notification types for filtering
  getNotificationTypes() {
    return {
      TEST_CREATED: 'test_created',
      TEST_GRADED: 'test_graded',
      ASSIGNMENT_CREATED: 'assignment_created',
      ASSIGNMENT_GRADED: 'assignment_graded',
      GRADE_POSTED: 'grade_posted',
      ANNOUNCEMENT: 'announcement',
      COMMENT: 'comment',
      ENROLLMENT: 'enrollment',
      SYSTEM: 'system'
    };
  }
}

export const notificationService = new NotificationService();
