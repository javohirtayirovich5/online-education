# 🔐 Firebase Security Rules

Bu papkada Firebase Firestore va Storage uchun xavfsizlik qoidalari joylashgan.

## 📋 Qoidalarni qo'llash

### Firestore Rules

1. [Firebase Console](https://console.firebase.google.com/) ga kiring
2. Loyihangizni tanlang
3. **Firestore Database** → **Rules** bo'limiga o'ting
4. `firestore.rules` faylining mazmunini nusxalang va joylashtiring
5. **Publish** tugmasini bosing

### Storage Rules

1. Firebase Console da
2. **Storage** → **Rules** bo'limiga o'ting
3. `storage.rules` faylining mazmunini nusxalang va joylashtiring
4. **Publish** tugmasini bosing

## 🛡️ Qoidalar tuzilishi

### Firestore

| Collection | Read | Create | Update | Delete |
|-----------|------|--------|--------|--------|
| users | Authenticated | Owner | Owner (except role) | Admin |
| courses | Authenticated | Teacher/Admin | Instructor/Admin | Instructor/Admin |
| assignments | Authenticated | Teacher/Admin | Creator/Admin | Creator/Admin |
| submissions | Owner/Teacher/Admin | Student (own) | Owner (ungraded) / Teacher | Admin |
| grades | Owner/Teacher/Admin | Teacher/Admin | Teacher/Admin | Admin |
| attendance | Owner/Teacher/Admin | Teacher/Admin | Teacher/Admin | Admin |
| announcements | Authenticated | Teacher/Admin | Author/Admin | Author/Admin |
| forums | Authenticated | Authenticated | Author/Admin | Author/Admin |
| messages | Participants | Participants | Participants | Admin |
| notifications | Owner | Teacher/Admin | Owner | Owner/Admin |

### Storage

| Path | Max Size | Allowed Types |
|------|----------|---------------|
| /users/{userId}/ | 5MB | Images |
| /courses/{courseId}/thumbnail | 5MB | Images |
| /courses/{courseId}/videos/ | 500MB | Videos |
| /courses/{courseId}/documents/ | 50MB | PDF, Word, PPT, Excel |
| /assignments/{assignmentId}/ | 50MB | Documents, Images |
| /forums/ | 10MB | Images, Documents |
| /messages/ | 25MB | Images, Documents |

## ⚠️ Muhim eslatmalar

1. **Ishlab chiqarish muhitida** qoidalarni yanada qattiqroq qilish tavsiya etiladi
2. **Cloud Functions** orqali qo'shimcha tekshiruvlar qo'shish mumkin
3. Qoidalarni o'zgartirgandan keyin test qilishni unutmang
4. **Firebase Emulator** yordamida local test qilish mumkin

## 🧪 Qoidalarni test qilish

```bash
# Firebase emulator o'rnatish
npm install -g firebase-tools

# Firebase ga kirish
firebase login

# Emulator ishga tushirish
firebase emulators:start

# Rules test qilish
firebase emulators:exec "npm test"
```

## 📚 Foydali havolalar

- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Storage Security Rules](https://firebase.google.com/docs/storage/security)
- [Rules Testing](https://firebase.google.com/docs/rules/unit-tests)

