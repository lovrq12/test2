# مستري بوكس

لعبة متصفح عربية متعددة اللاعبين تعمل مباشرة بدون npm أو build step.

## التشغيل

افتح `index.html` مباشرة في المتصفح، أو ارفع الملفات كما هي على GitHub Pages أو Vercel. تستخدم اللعبة Firebase Realtime Database و Three.js من CDN.

## الملفات المهمة

- `index.html`: إنشاء غرفة أو الانضمام بكود.
- `lobby.html`: اللوبي، الجاهزية، إعدادات الهوست، والشات.
- `game.html`: مشهد التحقيق، البطولة، السؤال/الجواب، التخمين، وفتح الصندوق.
- `js/firebase-init.js`: إعداد Firebase compat.
- `js/3d/scene.js`: تحميل الغرفة والشخصيات والصندوق.

## الأصول

الأصول المحلية المطلوبة:

- `assets/models/interrogation_room.glb`
- `assets/characters/player01.fbx`
- `assets/characters/player02.fbx`
