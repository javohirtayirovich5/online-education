import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { googleMeetService } from './googleMeetService';

const COLLECTION_NAME = 'liveSessions';

export const liveService = {
  async createSession({ groupId, teacherId, room, googleAccessToken, summary, description, attendees }) {
    try {
      let meetData = null;

      const meetResult = await googleMeetService.createEvent(googleAccessToken, {
        summary: summary || `Group ${groupId} - Live Lesson`,
        description: description || '',
        attendees: attendees || []
      });
      
      if (meetResult.success) {
        meetData = {
          eventId: meetResult.data.eventId,
          meetLink: meetResult.data.meetLink,
          meetCode: meetResult.data.meetCode,
          htmlLink: meetResult.data.htmlLink
        };
        room = meetResult.data.meetCode || meetResult.data.meetLink;
      } else {
        return { success: false, error: meetResult.error || 'Failed to create Google Meet event' };
      }

      const payload = {
        groupId: groupId || null,
        teacherId: teacherId || null,
        provider: 'google-meet',
        room,
        meetData,
        isLive: true,
        startAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      const ref = await addDoc(collection(db, COLLECTION_NAME), payload);
      return { success: true, id: ref.id, data: { id: ref.id, ...payload } };
    } catch (error) {
      console.error('Create live session error:', error);
      return { success: false, error: error.message };
    }
  },

  async endSession(sessionId, googleAccessToken, teacherId) {
    try {
      const sessionRef = doc(db, COLLECTION_NAME, sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) {
        return { success: false, error: 'Session not found' };
      }

      const sessionData = sessionDoc.data();
      
      // Faqat o'z efirini to'xtata olish
      if (sessionData.teacherId !== teacherId) {
        return { success: false, error: 'You can only end your own sessions' };
      }

      if (sessionData.meetData?.eventId && googleAccessToken) {
        await googleMeetService.deleteEvent(googleAccessToken, sessionData.meetData.eventId);
      }

      await updateDoc(sessionRef, { isLive: false, endedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      console.error('End live session error:', error);
      return { success: false, error: error.message };
    }
  },

  async getActiveSessionsForGroup(groupId, teacherId = null) {
    try {
      let q;
      if (teacherId) {
        // O'qituvchi uchun: faqat o'z efirlarini ko'rsatish
        q = query(
          collection(db, COLLECTION_NAME),
          where('groupId', '==', groupId),
          where('teacherId', '==', teacherId),
          where('isLive', '==', true)
        );
      } else {
        // Talaba uchun: barcha faol efirlarni ko'rsatish
        q = query(
          collection(db, COLLECTION_NAME),
          where('groupId', '==', groupId),
          where('isLive', '==', true)
        );
      }
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return { success: true, data: [] };
      
      const sessions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return { success: true, data: sessions };
    } catch (error) {
      console.error('Get active sessions error:', error);
      return { success: false, error: error.message };
    }
  },

  // Backward compatibility
  async getActiveSessionForGroup(groupId) {
    const result = await this.getActiveSessionsForGroup(groupId);
    if (result.success && result.data && result.data.length > 0) {
      return { success: true, data: result.data[0] };
    }
    return { success: true, data: null };
  }
};
