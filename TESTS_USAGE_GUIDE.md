# Tests (Testlar) Moduli - Qo'llash Ko'rsatmasi

## 📝 Modulning Umumiy Ta'rifi

Testlar moduli o'qituvchilar va talabalarning test yaratish, o'tkazish va natijalarini boshqarish imkoniyatini beradi. Bu modul quyidagi xususiyatlarga ega:

### O'qituvchi Funksiyalari:
- ✅ Yangi testlar yaratish
- ✅ Testlarni tahrirlash
- ✅ Testlarni o'chirish
- ✅ Testlarni ma'lum guruhlar uchun belgilash yoki hamma uchun ochiqlash
- ✅ Talabalarning test natijalarini ko'rish (avtomatik hisoblash)
- ✅ Natijalarni turli xil usulda saralash

### Talaba Funksiyalari:
- ✅ Dostupable testlarni ko'rish
- ✅ Testlarni vaqt chegarasi bilan o'tkazish
- ✅ Test yakunida natijalarni ko'rish (foiz va ball)
- ✅ Oldingi natijalarini ko'rish va reytingda o'rni bilan tanishish

---

## 📁 Fayl Strukturasi

```
src/
├── services/
│   └── testService.js              # Test CRUD operatsiyalari
├── pages/
│   ├── teacher/
│   │   ├── TeacherTests.jsx        # O'qituvchi testlar sahifasi
│   │   └── TeacherTests.css
│   └── student/
│       ├── StudentTests.jsx        # Talaba testlar sahifasi
│       └── StudentTests.css
├── components/
│   └── tests/
│       ├── TestEditor.jsx          # Test yaratish/tahrirlash forma
│       ├── TestEditor.css
│       ├── StudentTestTaker.jsx    # Test o'tkazish interfeysi
│       ├── StudentTestTaker.css
│       ├── TestResultsModal.jsx    # O'qituvchining natijalar modal'i
│       ├── TestResultsModal.css
│       ├── TestResultsCard.jsx     # Talabaning natija kartasi
│       └── TestResultsCard.css
```

---

## 🗄️ Firestore Ma'lumotlar Tuzilmasi

### Collections:

#### 1. `tests` Collection
```javascript
{
  id: "test_id",
  title: "Matematika Test 1",
  description: "Butun sonlar haqida test",
  questions: [
    {
      type: "multiple",           // multiple | text
      text: "2 + 2 = ?",
      points: 1,                  // Savol uchun ball soni
      options: ["3", "4", "5"],
      correctAnswer: 1            // To'g'ri javob indeksi
    }
  ],
  createdBy: "teacher_uid",
  createdByName: "John Doe",
  visibleFor: "all",              // all | group
  groupId: null,                  // Agar visibleFor="group" bo'lsa
  timeLimit: 60,                  // Daqiqada
  status: "active",               // active | inactive
  createdAt: "2024-01-01T10:00:00Z"
}
```

#### 2. `testAnswers` Collection
```javascript
{
  id: "answer_id",
  studentId: "student_uid",
  studentName: "Ali Valiyev",
  testId: "test_id",
  testTitle: "Matematika Test 1",
  groupId: "group_id",
  answers: {
    0: 1,      // Savol indeksi: talabaning javob indeksi
    1: 2,
    2: "Biror matn javob"
  },
  score: 90,              // To'plangan ball
  maxScore: 100,          // Maksimal ball
  percentage: 90,         // Foiz
  isGraded: true,         // Matnli savollar uchun manual grading
  submittedAt: "2024-01-01T11:30:00Z",
  gradedAt: "2024-01-01T12:00:00Z"  // Agar manual grading qilingan bo'lsa
}
```

---

## 🚀 Asosiy Funksiyalar

### TestService metodlari:

```javascript
// Test yaratish
testService.createTest(testData)

// Barcha testlarni olish
testService.getAllTests()

// ID bo'yicha test olish
testService.getTestById(testId)

// O'qituvchining testlarini olish
testService.getTestsByTeacher(teacherId)

// Talaba uchun dostupable testlarni olish
testService.getTestsForStudent(studentGroupId)

// Testni o'zgartirishlar bilan yangilash
testService.updateTest(testId, updates)

// Testni va uning barcha javoblarini o'chirish
testService.deleteTest(testId)

// Talaba javoblarini saqlash
testService.saveAnswers(answersData)

// Talabaning test topshiriq'ini olish
testService.getStudentTestSubmission(studentId, testId)

// Test uchun barcha topshiriq'larni olish
testService.getTestSubmissions(testId)

// Test natijasini hisoblash (avtomatik)
testService.calculateScore(questions, studentAnswers)

// Topshiriq'ni ball bilan yangilash (manual grading uchun)
testService.updateSubmissionScore(submissionId, score)

// Guruh uchun test natijalarini olish
testService.getGroupTestResults(testId, groupId)
```

---

## 🎯 Test Savollari Turlari

### 1. Bitta Variantni Tanlash (Multiple Choice)
```javascript
{
  type: "multiple",
  text: "2 + 2 = ?",
  points: 1,
  options: ["3", "4", "5"],
  correctAnswer: 1  // "4" indeksi
}
```

### 2. Matnli Javob (Text Response)
```javascript
{
  type: "text",
  text: "O'zbekiston poytaxti qaysi shahar?",
  points: 2
  // Manual grading kerak
}
```

---

## 📊 Ball Hisoblash Tizimi

- **Avtomatik hisoblash**: Multiple choice savollar avtomatik ishlanadi
- **Manual hisoblash**: Matnli savollar uchun o'qituvchi qo'lda ball berishi kerak
- **Foiz**: `(to'plangan ball / maksimal ball) * 100`
- **Reytinglar**:
  - 80-100%: A'lo (Excellent)
  - 70-79%: Yaxshi (Good)
  - 60-69%: Qoniqarli (Satisfactory)
  - 50-59%: Qabul (Pass)
  - 0-49%: Rad (Fail)

---

## 🎨 UI/UX Xususiyatlari

### O'qituvchi Interfeysi:
- Test kartalari ro'yxatida ko'rsatiladi
- Har bir test uchun tahrirlash, o'chirish, natijalarni ko'rish tugmalari
- Natijalar modal'ida saralash (ball bo'yicha yoki nom bo'yicha)
- O'rtacha ball, eng yuqori ball va topshiriq soni ko'rsatiladi
- Talabalarning reytingi avtomatik tuziladi

### Talaba Interfeysi:
- Ikkita tab: "Dostupable testlar" va "Mening natijalarim"
- Test kartalari Grid layout'da ko'rsatiladi
- Test o'tkazish to'liq ekran rejimida
- Savol navigatsiyasi (oldingi/keyingi/to'g'ri raqamni bosish)
- Vaqt qolgan vaqt timeri
- Natijalar ko'rinish ring chart'da ko'rsatiladi

---

## 🔒 Xavfsizlik va Ruxsatlar

- Testlar faqat o'qituvchi (o'zining testlari) tarafidan tahrirlanishi mumkin
- Talabalar faqat o'zlarining javoblarini ko'rishishi mumkin
- O'qituvchilar hamma talabalarning javoblarini ko'rishi mumkin
- Guruh chegarasi avtomatik tekshiriladi

---

## 💾 Firestore Qoidalari

Quyidagi qoidalari `firestore.rules` fayliga qo'shish kerak:

```javascript
match /tests/{document=**} {
  allow read: if request.auth != null;
  allow create, update, delete: if request.auth.uid == resource.data.createdBy;
}

match /testAnswers/{document=**} {
  allow read: if request.auth.uid == resource.data.studentId || 
              request.auth.uid == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.createdBy;
  allow create: if request.auth.uid == request.resource.data.studentId;
  allow update: if request.auth.uid == get(/databases/$(database)/documents/tests/$(resource.data.testId)).data.createdBy;
}
```

---

## 🛠️ Integratsiya

### Sidebar'ga menyu qo'shilgan:
- **O'qituvchi**: `/teacher/tests` - "Testlar"
- **Talaba**: `/tests` - "Testlar"

### Routes qo'shilgan:
- `GET /teacher/tests` - O'qituvchining testlari
- `GET /tests` - Talabaning testlari

---

## 📝 Misol: Test Yaratish Jarayoni

1. O'qituvchi "Yangi test" tugmasini bosadi
2. Test nomi, tavsif va target auditoriyasini tanlaydi (guruh yoki hamma)
3. Savollarni qo'shadi:
   - Savol matni
   - Ball soni
   - Variantlar (ko'p tanlovli uchun)
   - To'g'ri javob
4. "Test yaratish" tugmasini bosadi
5. Test Firestore'da saqlanadi

---

## 📝 Misol: Test O'tkazish Jarayoni

1. Talaba "Testlar" bo'limiga borad
2. Dostupable testlarni ko'radi
3. "Testni boshlash" tugmasini bosadi
4. Test start screen'iga kiraddi (ma'lumotlar ko'rinadi)
5. "Testni boshlash" tugmasini bosadi
6. Savollarni javob beradi
7. Vaqt tugaguncha yoki "Testni jo'natish" tugmasini bosguncha
8. Natijalar ekrani ko'rinadi (ball va foiz)
9. Talaba "Mening natijalarim" tab'iga o'tib oldingi natijalarni ko'rishi mumkin

---

## 🐛 Muhim Eslatmalar

1. **Vaqt chegarasi ixtiyoriy** - Agar belgilanmagan bo'lsa, cheksiz vaqt beriladi
2. **Avtomatik saqlanish yo'q** - Talaba "Jo'natish" tugmasini bosmaguncha javoblar saqlanmaydi
3. **O'tkazilgan test tahrirlana olmaydi** - Talaba test topshiriq'ini qayta o'tkazib yangi test bermaydi
4. **Matnli savollar manual grading kerak** - O'qituvchi API'ni yoki admin panelini orqali ball berishi kerak
5. **Guruh chikligi** - Talaba faqat o'zining guruhi uchun belgilangan yoki "hamma uchun" testlarni ko'ra oladi

---

## 📞 Qo'llab-Quvvatlash

Agar savollaringiz bo'lsa, lug'at yoki istisnolar uchun TestService metodlarini qayta tekshiring.
