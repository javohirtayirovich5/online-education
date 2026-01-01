# Tests Moduli - O'rnatish va Integratsiya Tasnifi

## ✅ Yaratilgan Fayllar

### 1. Xizmatlar (Services)
- **`src/services/testService.js`** - Test CRUD va ball hisoblash logikasi

### 2. Sahifalar (Pages)
- **`src/pages/teacher/TeacherTests.jsx`** - O'qituvchining test boshqaruvi
- **`src/pages/teacher/TeacherTests.css`** - O'qituvchi test sahifasining stillar
- **`src/pages/student/StudentTests.jsx`** - Talabaning test interfeysi
- **`src/pages/student/StudentTests.css`** - Talaba test sahifasining stillar

### 3. Komponentlar (Components)
- **`src/components/tests/TestEditor.jsx`** - Test yaratish/tahrirlash forma
- **`src/components/tests/TestEditor.css`** - Test editor'un stillar
- **`src/components/tests/StudentTestTaker.jsx`** - Test o'tkazish interfeysi
- **`src/components/tests/StudentTestTaker.css`** - Test o'tkazish stillar
- **`src/components/tests/TestResultsModal.jsx`** - Natijalar modal'i
- **`src/components/tests/TestResultsModal.css`** - Natijalar modal'i stillar
- **`src/components/tests/TestResultsCard.jsx`** - Talaba natija kartasi
- **`src/components/tests/TestResultsCard.css`** - Natija kartasi stillar

### 4. Stil Fayllar
- **`src/pages/Tests.css`** - Umumiy test sahifasi stillar
- **`src/pages/student/StudentTests.css`** - Talaba sahifasi stillar
- **`src/pages/teacher/TeacherTests.css`** - O'qituvchi sahifasi stillar

### 5. Qo'llab-Quvvatlash Dokumentatsiyasi
- **`TESTS_USAGE_GUIDE.md`** - To'liq qo'llash ko'rsatmasi

---

## 📝 Yangilangan Fayllar

### 1. `src/App.jsx`
- TestEditor'u import qilish
- `/teacher/tests` route'i qo'shish
- `/tests` route'i qo'shish (talabalar uchun)

### 2. `src/components/common/Sidebar.jsx`
- O'qituvchi menu'siga "Testlar" qo'shish
- Talaba menu'siga "Testlar" qo'shish

### 3. `src/components/common/ConfirmModal.jsx`
- `isDangerous` prop'ni qo'shish

---

## 🎯 Xususiyatlar va Imkoniyatlar

### O'qituvchi Paneli:
✅ Testlar ro'yxati ko'rish
✅ Yangi test yaratish (multi-step forma)
✅ Test tahrirlash
✅ Test o'chirish (confirm modal'i bilan)
✅ Talabalarning test natijalarini ko'rish
✅ Natijalarni saralash (ball/nom bo'yicha)
✅ Statistika: topshiriqlar soni, o'rtacha ball, eng yuqori ball

### Talaba Paneli:
✅ Dostupable testlarni ko'rish (grid layout)
✅ Test uchun o'tkazish ekrani (xavf ogohlantirish bilan)
✅ Test o'tkazish:
   - Vaqt qolgan vaqt timeri
   - Savol navigatsiyasi (oldingi/keyingi)
   - Savol indikatorlari (javob berilgan/joriy)
   - Multiple choice va text savollar
✅ Avtomatik ball hisoblash
✅ Natija ko'rish (ring chart'da foiz)
✅ Oldingi natijalarni ko'rish (natija kartalar'da)

---

## 🔐 Xavfsizlik Features

✅ Faqat o'qituvchilar o'zining testlarini tahrirlashi mumkin
✅ Talabalar faqat o'zlarining javoblarini ko'rishi mumkin
✅ Guruh chegarasi avtomatik tekshiriladi
✅ Testni o'tkazishdan faqat bir bor o'tkazish mumkin
✅ Vaqt tugaganida avtomatik jo'natish

---

## 🚀 Firestore Struktura

### Collections:
1. **`tests`** - Barcha testlar
2. **`testAnswers`** - Talabalarning javoblari va natijalar

### Dokumentlar:
- Test: title, description, questions[], createdBy, visibleFor, groupId, timeLimit, status
- Answer: studentId, testId, answers{}, score, maxScore, percentage, submittedAt

---

## 📊 Reytinglar Tizimi

| Foiz | Baholama | Eng'ilish |
|------|----------|----------|
| 80-100% | A'lo | Excellent |
| 70-79% | Yaxshi | Good |
| 60-69% | Qoniqarli | Satisfactory |
| 50-59% | Qabul | Pass |
| 0-49% | Rad | Fail |

---

## 💡 Qo'llanish Ssenariylari

### Ssenariy 1: O'qituvchi test yaratish
1. Sidebar'da "Testlar" bosiladi
2. "Yangi test" tugmasi bosiladi
3. Test ma'lumotlari kiritiladi
4. Savollar qo'shiladi (variantlar bilan)
5. "Test yaratish" bosiladi
6. Test saqlangan

### Ssenariy 2: Talaba test o'tkazish
1. Sidebar'da "Testlar" bosiladi
2. "Dostupable testlar" tab'idan test tanlanadi
3. "Testni boshlash" bosiladi
4. Test shartlari ko'rilib, "Testni boshlash" bosiladi
5. Savollar javob beriladi
6. "Testni jo'natish" bosiladi
7. Natijalar ko'rinadi

### Ssenariy 3: O'qituvchi natijalarni ko'rish
1. Sidebar'da "Testlar" bosiladi
2. Test kartasidan "Natijalar" (chart ikonasi) bosiladi
3. Natijalar modal'i ochiladi
4. Talabalarning ballari ko'rinadi (saralanadi)

---

## 🎨 Rang va Dizayn

### Asosiy Ranglar:
- Primary: #007bff (Blu)
- Success: #28a745 (Yashil)
- Danger: #dc3545 (Qizil)
- Warning: #ffc107 (Sariq)
- Info: #17a2b8 (Siyoh ko'k)

### Layout:
- Desktop: Grid/List layout'lari
- Mobile: Responsive design (1 kolonka)
- Shadows: Subtle box-shadows
- Radius: 6-8px border-radius

---

## 📱 Responsive Design

✅ Desktop (>1024px): Optimallashtirish
✅ Tablet (768px-1024px): Grid qurilmasi
✅ Mobile (<768px): 1-kolonka layout

---

## 🔄 Avtomatik Jarayonlar

1. **Ball Hisoblash**: TestService.calculateScore()
2. **Vaqt Tayini**: Timer state'da saqlash va countdown
3. **Reytinglar**: Natijalar serverda saqlangandan keyin
4. **Notifikatsiyalar**: React-toastify'dan toast'lar

---

## 📋 Checklist - Deployday Oldin

- [ ] Firestore qoidalari yangilangan
- [ ] Service xizmatlari ishchi
- [ ] Routes to'g'ri configuratsiyalangan
- [ ] Sidebar menu'lar yangilangan
- [ ] CSS stillar to'liq
- [ ] Mobile responsive test qilindi
- [ ] Error handling qilindi
- [ ] Toast notifikatsiyalari ishchi
- [ ] Dokumentatsiya yaratilgan

---

## 🚨 Oliy Vazifalar (Future Enhancements)

- [ ] Random test modeli (savollarni aralash)
- [ ] CSV fayldan testlarni import qilish
- [ ] Sertifikat tizimi
- [ ] Uyga vazifa (homework) tizimi bilan integratsiya
- [ ] AI-asosida suhbat bot qo'llab-quvvatlash
- [ ] Test predikatsiyasi (student performance analytics)
- [ ] Barqoq test (live quiz) rejimi
- [ ] Guruhlaro ko'ra statistika
- [ ] Shaxsiy o'rganish yo'li tavsiyalari
- [ ] Qiyinlik darajasi moslashishi

---

## 📞 Muammolar va Tuzatishlar

Agar muammo bo'lsa:

1. **Testlar ko'rinmaydi**: Firestore collection nomi'ni tekshiring
2. **Ball hisoblana olmaydi**: testService.calculateScore() funktsiyasini tekshiring
3. **Modal'lar ko'rinmaydi**: Modal.jsx va ConfirmModal.jsx import'larini tekshiring
4. **Sidebar menusu ko'rinmaydi**: Sidebar.jsx'da route'lar to'g'ri yozilgan
5. **Stil muammolari**: CSS import'larini tekshiring

---

## 📚 Qo'shimcha Resurslar

- TESTS_USAGE_GUIDE.md - To'liq dokumentatsiya
- testService.js - Service metod dokumentatsiyasi
- TestEditor.jsx - Test yaratish forma komponentlari
- StudentTestTaker.jsx - Test o'tkazish logikasi
