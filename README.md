# 📚 Technical English - Universitet Online Ta'lim Platformasi

Universitetlar uchun professional va to'liq funksional online ta'lim platformasi.

## 🚀 Texnologiyalar

- **Frontend:** React.js 18 + Vite
- **Backend:** Firebase (Authentication, Firestore, Storage)
- **Video Player:** React Player
- **UI:** Custom CSS + React Icons + Framer Motion
- **Charts:** Recharts

## ✨ Xususiyatlar

### Foydalanuvchi Rollari
- 👨‍💼 **Administrator** - Tizimni to'liq boshqarish
- 👨‍🏫 **O'qituvchi** - Darslar yaratish va boshqarish
- 👨‍🎓 **Talaba** - Darslarni ko'rish va vazifalarni topshirish

### O'qituvchilar uchun
- ✅ Video darslar yaratish va yuklash
- ✅ YouTube, Vimeo yoki to'g'ridan-to'g'ri video linklar
- ✅ Qo'shimcha resurslar yuklash (PDF, Word, PowerPoint)
- ✅ Darslarni tahrirlash va o'chirish
- ✅ Talabalar izohlarini ko'rish va boshqarish
- ✅ Topshiriqlar yaratish

### Talabalar uchun
- ✅ Video darslarni tomosha qilish
- ✅ Qo'shimcha resurslarni yuklab olish
- ✅ Darslar ostida izoh qoldirish
- ✅ Topshiriqlarni topshirish
- ✅ Baholarni ko'rish

### Umumiy xususiyatlar
- ✅ Autentifikatsiya (Login, Register, Parolni tiklash)
- ✅ Dashboard (Har bir rol uchun alohida)
- ✅ Izohlar sistemasi (public comments)
- ✅ Dark/Light tema
- ✅ Responsive dizayn (barcha qurilmalar uchun)
- ✅ Real-time yangilanishlar

## 📦 O'rnatish

```bash
# Repository ni klonlash
git clone <repo-url>
cd online-education-platform

# Paketlarni o'rnatish
npm install

# Development serverni ishga tushirish
npm run dev
```

## 🔧 Firebase Sozlamalari

1. [Firebase Console](https://console.firebase.google.com/) da yangi loyiha yarating
2. Authentication → Email/Password ni yoqing
3. Firestore Database yarating
4. Storage yarating
5. `firebase-rules/` papkasidagi qoidalarni qo'llang

## 📁 Loyiha Strukturasi

```
src/
├── components/
│   ├── auth/           # Autentifikatsiya
│   └── common/         # Umumiy komponentlar
├── contexts/           # React Contexts
├── hooks/              # Custom Hooks
├── pages/              # Sahifalar
│   └── admin/          # Admin sahifalari
├── services/           # Firebase services
│   ├── firebase.js     # Firebase config
│   ├── authService.js  # Auth funksiyalari
│   ├── lessonService.js # Darslar bilan ishlash
│   └── storageService.js # Fayllar bilan ishlash
├── styles/             # Global styles
└── utils/              # Yordamchi funksiyalar
```

## 👤 Admin yaratish

1. Platformada oddiy foydalanuvchi sifatida ro'yxatdan o'ting
2. Firebase Console → Firestore → `users` kolleksiyasi
3. O'z hujjatingizni toping
4. `role` qiymatini `admin` ga o'zgartiring
5. `isApproved` ni `true` qilib qo'ying

## 📝 Litsenziya

MIT License
