# Resurs To'plamlari (Resource Collections) - Texnik Dokumentatsiya

## Umumiy Ma'lumot

Resurs To'plamlari funksiyalari o'qituvchilarga bir nechta fayllarni bir to'plam shaklida o'rganuvchilarga taqdim etish imkoniyatini beradi. To'plam ichida fayllar alohida qatorlarda ko'rinadi va har biriga alohida amallarni (yuklab olish, o'chirish, tahrirlash) bajarish mumkin.

## Arxitektura

### Firestore Collection Schema

#### `resourceCollections` - To'plamlar asosiy kolleksiyasi

```javascript
{
  id: string,                          // Document ID
  teacherId: string,                   // O'qituvchi ID
  teacherName: string,                 // O'qituvchi ismi
  title: string,                       // To'plam sarlavhasi *
  description: string,                 // To'plam tavsifi
  previewImage: string,                // Preview rasm URL
  isPublic: boolean,                   // Ommaviy yoki private
  groupId: string | null,              // Guruh ID (null bo'lsa hamma uchun)
  groupName: string,                   // Guruh nomi
  subjectId: string,                   // Fan ID
  subjectName: string,                 // Fan nomi
  files: [                             // Ichidagi fayllar
    {
      id: string,                      // Fayl unikal ID
      name: string,                    // Fayl nomi
      description: string,             // Fayl tavsifi
      url: string,                     // Firebase Storage URL
      size: number,                    // Fayl hajmi (bytes)
      uploadedAt: string               // Yuklash vaqti (ISO)
    }
  ],
  createdAt: timestamp,                // Yaratilgan vaqt
  updatedAt: timestamp                 // O'zgartirilgan vaqt
}
```

### Service Layer

#### `collectionService.js` - Asosiy servis

```javascript
// To'plam operatsiyalari
collectionService.getCollectionsByTeacher(teacherId)
collectionService.getCollectionById(collectionId)
collectionService.createCollection(collectionData, previewImage)
collectionService.updateCollection(collectionId, updates, previewImage)
collectionService.deleteCollection(collectionId)

// To'plamga fayl operatsiyalari
collectionService.addFileToCollection(collectionId, fileData)
collectionService.removeFileFromCollection(collectionId, fileData)
collectionService.updateFileInCollection(collectionId, oldFileData, newFileData)

// Talabalar uchun
collectionService.getCollectionsByGroupAndSubject(groupId, subjectId)
```

### UI Components

#### `CollectionCard.jsx` - To'plam card komponenti

**Props:**
- `collection` - To'plam ma'lumotlari
- `onViewDetails` - Callback: tafsilotlarni ko'rish
- `onEdit` - Callback: tahrirlash
- `onDelete` - Callback: o'chirish
- `isOwner` - Boolean: egami yoki yoqmi

**Features:**
- Preview rasm bilan card ko'rinish
- Fayl soni ko'rish
- Egasi bo'lsa: tahrirlash/o'chirish tugmalari

#### `CollectionDetail.jsx` - To'plam tafsilotlari modal

**Props:**
- `collection` - To'plam ma'lumotlari
- `onClose` - Callback: yopish
- `onAddFile` - Callback: fayl qo'shish
- `onEditFile` - Callback: faylni tahrirlash
- `onDeleteFile` - Callback: faylni o'chirish
- `onDownloadFile` - Callback: faylni yuklab olish
- `isOwner` - Boolean: tahrirlash imkoni
- `isLoading` - Boolean: yuklanish holati

**Features:**
- Fayllar ro'yxati (alohida qatorlarda)
- Fayl kengayish/yopish funksiyalari
- Har bir fayl uchun alohida tugmalar
- O'qituvchi uchun fayl qo'shish/o'chirish imkoniyati

### TeacherResources Page Integratsiyasi

#### Tab struktura

```
TeacherResources
├── Resurslar Tab (mavjud)
│   ├── Guruh tanlash
│   ├── Fan tanlash
│   └── Resurs qo'shish
└── To'plamlar Tab (yangi)
    ├── To'plam yaratish
    ├── To'plamlar gridi
    ├── To'plam tafsilotlari modal
    └── Fayl qo'shish modal
```

#### Funksiyalari

**To'plamlar tab'i:**
- `loadCollections()` - O'qituvchining barcha to'plamlarini yuklash
- `handleAddCollection()` - Yangi to'plam yaratish
- `handleAddFileToCollection()` - Faylni to'plamga qo'shish
- `handleDeleteFileFromCollection()` - Faylni to'plamdan o'chirish
- `handleDeleteCollection()` - To'plamni o'chirish

### StudentResources Page Integratsiyasi

#### Tab struktura

```
StudentResources
├── Resurslar Tab (mavjud)
│   └── Fan bo'yicha resurs ro'yxati
└── To'plamlar Tab (yangi)
    └── Fan bo'yicha to'plamlar gridi
```

#### Features

- Talabalar o'z guruhi uchun to'plamlarni ko'rish
- To'plam ichidagi fayllarni ko'rish
- Fayllarni yuklab olish

## Firestore Security Rules

```firestore
match /resourceCollections/{collectionId} {
  // Ommaviy yoki o'z guruhi to'plamlarini o'qish
  allow read: if isAuthenticated() && 
                 (resource.data.isPublic == true || 
                  (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
                   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.groupId == resource.data.groupId));
  
  // Faqat o'qituvchilar va adminlar yaratishi mumkin
  allow create: if isTeacherOrAdmin() && 
                   isApproved() &&
                   hasRequiredFields(['teacherId', 'title', 'files', 'createdAt']);
  
  // Yaratuvchi yoki admin yangilashi mumkin
  allow update: if isAdmin() || 
                   (isTeacher() && isApproved() && resource.data.teacherId == request.auth.uid);
  
  // Yaratuvchi yoki admin o'chirishi mumkin
  allow delete: if isAdmin() || 
                   (isTeacher() && isApproved() && resource.data.teacherId == request.auth.uid);
}
```

## Storage Path

To'plam rasmlari va fayllar quyidagi struktura bo'yicha saqlanadi:

```
Firebase Storage
└── collection_files/
    └── {collectionId}/
        ├── {timestamp}_{filename1}
        ├── {timestamp}_{filename2}
        └── ...
    
collections/
    └── {teacherId}/
        └── {timestamp}_{previewImageName}
```

## API Ishtetish Misollari

### To'plam yaratish

```javascript
const result = await collectionService.createCollection(
  {
    teacherId: 'teacher123',
    teacherName: 'Abdullayev A.B.',
    title: 'Python asoslari',
    description: 'Python dasturlashga kirish',
    isPublic: false,
    groupId: 'group1',
    groupName: '101-A',
    subjectId: 'subject123',
    subjectName: 'Informatika'
  },
  previewImageFile  // File object
);
```

### Faylni to'plamga qo'shish

```javascript
const fileData = {
  id: Date.now().toString(),
  name: 'lecture_1.pdf',
  description: '1-Ma\'ruza',
  url: 'https://firebase.../file.pdf',
  size: 1024000,
  uploadedAt: new Date().toISOString()
};

await collectionService.addFileToCollection(collectionId, fileData);
```

### To'plamlarni yuklash (o'qituvchi)

```javascript
const result = await collectionService.getCollectionsByTeacher(teacherId);
if (result.success) {
  const collections = result.data;
}
```

### To'plamlarni yuklash (talaba)

```javascript
const result = await collectionService.getCollectionsByGroupAndSubject(
  'group1',
  'subject123'
);
if (result.success) {
  const collections = result.data; // Ommaviy + o'z guruhi
}
```

## Xatolarni Hal Qilish

### Xatolar va yechimlar

| Xato | Sabab | Yechim |
|------|-------|--------|
| "To'plam sarlavhasini kiriting" | title bo'sh | To'plam sarlavhasini kiriting |
| "Fayl tanlang" | file null | Fayl tanlang |
| "Fayl hajmi 50MB dan katta bo'lmasligi kerak" | file.size > 50MB | Kichik fayl tanlang |
| "Rasm hajmi 5MB dan katta bo'lmasligi kerak" | image.size > 5MB | Kichik rasm tanlang |

## Izni va Limitlar

- **To'plam sarlavhasi:** 1-100 belgi
- **Tavsif:** 1-500 belgi
- **Fayl nomi:** 1-255 belgi
- **Fayl hajmi:** Maksimal 50MB
- **Preview rasm:** Maksimal 5MB
- **To'plamda fayllar:** Cheksiz (Firestore array limiti 20,000 elementga)

## Kelajak Takomillashlash

- [ ] To'plam tahrirlash funksiyalari
- [ ] To'plamlarni qidirish va filtrlash
- [ ] Fayl versiya yaratish
- [ ] To'plamlarni ulashish (share)
- [ ] To'plamlar statistikasi

## Qayta Ishlab Chiqarish Yotkazmalari

- Preview rasmi bo'lmasa default rasmi ko'rish
- Fayl download progress indicator
- Offline rejimi uchun cache qilish

---

**Oxirgi o'zgarish:** 2026-02-05
