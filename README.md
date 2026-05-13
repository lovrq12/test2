# 📦 مستري بوكس

لعبة خداع اجتماعي متعددة اللاعبين تعمل مباشرة في المتصفح.

## 🚀 تشغيل المشروع

افتح `index.html` مباشرة أو ارفعه على GitHub Pages / Vercel.

لا يحتاج npm أو أي أدوات build.

## 📁 هيكل الملفات

```
index.html          ← شاشة الدخول
lobby.html          ← اللوبي
game.html           ← صفحة اللعب

css/
  base.css          ← الأساس والمتغيرات
  home.css          ← شاشة الدخول
  lobby.css         ← اللوبي
  game.css          ← اللعبة

js/
  firebase-init.js  ← إعداد Firebase
  constants.js      ← الثوابت وقائمة الأغراض
  utils.js          ← دوال مساعدة
  rooms.js          ← إدارة الغرف
  tournament.js     ← نظام البطولة
  game-state.js     ← حالة اللعبة
  chat.js           ← الشات
  home.js           ← منطق الصفحة الرئيسية
  lobby.js          ← منطق اللوبي
  game.js           ← منطق اللعبة

  3d/
    scene.js        ← مشهد Three.js
    box.js          ← الصندوق الغامض 3D
    characters.js   ← الشخصيات FBX

assets/
  models/
    interrogation_room.glb
  characters/
    player01.fbx
    player02.fbx
```

## 🎮 طريقة اللعب

1. أدخل اسمك واختر شخصيتك
2. أنشئ غرفة أو انضم بكود
3. انتظر في اللوبي حتى يجتمع اللاعبون
4. الهوست يضغط ابدأ اللعبة
5. كل جولة: لاعب صاحب الصندوق + محقق
6. صاحب الصندوق يختار صادق أو كذاب
7. المحقق يطرح أسئلة ثم يخمن
8. الفائز بجولتين يتأهل للمرحلة التالية

## 🔧 التقنيات

- HTML + CSS + JavaScript فقط
- Three.js (CDN) للمشهد ثلاثي الأبعاد
- Firebase Realtime Database للمزامنة
- Arabic RTL UI بالكامل
