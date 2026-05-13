// constants.js — ثوابت اللعبة

const GAME_VERSION = '1.0.0';

const ITEMS = [
  { id: 'apple',   name: 'تفاحة',       emoji: '🍎', color: 'أحمر',    hints: ['تؤكل', 'خفيفة', 'دائرية الشكل'] },
  { id: 'key',     name: 'مفتاح',       emoji: '🗝️', color: 'فضي',     hints: ['معدن', 'صغير الحجم', 'يفتح الأبواب'] },
  { id: 'watch',   name: 'ساعة',        emoji: '⌚', color: 'أسود',    hints: ['تُلبَس في المعصم', 'تعرض الوقت', 'مصنوعة من زجاج'] },
  { id: 'coin',    name: 'عملة معدنية', emoji: '🪙', color: 'ذهبي',   hints: ['صغيرة ودائرية', 'معدنية', 'لها قيمة مالية'] },
  { id: 'cube',    name: 'مكعب ملون',   emoji: '🧩', color: 'متعدد',  hints: ['لعبة', 'ستة أوجه', 'يُحل بالتفكير'] },
  { id: 'phone',   name: 'هاتف',        emoji: '📱', color: 'أسود',   hints: ['إلكتروني', 'للتواصل', 'شاشة لمس'] },
  { id: 'pen',     name: 'قلم',         emoji: '🖊️', color: 'أزرق',   hints: ['يُكتب به', 'أسطواني', 'حبر'] },
  { id: 'book',    name: 'كتاب',        emoji: '📖', color: 'بني',    hints: ['يُقرأ', 'ورق وغلاف', 'يحتوي كلمات'] },
  { id: 'ring',    name: 'خاتم',        emoji: '💍', color: 'ذهبي',   hints: ['مجوهرات', 'دائري', 'يُلبَس في الإصبع'] },
  { id: 'scissors',name: 'مقص',         emoji: '✂️', color: 'فضي',    hints: ['للقطع', 'حاد', 'لاه نصلين'] },
  { id: 'empty',   name: 'صندوق فارغ',  emoji: '📦', color: 'لا يوجد', hints: [] }
];

const ROOM_STATUS = {
  LOBBY:    'lobby',
  PLAYING:  'playing',
  FINISHED: 'finished'
};

const ROUND_STATUS = {
  CHOOSE_MODE:  'chooseMode',
  QUESTIONING:  'questioning',
  GUESSING:     'guessing',
  REVEAL:       'reveal',
  FINISHED:     'finished'
};

const ROUND_TURN = {
  INVESTIGATOR_QUESTION: 'investigatorQuestion',
  SPEAKER_ANSWER:        'speakerAnswer'
};

const DEFAULT_SETTINGS = {
  roundTime:  60,   // ثانية
  maxPlayers: 8
};

const ROUND_TIME_OPTIONS = [30, 45, 60, 90, 120];
const MAX_PLAYERS_OPTIONS = [2, 4, 6, 8, 10, 12, 14, 16];

const SKINS = [
  { id: 'skin1', name: 'المحقق', emoji: '🕵️' },
  { id: 'skin2', name: 'الخصم',  emoji: '🥷' }
];
