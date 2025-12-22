# Firebase Admin Yaratish Qo'llanmasi

Firebase da admin yaratish uchun 3 ta usul mavjud:

## 📋 Usul 1: Script orqali (Tavsiya etiladi)

### 1. Script ni ishga tushirish:

```bash
node scripts/createAdmin.mjs
```

### 2. Ma'lumotlarni kiriting:
- Email manzil
- Parol (kamida 6 belgi)
- To'liq ism

### 3. Natija:
- Firebase Authentication da foydalanuvchi yaratiladi
- Firestore da admin ma'lumotlari saqlanadi
- `role: 'admin'` va `isApproved: true` avtomatik o'rnatiladi

---

## 🔧 Usul 2: Firebase Console orqali

### 1. Firebase Authentication:
1. Firebase Console ga kiring: https://console.firebase.google.com
2. Loyihani tanlang: `education-pro1`
3. **Authentication** → **Users** bo'limiga kiring
4. **Add user** tugmasini bosing
5. Email va parolni kiriting
6. **Add user** tugmasini bosing

### 2. Firestore da admin qilish:
1. **Firestore Database** → **Data** bo'limiga kiring
2. `users` collection ni toping
3. Yaratilgan foydalanuvchi UID sini toping (Authentication dan)
4. Ushbu UID bilan yangi document yarating yoki mavjud document ni tahrirlang
5. Quyidagi ma'lumotlarni kiriting:

```json
{
  "uid": "USER_UID",
  "email": "admin@example.com",
  "displayName": "Admin Ism",
  "role": "admin",
  "isApproved": true,
  "createdAt": "2025-12-21T00:00:00.000Z",
  "lastActive": "2025-12-21T00:00:00.000Z",
  "phoneNumber": "",
  "bio": "",
  "address": ""
}
```

---

## 🔄 Usul 3: Mavjud foydalanuvchini admin qilish

Agar foydalanuvchi allaqachon mavjud bo'lsa:

### Firebase Console orqali:
1. **Firestore Database** → **Data** → `users` collection
2. Foydalanuvchi document ni toping
3. `role` maydonini `"admin"` ga o'zgartiring
4. `isApproved` maydonini `true` ga o'zgartiring
5. **Update** tugmasini bosing

### Yoki kod orqali:
```javascript
// Firestore da to'g'ridan-to'g'ri o'zgartirish
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './services/firebase';

await updateDoc(doc(db, 'users', 'USER_UID'), {
  role: 'admin',
  isApproved: true
});
```

---

## ✅ Tekshirish

Admin yaratilganini tekshirish:

1. Tizimga kirish: https://your-app.com/login
2. Email va parol bilan kirish
3. Dashboard da admin panel ko'rinishi kerak
4. Sidebar da admin bo'limlari ko'rinishi kerak

---

## ⚠️ Muhim Eslatmalar

1. **Xavfsizlik**: Admin parolini xavfsiz saqlang
2. **Email**: Admin email manzili haqiqiy bo'lishi kerak
3. **Parol**: Kamida 6 belgi, kuchli parol ishlatish tavsiya etiladi
4. **Role**: Faqat `role: 'admin'` bo'lgan foydalanuvchilar admin huquqlariga ega

---

## 🆘 Muammolar

### "Email already in use"
- Bu email allaqachon ro'yxatdan o'tgan
- Firestore da `role` ni `'admin'` ga o'zgartiring

### "Permission denied"
- Firestore rules da admin yaratishga ruxsat borligini tekshiring
- Yoki Firebase Console orqali to'g'ridan-to'g'ri yarating

### "User not found"
- Authentication da foydalanuvchi yaratilganini tekshiring
- Firestore da `users` collection da document borligini tekshiring

