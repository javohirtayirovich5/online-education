import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './firebase';

export const authService = {
  // Register new user
  async register(email, password, userData) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile
      await updateProfile(user, {
        displayName: userData.displayName,
        photoURL: userData.photoURL || '/default-avatar.png'
      });

      // Send verification email
      await sendEmailVerification(user);

      // Create user document in Firestore
      const userDoc = {
        uid: user.uid,
        email: email,
        displayName: userData.displayName,
        photoURL: userData.photoURL || '/default-avatar.png',
        role: userData.role || 'student',
        phoneNumber: userData.phoneNumber || '',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        isApproved: userData.role === 'student' ? true : false, // Teachers need admin approval
        bio: '',
        address: ''
      };

      // Talaba uchun qo'shimcha maydonlar
      if (userData.role === 'student') {
        userDoc.facultyId = userData.facultyId || '';
        userDoc.facultyName = userData.facultyName || '';
        userDoc.departmentId = userData.departmentId || '';
        userDoc.departmentName = userData.departmentName || '';
        userDoc.groupId = userData.groupId || '';
        userDoc.groupName = userData.groupName || '';
      }

      // O'qituvchi uchun qo'shimcha maydonlar
      if (userData.role === 'teacher') {
        userDoc.subjectIds = userData.subjectIds || []; // Bir nechta fan ID lari
        userDoc.subjectNames = userData.subjectNames || []; // Fan nomlari
        userDoc.assignedGroups = []; // Admin keyinroq biriktiradi
      }

      await setDoc(doc(db, 'users', user.uid), userDoc);

      return { success: true, user };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: error.message };
    }
  },

  // Login
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update last active
      await updateDoc(doc(db, 'users', user.uid), {
        lastActive: new Date().toISOString()
      });

      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  },

  // Logout
  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  },

  // Reset password
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get user data
  async getUserData(uid) {
    try {
      const docSnap = await getDoc(doc(db, 'users', uid));
      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() };
      }
      return { success: false, error: 'User not found' };
    } catch (error) {
      console.error('Get user data error:', error);
      return { success: false, error: error.message };
    }
  },

  // Update user profile
  async updateUserProfile(uid, updates) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      // Update auth profile if displayName or photoURL changed
      if (updates.displayName || updates.photoURL) {
        await updateProfile(auth.currentUser, {
          displayName: updates.displayName,
          photoURL: updates.photoURL
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete user (Admin only - deletes from Firestore and Firebase Authentication)
  // Uses Cloud Function to delete from Authentication
  async deleteUser(userId, userEmail) {
    try {
      const deleteUserFunction = httpsCallable(functions, 'deleteUser');
      
      // Call Cloud Function
      const result = await deleteUserFunction({ userId, userEmail });
      
      if (result.data.success) {
        return { success: true, message: result.data.message };
      } else {
        return { success: false, error: result.data.error || 'Xatolik yuz berdi' };
      }
    } catch (error) {
      console.error('Delete user error:', error);
      // Handle specific error codes
      if (error.code === 'functions/permission-denied') {
        return { success: false, error: 'Sizda foydalanuvchini o\'chirish uchun ruxsat yo\'q' };
      } else if (error.code === 'functions/unauthenticated') {
        return { success: false, error: 'Autentifikatsiya qilinmagan' };
      } else if (error.code === 'functions/not-found') {
        return { success: false, error: 'Cloud Function topilmadi. Iltimos, funksiyani deploy qiling.' };
      }
      return { success: false, error: error.message || 'Xatolik yuz berdi' };
    }
  },

  // Check if email was previously deleted (to allow reuse)
  async checkDeletedEmail(email) {
    try {
      const deletedEmailsRef = collection(db, 'deletedEmails');
      const snapshot = await getDocs(deletedEmailsRef);
      const deletedEmails = snapshot.docs.map(doc => doc.data().email);
      return deletedEmails.includes(email);
    } catch (error) {
      console.error('Check deleted email error:', error);
      return false;
    }
  }
};

