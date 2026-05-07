const {onCall, onRequest, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore} = require("firebase-admin/firestore");
const {getStorage} = require("firebase-admin/storage");

// Initialize Firebase Admin
initializeApp();

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

/**
 * Delete user from both Firestore and Firebase Authentication
 * This function can only be called by authenticated admin usersF
 * 
 * @param {string} userId - The user ID to delete
 * @param {string} userEmail - The user's email address
 * @returns {Promise<{success: boolean, message: string}>}
 */
exports.deleteUser = onCall({
  cors: true,
  enforceAppCheck: false,
  region: 'us-central1',
}, async (request) => {
  try {
    // Check if user is authenticated
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Foydalanuvchi autentifikatsiya qilinmagan"
      );
    }

    const callerUid = request.auth.uid;
    const {userId, userEmail} = request.data;

    if (!userId || !userEmail) {
      throw new HttpsError(
        "invalid-argument",
        "userId va userEmail majburiy"
      );
    }

    // Check if caller is admin
    const callerDoc = await db.collection("users").doc(callerUid).get();
    if (!callerDoc.exists) {
      throw new HttpsError(
        "permission-denied",
        "Foydalanuvchi topilmadi"
      );
    }

    const callerData = callerDoc.data();
    if (callerData.role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Faqat admin foydalanuvchini o'chira oladi"
      );
    }

    // Prevent self-deletion
    if (callerUid === userId) {
      throw new HttpsError(
        "invalid-argument",
        "O'zingizni o'chira olmaysiz"
      );
    }

    // Delete from Firestore
    await db.collection("users").doc(userId).delete();

    // Delete from Firebase Authentication
    try {
      await auth.deleteUser(userId);
    } catch (authError) {
      // If user doesn't exist in Auth, that's okay - continue
      if (authError.code !== "auth/user-not-found") {
        console.error("Auth delete error:", authError);
        // Still continue with Firestore deletion
      }
    }

    // Store deleted email info for reference
    await db.collection("deletedEmails").doc(userId).set({
      email: userEmail,
      deletedAt: new Date().toISOString(),
      deletedBy: callerUid,
    });

    return {
      success: true,
      message: "Foydalanuvchi muvaffaqiyatli o'chirildi",
    };
  } catch (error) {
    console.error("Delete user error:", error);
    
    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      error.message || "Foydalanuvchini o'chirishda xatolik yuz berdi"
    );
  }
});

exports.getTermsList = onRequest({
  cors: true,
  region: 'us-central1',
}, async (req, res) => {
  try {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Check authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get token from header
    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Verify token (optional - for production)
    // const decodedToken = await getAuth().verifyIdToken(token);

    const bucket = getStorage().bucket();
    const file = bucket.file('terminlar/terminlar.json');
    const [contents] = await file.download();
    const terms = JSON.parse(contents.toString('utf-8'));

    res.set('Content-Type', 'application/json');
    res.json({
      success: true,
      terms,
    });
  } catch (error) {
    console.error('Get terms list error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error loading terms',
    });
  }
});

