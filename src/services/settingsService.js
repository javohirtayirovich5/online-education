import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'settings';
const SEMESTER_DOC_ID = 'semester';

export const settingsService = {
  // Semestr sozlamalarini olish
  async getSemesterSettings() {
    try {
      const ref = doc(db, COLLECTION_NAME, SEMESTER_DOC_ID);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return { success: true, data: null };
      }
      return { success: true, data: snap.data() };
    } catch (error) {
      console.error('Get semester settings error:', error);
      return { success: false, error: error.message };
    }
  },

  // Semestr sozlamalarini saqlash (admin)
  async saveSemesterSettings(settings) {
    try {
      const ref = doc(db, COLLECTION_NAME, SEMESTER_DOC_ID);
      await setDoc(ref, settings, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Save semester settings error:', error);
      return { success: false, error: error.message };
    }
  }
};


