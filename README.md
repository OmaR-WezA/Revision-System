# 📦 نظام تتبع التسليم — دليل الإعداد الكامل

## 🚀 خطوات الإعداد (للمرة الأولى)

### 1️⃣ إعداد Firebase (مرة واحدة فقط)

1. اذهب إلى [console.firebase.google.com](https://console.firebase.google.com)
2. أنشئ مشروعاً جديداً
3. اختر ⚙️ **Project Settings** → **Your apps** → انقر `</>` (Web)
4. سجّل التطبيق وانسخ `firebaseConfig`
5. من القائمة الجانبية → **Build** → **Firestore Database** → Create database → **Test Mode**

### 2️⃣ إعداد ملف البيئة

افتح ملف `.env.local` والصق قيمك:

```env
VITE_FIREBASE_API_KEY="AIzaSyCJhMOoRmiSAEBcVng23z3uFkGKKE7E1cA",
VITE_FIREBASE_AUTH_DOMAIN="revision-system.firebaseapp.com",
VITE_FIREBASE_PROJECT_ID="revision-system",
VITE_FIREBASE_STORAGE_BUCKET="revision-system.firebasestorage.app",
VITE_FIREBASE_MESSAGING_SENDER_ID="987320638056",
VITE_FIREBASE_APP_ID="1:1:987320638056:web:fb79e089c8c14225adb9dd"
```

### 3️⃣ تشغيل المشروع محلياً

```bash
npm install
npm run dev
```

---

## 🌐 النشر على Hosting مجاني

### الخيار 1: Firebase Hosting (الأسهل)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting        # اختر existing project → dist → SPA → no overwrite
npm run build
firebase deploy
```
🔗 ستحصل على رابط: `https://your-project.web.app`

### الخيار 2: Vercel (بدون CLI)
1. ارفع المشروع على GitHub
2. اذهب إلى [vercel.com](https://vercel.com) → Import Project
3. Framework: **Vite** (يُكتشف تلقائياً)
4. أضف Environment Variables من `.env.local`
5. انقر Deploy ✅

### الخيار 3: Netlify
1. ارفع على GitHub
2. اذهب إلى [netlify.com](https://netlify.com) → New site from Git
3. Build command: `npm run build`
4. Publish directory: `dist`
5. أضف Environment Variables
6. Deploy ✅

---

## 📊 تنسيق ملف Excel

| العمود A  | العمود B   |
|-----------|-----------|
| الرقم الجامعي | اسم الطالب |
| 202201234 | أحمد محمد |

- **اسم الملف = اسم المادة**: `Mathematics.xlsx` → مادة Mathematics

---

## 🏗️ هيكل المشروع

```
src/
├── firebase/config.js        # إعداد Firebase
├── services/deliveryService.js # كل منطق Firestore
├── utils/excelParser.js      # قراءة ملفات Excel
├── hooks/useDeliveries.js    # React hooks
├── components/
│   ├── StatsCards.jsx        # بطاقات الإحصائيات
│   ├── FilterBar.jsx         # الفلاتر
│   └── DeliveryTable.jsx     # جدول التسليمات
└── pages/
    ├── DashboardPage.jsx     # لوحة التحكم
    └── UploadPage.jsx        # صفحة رفع Excel
```

---

## 🔑 المفتاح المركّب — كيف يمنع التكرار

```
Document ID = universityId + "_" + subjectSlug
مثال: "202201234_mathematics"
```

- إذا رُفع نفس الملف مرة أخرى → نفس الـ ID → Firestore يتجاهله
- طالب تم تسليمه → حالته لن تتغير أبداً حتى بعد رفع ملف جديد
