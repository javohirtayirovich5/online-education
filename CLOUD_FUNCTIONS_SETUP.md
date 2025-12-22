# Cloud Functions - Qisqa Qo'llanma

## 📋 1. O'rnatish

```bash
# Firebase CLI o'rnatish (agar yo'q bo'lsa)
npm install -g firebase-tools

# Firebase ga login qilish
firebase login

# Loyihani tanlash
firebase use education-pro1
```

## 📦 2. Functions Dependencies

```bash
cd functions
npm install
cd ..
```

## 🚀 3. Deploy qilish

```bash
# Root papkadan
firebase deploy --only functions
```

Yoki faqat `deleteUser` funksiyasini:
```bash
firebase deploy --only functions:deleteUser
```

## ✅ 4. Tekshirish

Deploy qilgandan keyin:
- Firebase Console → Functions bo'limiga kiring
- `deleteUser` funksiyasi ko'rinishi kerak
- Status: "Active" bo'lishi kerak

## 🔄 5. Keyingi o'zgarishlar

Kod o'zgarganda qayta deploy qiling:
```bash
firebase deploy --only functions:deleteUser
```

## ⚠️ Muhim

- Birinchi deploy 2-5 daqiqa vaqt olishi mumkin
- Deploy qilgandan keyin funksiya ishga tushadi
- Client-side kod allaqachon tayyor (authService.js)

