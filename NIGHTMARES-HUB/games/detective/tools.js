const DetectiveTools = (() => {
  const placeholderImagePath = "assets/tools/placeholder.png";
  const toolAssets = [
    tool("knife", "سكين", "Knife", "weapon", "Weapon", "أداة حادة قد تترك جروحاً عميقة ونزيفاً واضحاً.", "assets/tools/knife.png"),
    tool("hammer", "مطرقة", "Hammer", "weapon", "Weapon", "أداة معدنية ثقيلة قادرة على إحداث كسور قوية.", "assets/tools/hammer.png"),
    tool("rope", "حبل", "Rope", "weapon", "Weapon", "أداة مرنة قد ترتبط بالربط أو الضغط أو الاختناق.", "assets/tools/rope.png"),
    tool("poison_bottle", "زجاجة سم", "Poison bottle", "weapon", "Weapon", "مادة خطرة قد تؤثر ببطء ولا تترك أثراً خارجياً واضحاً.", "assets/tools/poison-bottle.png"),
    tool("syringe", "حقنة", "Syringe", "weapon", "Weapon", "أداة دقيقة قد تنقل مادة مؤثرة إلى الجسد.", "assets/tools/syringe.png"),
    tool("pistol", "مسدس", "Gun", "weapon", "Weapon", "سلاح ناري يترك أثراً نافذاً وسريعاً.", "assets/tools/pistol.png"),
    tool("crowbar", "عتلة", "Crowbar", "weapon", "Weapon", "قطعة معدنية صلبة تستخدم للكسر أو الضرب القوي.", "assets/tools/crowbar.png"),
    tool("lighter", "ولاعة", "Lighter", "dangerous", "Dangerous", "مصدر نار صغير قد يرتبط بالحرق أو التمويه.", "assets/tools/lighter.png"),

    tool("camera", "كاميرا", "Camera", "normal", "Normal", "أداة تصوير قد تحفظ دليلاً أو تستخدم كتشتيت.", "assets/tools/camera.png"),
    tool("coffee_cup", "كوب قهوة", "Coffee cup", "civilian", "Civilian", "غرض يومي قد يحمل أثراً أو بقايا مادة.", "assets/tools/coffee-cup.png"),
    tool("gloves", "قفازات", "Gloves", "cleaning", "Cleaning", "قد تمنع ترك البصمات أو تشير إلى محاولة احتراز.", "assets/tools/gloves.png"),
    tool("tape", "شريط لاصق", "Tape", "suspicious", "Suspicious", "يمكن استخدامه للتثبيت أو الإخفاء أو ترتيب مشهد زائف.", "assets/tools/tape.png"),
    tool("flashlight", "مصباح", "Flashlight", "normal", "Normal", "أداة إضاءة قد تظهر في الأماكن المظلمة أو أثناء الحركة.", "assets/tools/flashlight.png"),
    tool("phone", "هاتف", "Phone", "civilian", "Civilian", "غرض شخصي قد يحمل توقيتاً أو اتصالاً أو أثراً سطحياً.", "assets/tools/phone.png"),
    tool("keys", "مفاتيح", "Keys", "civilian", "Civilian", "غرض دخول عادي قد يفسر الوصول إلى مكان مغلق.", "assets/tools/keys.png"),
    tool("mask", "قناع", "Mask", "suspicious", "Suspicious", "قد يخفي الهوية أو يشير إلى نية مسبقة.", "assets/tools/mask.png"),
    tool("towel", "منشفة", "Towel", "cleaning", "Cleaning", "قطعة قماش قد تمتص سوائل أو تستخدم للتنظيف.", "assets/tools/towel.png"),
    tool("notebook", "دفتر ملاحظات", "Notebook", "civilian", "Civilian", "غرض عادي قد يفتح باباً للشك أو الملاحظة.", "assets/tools/notebook.png"),
    tool("screwdriver", "مفك", "Screwdriver", "dangerous", "Dangerous", "أداة مدببة قد تستخدم للإصلاح أو لإحداث أثر حاد.", "assets/tools/screwdriver.png"),
    tool("wrench", "مفتاح ربط", "Wrench", "dangerous", "Dangerous", "أداة ثقيلة قد تترك أثراً معدنياً أو كسراً.", "assets/tools/wrench.png"),
    tool("usb", "ذاكرة USB", "USB", "civilian", "Civilian", "غرض صغير قد يوحي بسر أو دافع أو تشتيت.", "assets/tools/usb.png"),
    tool("backpack", "حقيبة ظهر", "Backpack", "civilian", "Civilian", "يمكن أن تخفي أدوات أو تنقل أغراضاً دون انتباه.", "assets/tools/backpack.png"),
    tool("medicine_bottle", "عبوة دواء", "Medicine bottle", "suspicious", "Suspicious", "غرض طبي قد يرتبط بمادة أو جرعة أو تضليل.", "assets/tools/medicine-bottle.png"),
    tool("wallet", "محفظة", "Wallet", "civilian", "Civilian", "غرض شخصي عادي قد يربط صاحبه بمكان أو وقت.", "assets/tools/wallet.png"),
    tool("scissors", "مقص", "Scissors", "dangerous", "Dangerous", "أداة حادة مألوفة قد تترك أثراً قصيراً ومباشراً.", "assets/tools/scissors.png"),
    tool("cloth", "قطعة قماش", "Cloth", "cleaning", "Cleaning", "قطعة مرنة قد تستخدم للمسح أو التغطية أو التمويه.", "assets/tools/bloody-cloth.png"),
    tool("boots", "حذاء ثقيل", "Boots", "civilian", "Civilian", "قد يترك أثار أقدام أو يوحي بحركة في مكان معين.", "assets/tools/boots.png"),
    tool("keycard", "بطاقة دخول", "Keycard", "investigation", "Investigation", "قد تفسر الدخول أو توقيت المرور في مكان مراقب.", "assets/tools/keycard.png"),
    tool("tape_recorder", "مسجل صوت", "Tape recorder", "investigation", "Investigation", "قد يحفظ كلاماً أو يستخدم لإرباك تسلسل الأحداث.", "assets/tools/tape-recorder.png")
  ];

  const byId = toolAssets.reduce((index, toolAsset) => {
    index[toolAsset.id] = toolAsset;
    return index;
  }, {});

  function tool(id, nameAr, nameEn, type, typeLabel, descriptionAr, imagePath) {
    return { id, nameAr, nameEn, type, typeLabel, descriptionAr, imagePath };
  }

  function getTool(toolId) {
    return byId[toolId] || {
      id: toolId,
      nameAr: "أداة غير معروفة",
      nameEn: "Unknown tool",
      type: "unknown",
      typeLabel: "Unknown",
      descriptionAr: "لم يتم العثور على بيانات هذه الأداة.",
      imagePath: placeholderImagePath
    };
  }

  function getAllTools() {
    return [...toolAssets];
  }

  function getRandomToolIds(count) {
    return shuffle(toolAssets).slice(0, count).map(item => item.id);
  }

  function shuffle(items) {
    const result = [...items];

    for (let index = result.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
    }

    return result;
  }

  return {
    getTool,
    getAllTools,
    getRandomToolIds,
    placeholderImagePath
  };
})();
