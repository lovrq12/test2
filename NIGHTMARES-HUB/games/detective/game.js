const DetectiveGame = (() => {
  const KILLER_TOOLS_STATUS = "killerTools";
  const FORENSIC_SETUP_STATUS = "forensicSetup";
  const INVESTIGATION_STATUS = "investigation";
  const ACCUSATION_STATUS = "accusation";
  const END_STATUS = "end";

  const forensicCategories = {
    deathCauses: [
      option("heavy_bleeding", "نزيف حاد", "severe bleeding", "سبب الوفاة يميل إلى فقدان دم كبير."),
      option("suffocation", "اختناق", "suffocation", "هناك مؤشر على نقص تنفس أو ضغط متواصل."),
      option("poisoning", "تسمم", "poisoning", "الأثر الداخلي أقوى من الأثر الخارجي."),
      option("blunt_trauma", "صدمة قوية", "blunt trauma", "الأثر يوحي بضربة من جسم ثقيل."),
      option("sharp_wound", "جرح حاد", "sharp wound", "الإصابة تبدو حادة ومركزة."),
      option("broken_bones", "كسور", "broken bones", "هناك كسور واضحة أو أثر ضغط شديد."),
      option("burns", "حروق", "burns", "توجد علامات حرارة أو احتراق."),
      option("electric_shock", "صدمة كهربائية", "electric shock", "الأثر يوحي بتدخل كهربائي.")
    ],
    bodyConditions: [
      option("body_moved", "الجثة حُرّكت", "body moved", "يبدو أن الجثة نُقلت بعد الوفاة."),
      option("hidden_body", "الجثة مخفية", "hidden body", "تمت محاولة إخفاء الجثة أو إبعادها عن النظر."),
      option("partially_burned", "حروق جزئية", "partially burned", "بعض الآثار تعرضت لحرارة أو احتراق."),
      option("struggle_signs", "آثار مقاومة", "signs of struggle", "توجد علامات مقاومة أو اضطراب."),
      option("cleaned_scene", "محاولة تنظيف", "cleaned crime scene", "هناك آثار تنظيف أو مسح متعمد."),
      option("tied_victim", "الضحية كانت مقيّدة", "tied victim", "توجد مؤشرات على تقييد أو ضغط."),
      option("covered_body", "الجثة مغطاة", "covered body", "تم تغطية جزء من الجثة أو إخفاء معالمها.")
    ],
    evidenceTypes: [
      option("blood_traces", "آثار دم", "blood traces", "توجد آثار دم لا تكشف الأداة مباشرة."),
      option("partial_fingerprints", "بصمات جزئية", "partial fingerprints", "البصمات غير مكتملة ولا تكفي وحدها."),
      option("broken_glass", "زجاج مكسور", "broken glass", "كسر قريب من المشهد قد يكون حقيقياً أو مضللاً."),
      option("hair_traces", "آثار شعر", "hair traces", "أثر صغير يحتاج مقارنة دقيقة."),
      option("fabric_piece", "قطعة قماش", "fabric piece", "قطعة قماش أو ألياف ظهرت في المشهد."),
      option("footprints", "آثار أقدام", "footprints", "الأرض تركت أثراً لحركة شخص ما."),
      option("drag_marks", "آثار سحب", "dragged body marks", "هناك علامات سحب أو حركة ثقيلة."),
      option("weapon_hidden", "الأداة مخفية", "weapon hidden", "الأداة الدقيقة ليست ظاهرة في المشهد.")
    ],
    locations: [
      option("kitchen", "المطبخ", "kitchen", "المكان يوحي بقرب أدوات منزلية وروائح متداخلة."),
      option("rooftop", "السطح", "rooftop", "المكان مرتفع ومكشوف جزئياً."),
      option("office", "المكتب", "office", "المكان منظم لكن بعض التفاصيل تغيرت."),
      option("bathroom", "الحمام", "bathroom", "توجد رطوبة أو آثار تنظيف محتملة."),
      option("warehouse", "المستودع", "warehouse", "المكان واسع وفيه زوايا معتمة."),
      option("alley", "الزقاق", "alley", "المكان ضيق ويترك آثار عبور متقطعة."),
      option("parking_garage", "موقف السيارات", "parking garage", "المكان معدني وبارد وكثير الحركة."),
      option("bedroom", "غرفة النوم", "bedroom", "المكان خاص وهادئ وتظهر فيه التفاصيل الصغيرة."),
      option("living_room", "الصالة", "living room", "المكان مشترك وقد تختلط فيه الحركة."),
      option("garden", "الحديقة", "garden", "المكان خارجي والأرض قد تحفظ أثراً ناقصاً.")
    ],
    forensicDetails: [
      option("misleading_evidence", "دليل مضلل", "misleading evidence", "هناك أثر يبدو مقصوداً لتوجيه الشك."),
      option("delayed_death", "وفاة متأخرة", "delayed death", "الزمن بين الفعل والوفاة ليس مباشراً."),
      option("fake_struggle", "مقاومة مزيفة", "fake struggle", "بعض الفوضى قد تكون مصطنعة."),
      option("interrupted_attack", "هجوم متقطع", "interrupted attack", "يبدو أن الفعل لم يحدث دفعة واحدة."),
      option("multiple_injuries", "إصابات متعددة", "multiple injuries", "هناك أكثر من أثر يحتاج ترتيباً زمنياً.")
    ]
  };

  function option(id, nameAr, nameEn, publicText) {
    return { id, nameAr, nameEn, publicText };
  }

  function createKillerToolPhase({ privateRoles }) {
    const playerIds = Object.keys(privateRoles || {});

    if (!findPlayerByRole(privateRoles, "killer")) {
      throw new Error("لا يمكن بدء اختيار الأدوات بدون قاتل.");
    }

    return {
      publicUpdates: {
        status: KILLER_TOOLS_STATUS,
        playerStates: buildPlayerStates(playerIds, KILLER_TOOLS_STATUS),
        caseFile: null
      },
      privateUpdates: buildKillerToolPrivateUpdates(privateRoles)
    };
  }

  function buildKillerToolPrivateUpdates(privateRoles) {
    const updates = {};

    Object.entries(privateRoles || {}).forEach(([playerId, privateData]) => {
      const isKiller = privateData.role === "killer";
      updates[playerId] = {
        killerPanel: {
          phase: KILLER_TOOLS_STATUS,
          visibility: isKiller ? "chooseTools" : "waiting",
          title: isKiller ? "اختر أداتين" : "بانتظار اختيار القاتل",
          message: isKiller
            ? "اختر أداتين فقط من أدواتك الثمانية. لا تحدد سبب الوفاة أو الموقع."
            : "القاتل يختار أداتين سرياً. لا توجد معلومات عامة الآن."
        }
      };
    });

    return updates;
  }

  function submitKillerTools({ privateRoles, playerTools, playerNames, killerId, selectedToolIds }) {
    const killerData = privateRoles?.[killerId];

    if (!killerData || killerData.role !== "killer") {
      throw new Error("القاتل فقط يستطيع اختيار أدوات الجريمة.");
    }

    const chosenToolIds = normalizeToolSelection(selectedToolIds);
    const ownTools = playerTools?.[killerId] || [];

    if (chosenToolIds.length !== 2) {
      throw new Error("اختر أداتين بالضبط.");
    }

    if (chosenToolIds.some(toolId => !ownTools.includes(toolId))) {
      throw new Error("يجب اختيار الأدوات من أدوات القاتل فقط.");
    }

    const forensicId = findPlayerByRole(privateRoles, "forensic");

    if (!forensicId) {
      throw new Error("لا يوجد طبيب شرعي لاستلام الأدوات.");
    }

    return {
      publicUpdates: {
        status: FORENSIC_SETUP_STATUS,
        playerStates: buildPlayerStates(Object.keys(privateRoles || {}), FORENSIC_SETUP_STATUS),
        caseFile: {
          statusText: "الطبيب الشرعي يبني لوحة التحقيق الآن.",
          createdAt: DetectiveFirebase.serverTimestamp
        }
      },
      privateUpdates: buildForensicSetupPrivateUpdates({
        privateRoles,
        killerId,
        forensicId,
        playerNames,
        chosenToolIds
      })
    };
  }

  function buildForensicSetupPrivateUpdates({ privateRoles, killerId, forensicId, playerNames, chosenToolIds }) {
    const updates = {};

    Object.entries(privateRoles || {}).forEach(([playerId, privateData]) => {
      const update = {
        killerPanel: {
          phase: FORENSIC_SETUP_STATUS,
          visibility: "submitted",
          title: "تم تسليم الأدوات",
          message: "الطبيب الشرعي يستلم المعلومات الآن."
        }
      };

      if (playerId === killerId) {
        update.killerSelection = {
          chosenToolIds,
          submittedAt: DetectiveFirebase.serverTimestamp
        };
      }

      if (playerId === forensicId) {
        update.forensicPanel = {
          phase: FORENSIC_SETUP_STATUS,
          visibility: "caseBuilder",
          killer: {
            id: killerId,
            name: playerNames?.[killerId] || "القاتل"
          },
          chosenToolIds,
          title: "ابنِ لوحة التحقيق",
          message: "ترى القاتل والأداتين فقط. اختر سبب الوفاة والحالة والموقع والأدلة بنفسك."
        };
      } else if (privateData.role !== "forensic") {
        update.forensicPanel = {
          phase: FORENSIC_SETUP_STATUS,
          visibility: "waiting",
          title: "بانتظار الطبيب الشرعي",
          message: "سيبدأ التحقيق بعد أن يبني الطبيب الشرعي القضية."
        };
      }

      updates[playerId] = update;
    });

    return updates;
  }

  function createForensicCase({ privateData, caseInput }) {
    const panel = privateData?.forensicPanel;

    if (privateData?.role !== "forensic" || panel?.visibility !== "caseBuilder") {
      throw new Error("الطبيب الشرعي فقط يستطيع بناء لوحة التحقيق.");
    }

    const caseData = normalizeForensicCaseInput(caseInput);
    const prompts = buildHintPrompts(caseData);

    return {
      publicUpdates: {
        status: INVESTIGATION_STATUS,
        playerStatesPhase: INVESTIGATION_STATUS,
        caseFile: {
          statusText: "بدأ التحقيق. المعلومات العامة تظهر فقط عبر تلميحات الطبيب الشرعي.",
          openedAt: DetectiveFirebase.serverTimestamp
        }
      },
      privateUpdates: {
        forensicPanel: {
          phase: INVESTIGATION_STATUS,
          visibility: "hintControl",
          killer: panel.killer,
          chosenToolIds: panel.chosenToolIds || [],
          caseData,
          hintPrompts: prompts,
          title: "لوحة التلميحات",
          message: "أطلق التلميحات تدريجياً دون كشف اسم الأداة أو القاتل أو الموقع حرفياً."
        }
      }
    };
  }

  function normalizeForensicCaseInput(caseInput = {}) {
    const caseData = {
      deathCauseId: requireCategoryValue("deathCauses", caseInput.deathCauseId, "اختر سبب الوفاة."),
      bodyConditionId: requireCategoryValue("bodyConditions", caseInput.bodyConditionId, "اختر حالة الجثة."),
      evidenceTypeId: requireCategoryValue("evidenceTypes", caseInput.evidenceTypeId, "اختر نوع الدليل."),
      locationId: requireCategoryValue("locations", caseInput.locationId, "اختر الموقع."),
      forensicDetailId: requireCategoryValue("forensicDetails", caseInput.forensicDetailId, "اختر تفصيلاً جنائياً."),
      hiddenDetails: String(caseInput.hiddenDetails || "").trim().slice(0, 220)
    };

    return {
      deathCause: getCategoryOption("deathCauses", caseData.deathCauseId),
      bodyCondition: getCategoryOption("bodyConditions", caseData.bodyConditionId),
      evidenceType: getCategoryOption("evidenceTypes", caseData.evidenceTypeId),
      location: getCategoryOption("locations", caseData.locationId),
      forensicDetail: getCategoryOption("forensicDetails", caseData.forensicDetailId),
      hiddenDetails: caseData.hiddenDetails
    };
  }

  function requireCategoryValue(categoryName, value, message) {
    const cleanValue = String(value || "").trim();

    if (!getCategoryOption(categoryName, cleanValue)) {
      throw new Error(message);
    }

    return cleanValue;
  }

  function getCategoryOption(categoryName, value) {
    return forensicCategories[categoryName].find(item => item.id === value) || null;
  }

  function buildHintPrompts(caseData) {
    return [
      prompt("death_cause", "سبب الوفاة", caseData.deathCause),
      prompt("body_condition", "حالة الجثة", caseData.bodyCondition),
      prompt("evidence_type", "الدليل", caseData.evidenceType),
      prompt("location_vague", "ملامح المكان", {
        id: caseData.location.id,
        nameAr: "مؤشر مكاني غير مباشر",
        publicText: caseData.location.publicText
      }),
      prompt("forensic_detail", "تفصيل جنائي", caseData.forensicDetail)
    ];
  }

  function prompt(id, categoryLabel, optionValue) {
    return {
      id,
      categoryLabel,
      title: optionValue.nameAr,
      text: optionValue.publicText
    };
  }

  function createForensicHint({ privateData, playerNames, selectedHintId, customText }) {
    const panel = privateData?.forensicPanel;

    if (privateData?.role !== "forensic" || panel?.visibility !== "hintControl") {
      throw new Error("الطبيب الشرعي فقط يستطيع إرسال التلميحات.");
    }

    const prompts = panel.hintPrompts || [];
    const selectedHint = selectedHintId && selectedHintId !== "__custom__"
      ? prompts.find(hint => hint.id === selectedHintId)
      : null;
    const cleanCustomText = String(customText || "").trim().slice(0, 220);

    if (selectedHintId && selectedHintId !== "__custom__" && !selectedHint) {
      throw new Error("اختر تلميحاً صحيحاً.");
    }

    if (!selectedHint && !cleanCustomText) {
      throw new Error("اختر تلميحاً أو اكتب نصاً يدوياً.");
    }

    const text = [selectedHint?.text, cleanCustomText].filter(Boolean).join(" ");
    validatePublicHintText(text, playerNames, panel);

    return {
      source: "forensic",
      authorLabel: "الطبيب الشرعي",
      selectedHintId: selectedHint?.id || "",
      categoryLabel: selectedHint?.categoryLabel || "ملاحظة يدوية",
      title: selectedHint?.title || "ملاحظة الطبيب الشرعي",
      text,
      createdAt: DetectiveFirebase.serverTimestamp
    };
  }

  function createDiscussionMessage({ playerId, playerName, text }) {
    const cleanText = String(text || "").trim().slice(0, 260);

    if (!cleanText) {
      throw new Error("اكتب رسالة قبل الإرسال.");
    }

    return {
      source: "player",
      playerId,
      playerName: playerName || "لاعب",
      text: cleanText,
      createdAt: DetectiveFirebase.serverTimestamp
    };
  }

  function createEndReveal({ privateRoles, playerNames, playerTools, forensicPanel, investigationFeed, accusedPlayerId }) {
    const killerId = findPlayerByRole(privateRoles, "killer");
    const accompliceId = findPlayerByRole(privateRoles, "accomplice");
    const witnessId = findPlayerByRole(privateRoles, "witness");
    const forensicId = findPlayerByRole(privateRoles, "forensic");
    const chosenToolIds = forensicPanel?.chosenToolIds || [];
    const caseData = forensicPanel?.caseData || {};
    const investigatorsWin = accusedPlayerId === killerId;

    return {
      accusedPlayerId,
      winningSide: investigatorsWin ? "investigators" : "killerTeam",
      winnerLabel: investigatorsWin ? "فاز المحققون" : "فاز القاتل والشريك",
      killer: playerSummary(killerId, playerNames),
      accomplice: playerSummary(accompliceId, playerNames),
      witness: playerSummary(witnessId, playerNames),
      forensic: playerSummary(forensicId, playerNames),
      accused: playerSummary(accusedPlayerId, playerNames),
      chosenTools: chosenToolIds.map(toolId => DetectiveTools.getTool(toolId)),
      caseData,
      releasedHints: Object.values(investigationFeed || {})
        .filter(Boolean)
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)),
      playerTools: playerTools || {}
    };
  }

  function playerSummary(playerId, playerNames = {}) {
    if (!playerId) {
      return { id: "", name: "غير موجود" };
    }

    return {
      id: playerId,
      name: playerNames[playerId] || "لاعب غير معروف"
    };
  }

  function validatePublicHintText(text, playerNames = {}, panel = {}) {
    const cleanText = normalizeSearchText(text);
    const chosenToolNames = (panel.chosenToolIds || [])
      .flatMap(toolId => {
        const item = DetectiveTools.getTool(toolId);
        return [item.id, item.nameAr, item.nameEn];
      })
      .filter(Boolean);
    const location = panel.caseData?.location;
    const restrictedTerms = [
      ...(chosenToolNames || []),
      location?.id,
      location?.nameAr,
      location?.nameEn,
      panel.killer?.name,
      ...Object.values(playerNames || {})
    ].filter(Boolean);

    if (restrictedTerms.some(term => includesSearchTerm(cleanText, term))) {
      throw new Error("التلميح يكشف اسماً أو أداة أو موقعاً مباشراً.");
    }
  }

  function describeKillerSetup({ privateData }) {
    const panel = privateData?.killerPanel;

    if (!panel) {
      return {
        label: "بيانات خاصة",
        title: "انتظار البيانات...",
        description: "ستظهر هنا معلوماتك المسموح بها.",
        details: [],
        canChooseTools: false
      };
    }

    return {
      label: privateData?.role === "killer" ? "للقاتل فقط" : "المرحلة الحالية",
      title: panel.title,
      description: panel.message,
      details: privateData?.role === "killer"
        ? [
          { label: "المسموح", value: "اختر أداتين فقط من أدواتك." },
          { label: "الممنوع", value: "لا تختار موقعاً أو سبب وفاة أو تلميحات." }
        ]
        : [{ label: "الحالة", value: panel.message }],
      canChooseTools: panel.visibility === "chooseTools"
    };
  }

  function describeInvestigation({ privateData, publicCaseFile, status, playerNames = {} }) {
    const panel = privateData?.forensicPanel;
    const privateDetails = [];
    let forensicPanel = null;

    if (privateData?.role === "witness") {
      privateDetails.push(
        { label: "القاتل", value: playerNames[privateData.knownKiller] || "غير معروف" },
        { label: "الشريك", value: playerNames[privateData.knownAccomplice] || "غير معروف" }
      );
    }

    if (panel?.visibility === "caseBuilder") {
      forensicPanel = {
        mode: "caseBuilder",
        killer: panel.killer,
        chosenToolIds: panel.chosenToolIds || []
      };
      privateDetails.push(
        { label: "القاتل", value: panel.killer?.name || "غير محدد" },
        { label: "الأدوات المختارة", value: formatTools(panel.chosenToolIds || []) }
      );
    } else if (panel?.visibility === "hintControl") {
      forensicPanel = {
        mode: "hintControl",
        killer: panel.killer,
        chosenToolIds: panel.chosenToolIds || [],
        caseData: panel.caseData,
        hints: panel.hintPrompts || []
      };
      privateDetails.push(
        { label: "القاتل", value: panel.killer?.name || "غير محدد" },
        { label: "الأدوات المختارة", value: formatTools(panel.chosenToolIds || []) },
        { label: "سبب الوفاة", value: panel.caseData?.deathCause?.nameAr || "غير محدد" },
        { label: "الموقع الحقيقي", value: panel.caseData?.location?.nameAr || "غير محدد" }
      );
    } else if (panel?.visibility === "waiting" && status === FORENSIC_SETUP_STATUS) {
      privateDetails.push({ label: "الحالة", value: panel.message });
    }

    if (!privateDetails.length) {
      privateDetails.push({ label: "الحالة", value: "اعتمد فقط على تلميحات الطبيب الشرعي وأدوات اللاعبين." });
    }

    return {
      title: status === FORENSIC_SETUP_STATUS ? "بانتظار الطبيب الشرعي" : "التحقيق مفتوح",
      description: publicCaseFile?.statusText || "لا تظهر أي تفاصيل إلا عندما ينشرها الطبيب الشرعي.",
      details: [
        { label: "القاعدة الأساسية", value: "التلميحات المنشورة فقط هي المعلومات العامة." },
        { label: "الأدوات", value: "كل لاعب يملك 8 أدوات عامة قابلة للفحص." }
      ],
      privateTitle: panel?.title || "بياناتك الخاصة",
      privateDescription: panel?.message || "لا توجد معلومات خاصة إضافية الآن.",
      privateDetails,
      forensicPanel
    };
  }

  function buildPlayerStates(playerIds, phase) {
    return playerIds.reduce((states, playerId) => {
      states[playerId] = {
        phase,
        ready: true,
        connected: true
      };
      return states;
    }, {});
  }

  function normalizeToolSelection(selectedToolIds = []) {
    return [...new Set(
      (Array.isArray(selectedToolIds) ? selectedToolIds : [])
        .map(toolId => String(toolId || "").trim())
        .filter(Boolean)
    )];
  }

  function findPlayerByRole(privateRoles, role) {
    return Object.keys(privateRoles || {}).find(playerId => privateRoles[playerId]?.role === role) || "";
  }

  function formatTools(toolIds) {
    return toolIds.map(toolId => DetectiveTools.getTool(toolId).nameAr).join("، ") || "لا توجد";
  }

  function normalizeSearchText(value = "") {
    return String(value)
      .toLowerCase()
      .replace(/[ًٌٍَُِّْـ]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function includesSearchTerm(cleanText, term) {
    const cleanTerm = normalizeSearchText(term);

    return cleanTerm.length >= 2 && cleanText.includes(cleanTerm);
  }

  return {
    killerToolsStatus: KILLER_TOOLS_STATUS,
    forensicSetupStatus: FORENSIC_SETUP_STATUS,
    investigationStatus: INVESTIGATION_STATUS,
    accusationStatus: ACCUSATION_STATUS,
    endStatus: END_STATUS,
    forensicCategories,
    createKillerToolPhase,
    submitKillerTools,
    createForensicCase,
    createForensicHint,
    createDiscussionMessage,
    createEndReveal,
    describeKillerSetup,
    describeInvestigation
  };
})();
