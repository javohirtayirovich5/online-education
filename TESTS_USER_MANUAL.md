# Tests Modulini Boshqarish - Amaliy Qo'llanma

## 🎯 Modul Maqsadi

Bu modul Online Education platformasiga **test-based assessment** tizimini qo'shadi. O'qituvchilar test yaratib, talabalarning bilimini baholay oladi, talabalar esa testlarni o'tkazib o'z darajalarini aniqlaydilar.

---

## 🏗️ Arxitektura

### 1. **Database Schema (Firestore)**

#### Collection: `tests`
```
{
  id: string                          // Auto-generated
  title: string                       // Test nomi
  description: string                 // Test tavsifi
  questions: [
    {
      type: "multiple" | "text"       // Savol turi
      text: string                    // Savol matni
      points: number                  // Ball soni
      options: string[]               // Variantlar (faqat multiple uchun)
      correctAnswer: number           // To'g'ri javob indeksi
    }
  ]
  createdBy: string                   // O'qituvchi UID
  createdByName: string               // O'qituvchi ismi
  visibleFor: "all" | "group"         // Ko'rinadigan auditoriya
  groupId: string | null              // Guruh ID (agar group uchun)
  timeLimit: number | null            // Vaqt chegarasi (daqiqada)
  status: "active" | "inactive"       // Test holati
  createdAt: timestamp                // Yaratilish vaqti
}
```

#### Collection: `testAnswers`
```
{
  id: string                          // Auto-generated
  studentId: string                   // Talaba UID
  studentName: string                 // Talaba ismi
  testId: string                      // Test ID
  testTitle: string                   // Test nomi
  groupId: string                     // Talabaning guruh ID'i
  answers: {
    0: number | string                // Savol indeksi: Javob
    1: number | string
    ...
  }
  score: number                       // To'plangan ball
  maxScore: number                    // Maksimal ball
  percentage: number                  // Foiz (0-100)
  isGraded: boolean                   // Graded yo'q yo'q
  submittedAt: timestamp              // Jo'natish vaqti
  gradedAt: timestamp | null          // Grading vaqti (manual uchun)
}
```

---

## 👨‍🏫 O'QITUVCHI FUNKTSIYALARI

### 1. Testlar Ro'yxatini Ko'rish

**URL**: `/teacher/tests`

**Ekran Elementlari**:
- 🔍 Qidiruv paneli (test nomi bo'yicha)
- ➕ "Yangi test" tugmasi
- 📋 Test kartalar ro'yxati

**Test Kartasi**:
```
┌─────────────────────────────────┐
│ Test Nomi                       │
│ 5 savol • Guruh A               │
│ [📊] [✏️] [🗑️]  Tugmalar         │
├─────────────────────────────────┤
│ Test tavsifi...                 │
│ Yaratilgan: 2024-01-01          │
│ Status: ✓ Faol                  │
└─────────────────────────────────┘
```

### 2. Yangi Test Yaratish

**Modal Forması**:

**Step 1: Asosiy Ma'lumotlar**
```
┌─ Asosiy ma'lumotlar ──────────────┐
│ Test nomi:        [____________]  │
│ Tavsif:          [_____________]  │
│                  [_____________]  │
│ Kim uchun?       [Hamma uchun ▼]  │
│ Vaqt chegarasi:  [60 daqiqa    ]  │
└───────────────────────────────────┘
```

**Step 2: Savollar Qo'shish**
```
┌─ Savol Qo'shish ──────────────────┐
│ Savol turi:      [Variantlar   ▼]  │
│ Savol matni:     [____________]  │
│ Ball:            [1           ]  │
│ Variantlar:                       │
│   ◯ Variant 1    [o] To'g'ri    │
│   ◯ Variant 2                    │
│   ◯ Variant 3                    │
│   ◯ Variant 4                    │
│ [Savolni qo'shish]               │
└───────────────────────────────────┘

┌─ Qo'shilgan Savollar ─────────────┐
│ 1. Savol matni (2 ball)           │
│    ✓ To'g'ri javob              │
│    [Tahrirlash] [O'chirish]      │
└───────────────────────────────────┘
```

**To'g'ri va Noto'g'ri Variantlar**:
- ✅ Multiple choice: 4 ta variant, 1 ta to'g'ri
- ✅ Text: Matnli javob (manual grading)
- ❌ Bosh savollar
- ❌ Bosh variantlar

### 3. Testni Tahrirlash

- Oldingi ma'lumotlar ko'rsinadi
- Savollar qo'shilishi, o'zgartirilishi, o'chirilishi mumkin
- Test bittaga o'tkazilgan bo'lsa, savollari o'zgartirilmasa yaxshi

### 4. Testni O'chirish

```
┌─ O'chirish Tasdig'i ──────────────┐
│ "Test nomi" testini o'chirmoqchi? │
│                                   │
│ [Bekor qilish] [O'chirish]       │
└───────────────────────────────────┘
```

**Ehtiyot**: Hammasi o'chiriladi - test va barcha javoblar!

### 5. Natijalarni Ko'rish

**Modal Oynasi**:
```
┌─ "Test Nomi" - Natijalar ────────┐
│ ├─ Statistika:                   │
│ │  Topshiriqlar: 25              │
│ │  O'rtacha ball: 78.5            │
│ │  Eng yuqori: 95                │
│ │                                 │
│ ├─ Natijalar Jadvali:            │
│ │  # | O'quvchi      | Ball | %  │
│ │  1 | Ali Valiyev   | 95   |95% │
│ │  2 | Fatima Mirza  | 85   |85% │
│ │  3 | Muhammad      | 78   |78% │
│ │  ... (qolganlar)               │
│ │                                 │
│ └─ Saralash: [Ball bo'yicha ▼]   │
└───────────────────────────────────┘
```

---

## 👨‍🎓 TALABA FUNKTSIYALARI

### 1. Dostupable Testlarni Ko'rish

**URL**: `/tests`

**Tab 1: Dostupable Testlar**
```
┌─────────────────────┐  ┌──────────────────────┐
│ Matematika Test 1   │  │ Fizika Test 2        │
│ 5 savol • 60 min    │  │ 4 savol • 45 min     │
│ [Testni boshlash]   │  │ [Testni boshlash]    │
└─────────────────────┘  └──────────────────────┘
```

**Tab 2: Mening Natijalarim**
```
┌─────────────────────────────────────┐
│ Matematika Test 1                   │
│ ┌──────────┐ Ball: 78 / 100 (78%)   │
│ │    78%   │ Status: Yaxshi          │
│ │          │ Sana: 2024-01-10       │
│ └──────────┘                         │
│ Matematika Test 2                   │
│ ┌──────────┐ Ball: 92 / 100 (92%)   │
│ │    92%   │ Status: A'lo            │
│ │          │ Sana: 2024-01-15       │
│ └──────────┘                         │
└─────────────────────────────────────┘
```

### 2. Testni Boshlash

**Boshlash Ekrani**:
```
┌─────────────────────────────────────┐
│ Matematika Test 1                   │
│ Test tavsifi...                     │
│                                      │
│ Savollar: 5                         │
│ Vaqt: 60 daqiqa                    │
│ Umumiy ball: 100                    │
│                                      │
│ ⚠️  Testni boshlashdan keyin        │
│ orqaga qaytish mumkin emas!         │
│                                      │
│ [Bekor qilish] [Testni boshlash]   │
└─────────────────────────────────────┘
```

### 3. Test O'tkazish Interfeysi

**Yuqori Panel**:
```
┌─────────────────────────────────────────────┐
│ Savol 3 / 5                                  │
│ [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] │
│                                       55:30  │
└─────────────────────────────────────────────┘
```

**Savol va Variantlar**:
```
┌─ Savol Paneli ────────────────────────────┐
│ 2 + 2 = ?  (1 ball)                       │
│                                            │
│ ◯ Variant 1                               │
│ ◯ Variant 2                               │
│ ◯ Variant 3                               │
│ ◯ Variant 4                               │
└────────────────────────────────────────────┘
```

**Navigatsiya Tugmalari**:
```
[Oldingi] ────────────────── [Keyingi]
1  2  3  4  5  6  7  8  9  10  11
```

**Rang Kodlari**:
- Oq: Javob berilmagan
- Ko'k: Joriy savol
- Yashil: Javob berilgan

### 4. Test Natijalar Ekrani

**Avtomatik Ko'rinadigan** (jo'ntashdan keyin):
```
┌──────────────────────────────────────┐
│             ✓ Test yakunlandi!       │
│                                      │
│            ┌─────────────┐           │
│            │     95%     │           │
│            └─────────────┘           │
│                                      │
│        To'plangan: 95 / 100          │
│                                      │
│   Siz testni muvaffaqiyatli          │
│   yakunladingiz!                     │
│                                      │
│         [Tugatish]                   │
└──────────────────────────────────────┘
```

**Natija Kartasi**:
```
┌────────────────────────────────────────┐
│ Matematika Test 1                      │
│ 2024-01-10                 ✨ A'lo     │
│                                        │
│         ┌──────────┐  Ball: 95/100     │
│         │    95%   │  Status: A'lo     │
│         └──────────┘  Yakunlandi       │
└────────────────────────────────────────┘
```

---

## 📊 Ball Hisoblash Tizimi

### Avtomatik Hisoblash:
```javascript
// Multiple choice savollari avtomatik hisoblanadi
total_score = 0
for each question:
    if student_answer == correct_answer:
        total_score += question_points
    else:
        total_score += 0

percentage = (total_score / max_score) * 100
```

### Manual Hisoblash:
```
⚠️ Text savollar o'qituvchi tomonidan qo'lda baholash kerak
(Turide O'qituvchi nomi yordamida: TestResultsModal)
```

### Reytinglar:
| Ball | Foiz | Baholama | Eng | Color |
|------|------|----------|-----|-------|
| A'lo | 80-100% | Excellent | 🏆 | 🟢 |
| Yaxshi | 70-79% | Good | ✨ | 🔵 |
| Qoniqarli | 60-69% | Satisfactory | 👍 | 🟡 |
| Qabul | 50-59% | Pass | ✓ | 🟠 |
| Rad | 0-49% | Fail | ✗ | 🔴 |

---

## 🔐 Xavfsizlik va Ruxsatlar

### O'qituvchi:
✅ O'zining testlarini tahrirlash/o'chirish
✅ Hamma talabalarning javoblarini ko'rish
✅ Balo berish (manual grading)
❌ Boshqa o'qituvchining testini o'zgartira olmaydi

### Talaba:
✅ O'zga belgilangan testlarni ko'rish
✅ Testni o'tkazish
✅ O'zining natijalarini ko'rish
❌ Boshqa talabaning natijasini ko'rishi mumkin emas
❌ Test o'tkazimini o'zgartira olmaydi

---

## ⏱️ Vaqt Boshqaruvi

### Timer Ishlash:
```
┌─ Vaqtning O'zgarishi ───────────────────┐
│ Test boshlanganida: 60:00                │
│ Har sekundda: -1                        │
│ Agar vaqt tug'asa: Auto-submit           │
│ Rang o'zgarishi: <1 min qolganda        │
│ Rang: Ko'k → Qizil                      │
└─────────────────────────────────────────┘
```

---

## 📱 Responsive Design

### Desktop (>1024px):
- Grid layout testlar uchun
- Full-width test o'tkazish

### Tablet (768-1024px):
- 2-kolonka grid
- Optimized buttons

### Mobile (<768px):
- 1-kolonka layout
- Touch-friendly buttons
- Vertical scrolling

---

## 🎨 UI/UX Prinsiiplari

1. **Soddalik**: Faqat zarur elementlar
2. **Ravshanlik**: Juda katta elementlar (32px+ buttons)
3. **Feedback**: Toast notifikatsiyalari
4. **Xavf ogohlantirishi**: Delete uchun confirm modali
5. **Renglash**: Mazmuni aniq (yashil=yaxshi, qizil=yomon)

---

## 🚀 Boshlanish

### 1. First Time Setup
```bash
# Firestore collections avtomatik yaratiladi
# Collections: tests, testAnswers
```

### 2. O'qituvchi Uchun
1. Sidebar'da "Testlar" bosiladi
2. "Yangi test" tugmasi bosiladi
3. Ma'lumotlar kiritiladi
4. Savollar qo'shiladi
5. "Test yaratish" bosiladi

### 3. Talaba Uchun
1. Sidebar'da "Testlar" bosiladi
2. Dostupable test tanlanadi
3. "Testni boshlash" bosiladi
4. Savollar javob beriladi
5. "Testni jo'natish" bosiladi
6. Natijalar ko'rinadi

---

## 💾 Veri Saqlash

### Qayerda Saqlanadi:
- **Testlar**: Firestore `tests` collection
- **Javoblar**: Firestore `testAnswers` collection
- **Kesh**: Yo'q (Real-time)

### Kop'yashlash:
```
Cloud Firestore → Otomatik 30 kun backup
```

---

## 🐛 Tez Xatolar va Ularni Tuzatish

| Xato | Sababy | Tuzatish |
|------|--------|---------|
| Test ko'rinmaydi | Guruh notugri | Guruh ID tekshiring |
| Natija hisoblana olmaydi | Savol turlari notugri | Savol schema tekshiring |
| Modal ko'rinmaydi | CSS import'i yo'q | Import qo'shining |
| Timer ishlama(ydi) | Vaqt null | timeLimit'ni tekshiring |

---

## 📞 Qoshimcha Yordam

**Muammo?** → **Tuzatish:**
1. Browser console tekshiring (F12)
2. Firestore security rules tekshiring
3. Network tab'ni tekshiring (API calls)
4. Component props'larini tekshiring

---

## ✅ Deployment Checklist

- [ ] Firestore rules yangilangan
- [ ] Collections yaratilgan
- [ ] Routes to'g'ri
- [ ] Sidebar menu'lar yangilangan
- [ ] CSS import'lari to'g'ri
- [ ] Error handling qilindi
- [ ] Mobile test qilindi
- [ ] Performance test qilindi (max 100 testlar)

---

## 📚 Qo'shimcha Ma'lumot

Batafsil: Qarang `TESTS_USAGE_GUIDE.md` faylida
