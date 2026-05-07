import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch
} from 'firebase/firestore';

// Firebase konfiguratsiya
const firebaseConfig = {
  apiKey: "AIzaSyDIwJPSEULiqg2PB64tPv8esAHCHPBlHmQ",
  authDomain: "education-pro1.firebaseapp.com",
  projectId: "education-pro1",
  storageBucket: "education-pro1.firebasestorage.app",
  messagingSenderId: "1087873877448",
  appId: "1:1087873877448:web:d4955231340208905b6cfd",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MIN_STUDENTS = 100;
const MAX_STUDENTS = 150;

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const shuffle = (array) => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const chooseRandom = (items, count) => {
  if (items.length <= count) return [...items];
  return shuffle(items).slice(0, count);
};

const generateScore = (maxScore) => {
  if (maxScore <= 0) return 0;

  const roll = Math.random();
  let score;

  if (roll < 0.05) {
    score = getRandomInt(50, Math.max(60, Math.min(maxScore, 69)));
  } else if (roll < 0.85) {
    score = getRandomInt(70, Math.max(70, Math.min(maxScore, 89)));
  } else {
    score = getRandomInt(90, maxScore);
  }

  return Math.min(score, maxScore);
};

const normalizeStudentName = (studentData) => {
  return studentData.displayName || studentData.fullName || studentData.name || studentData.username || 'Talaba';
};

const randomNormal = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

const getTestAverageTarget = () => {
  const roll = Math.random();
  if (roll < 0.08) return getRandomInt(90, 98);
  if (roll < 0.5) return getRandomInt(80, 89);
  if (roll < 0.88) return getRandomInt(70, 79);
  return getRandomInt(60, 69);
};

const generateScoreForTest = (maxScore, averageTarget) => {
  if (maxScore <= 0) return 0;

  const target = Math.min(98, Math.max(40, averageTarget));
  const roll = Math.random();
  let percentage;

  if (roll < 0.06) {
    percentage = getRandomInt(Math.max(40, target - 20), Math.min(69, target - 5));
  } else if (roll < 0.32) {
    percentage = getRandomInt(Math.max(60, target - 10), Math.min(79, target + 5));
  } else if (roll < 0.75) {
    percentage = getRandomInt(Math.max(75, target - 5), Math.min(89, target + 10));
  } else if (roll < 0.9) {
    percentage = getRandomInt(Math.max(82, target), Math.min(94, target + 6));
  } else {
    percentage = getRandomInt(Math.max(90, target), Math.min(98, target + 4));
  }

  percentage = Math.min(98, Math.max(40, percentage));
  return Math.round((percentage / 100) * maxScore);
};

const run = async () => {
  try {
    console.log('1) Studentlarni yuklash...');
    const studentsSnapshot = await getDocs(
      query(
        collection(db, 'users'),
        where('role', '==', 'student')
      )
    );

    const studentDocs = studentsSnapshot.docs;
    if (studentDocs.length === 0) {
      throw new Error('`users` kolleksiyada `student` roliga ega foydalanuvchi topilmadi.');
    }

    console.log(`- Topilgan studentlar soni: ${studentDocs.length}`);

    console.log('2) Testlarni yuklash...');
    const testsSnapshot = await getDocs(collection(db, 'tests'));
    const tests = testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (tests.length === 0) {
      throw new Error('`tests` kolleksiyada hech qanday test topilmadi.');
    }

    console.log(`- Toplam testlar soni: ${tests.length}`);

    const batchLimit = 450;
    let batch = writeBatch(db);
    let createdCount = 0;
    let batchCount = 0;
    let currentBatchSize = 0;

    const commitBatch = async () => {
      if (currentBatchSize === 0) return;
      await batch.commit();
      batchCount += 1;
      batch = writeBatch(db);
      currentBatchSize = 0;
    };

    for (const test of tests) {
      const testMaxScore = typeof test.maxScore === 'number' ? test.maxScore : 100;
      const targetAverage = getTestAverageTarget();
      const studentCount = Math.min(getRandomInt(100, 180), studentDocs.length);
      const selectedStudents = chooseRandom(studentDocs, studentCount);

      console.log(`- Test: ${test.title || 'noma’lum'} (${test.id}), maxScore=${testMaxScore}, studentCount=${studentCount}, avgTarget=${targetAverage}%`);

      const existingAnswersSnapshot = await getDocs(
        query(
          collection(db, 'testAnswers'),
          where('testId', '==', test.id)
        )
      );

      const existingStudentIds = new Set(
        existingAnswersSnapshot.docs.map(doc => doc.data()?.studentId).filter(Boolean)
      );

      const newStudents = selectedStudents.filter(studentDoc => !existingStudentIds.has(studentDoc.id));
      console.log(`  - Yangi answer yaratish uchun studentlar: ${newStudents.length}`);

      for (const studentDoc of newStudents) {
        const studentData = studentDoc.data();
        const studentId = studentDoc.id;
        const score = generateScoreForTest(testMaxScore, targetAverage);
        const percentage = testMaxScore > 0 ? Math.round((score / testMaxScore) * 100) : 0;
        const studentName = normalizeStudentName(studentData);

        const answerRef = doc(collection(db, 'testAnswers'));
        batch.set(answerRef, {
          testId: test.id,
          studentId,
          studentName,
          groupId: studentData.groupId || studentData.group?.id || null,
          score,
          maxScore: testMaxScore,
          percentage,
          isGraded: true,
          gradedAt: new Date().toISOString(),
          testTitle: test.title || '',
        });

        createdCount += 1;
        currentBatchSize += 1;

        if (currentBatchSize >= batchLimit) {
          console.log(`  - Batch ${batchCount + 1} commit qilinyapti (${currentBatchSize} hujjat)...`);
          await commitBatch();
        }
      }
    }

    await commitBatch();

    if (createdCount === 0) {
      console.log('Hech qanday yangi testAnswers yaratilgani yo‘q — barcha tanlangan studentlar uchun oldindan natijalar mavjud.');
      return;
    }

    console.log(`4) Umumiy ${createdCount} ta fake testAnswers yaratildi.`);
    console.log(`   Batchlar soni: ${batchCount}`);
    console.log('Eslatma: `submittedAt` maydoni qo‘shilmadi.');
  } catch (error) {
    console.error('❌ Xatolik:', error.message || error);
  }
};

run();
