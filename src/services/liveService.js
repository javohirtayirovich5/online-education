import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'liveSessions';

export const liveService = {
  async createSession({ groupId, teacherId, provider = 'jitsi', room }) {
    try {
      const payload = {
        groupId: groupId || null,
        teacherId: teacherId || null,
        provider,
        room,
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

  async endSession(sessionId) {
    try {
      const ref = doc(db, COLLECTION_NAME, sessionId);
      await updateDoc(ref, { isLive: false, endedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      console.error('End live session error:', error);
      return { success: false, error: error.message };
    }
  },

  async getActiveSessionForGroup(groupId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('groupId', '==', groupId),
        where('isLive', '==', true),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return { success: true, data: null };
      const d = snapshot.docs[0];
      return { success: true, data: { id: d.id, ...d.data() } };
    } catch (error) {
      console.error('Get active session error:', error);
      return { success: false, error: error.message };
    }
  }
};
