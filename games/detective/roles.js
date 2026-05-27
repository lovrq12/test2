const DetectiveRoles = (() => {
  const MIN_PLAYERS = 4;
  const TOOLS_PER_PLAYER = 8;

  const ROLE_META = {
    killer: {
      name: "القاتل",
      description: "اختر أداتين فقط من أدواتك الثمانية. لا تختار سبب الوفاة أو الموقع أو التلميحات."
    },
    accomplice: {
      name: "الشريك",
      description: "تعرف القاتل فقط. لا تعرف الأدوات المختارة ولا تفاصيل التحقيق."
    },
    witness: {
      name: "الشاهد",
      description: "تعرف القاتل والشريك إن وُجد. ساعد المحققين بحذر دون أن تكشف نفسك مباشرة."
    },
    forensic: {
      name: "الطبيب الشرعي",
      description: "بعد اختيار القاتل للأداتين، ترى القاتل والأدوات وتبني قضية التحقيق يدوياً."
    },
    investigator: {
      name: "محقق",
      description: "حلل تلميحات الطبيب الشرعي وأدوات اللاعبين للوصول إلى القاتل."
    }
  };

  function createDistribution(playerIds, settings = {}) {
    const cleanPlayerIds = [...new Set(playerIds || [])].filter(Boolean);
    const roleSettings = normalizeRoleSettings(settings, cleanPlayerIds);
    const minimumPlayers = getMinimumPlayers(roleSettings);

    if (cleanPlayerIds.length < minimumPlayers) {
      throw new Error(`تحتاج إلى ${minimumPlayers} لاعبين على الأقل لهذه الإعدادات.`);
    }

    const assignments = Object.fromEntries(cleanPlayerIds.map(playerId => [playerId, "investigator"]));
    const used = new Set();
    const shuffledPlayers = shuffle(cleanPlayerIds);
    const forensicId = chooseRolePlayer({
      roleName: "الطبيب الشرعي",
      preferredId: roleSettings.forensicDoctorPlayerId,
      candidates: shuffledPlayers,
      used,
      required: true
    });
    const killerId = chooseRolePlayer({
      roleName: "القاتل",
      preferredId: roleSettings.autoRoleAssignment ? "" : roleSettings.manualKillerId,
      candidates: shuffledPlayers,
      used,
      required: true
    });
    const accompliceId = roleSettings.accompliceEnabled
      ? chooseRolePlayer({
        roleName: "الشريك",
        preferredId: roleSettings.autoRoleAssignment ? "" : roleSettings.manualAccompliceId,
        candidates: shuffledPlayers,
        used,
        required: true
      })
      : "";
    const witnessId = roleSettings.witnessEnabled
      ? chooseRolePlayer({
        roleName: "الشاهد",
        preferredId: roleSettings.autoRoleAssignment ? "" : roleSettings.manualWitnessId,
        candidates: shuffledPlayers,
        used,
        required: true
      })
      : "";

    assignments[forensicId] = "forensic";
    assignments[killerId] = "killer";

    if (accompliceId) {
      assignments[accompliceId] = "accomplice";
    }

    if (witnessId) {
      assignments[witnessId] = "witness";
    }

    return {
      assignments,
      roleIds: {
        killerId,
        accompliceId,
        witnessId,
        forensicId
      },
      playerTools: buildPlayerTools(cleanPlayerIds),
      privateRoles: buildPrivateRoles({
        playerIds: cleanPlayerIds,
        assignments,
        killerId,
        accompliceId,
        witnessId,
        forensicId
      })
    };
  }

  function normalizeRoleSettings(settings = {}, playerIds = []) {
    const validId = playerId => playerIds.includes(playerId) ? playerId : "";

    return {
      autoRoleAssignment: settings.autoRoleAssignment !== false,
      accompliceEnabled: settings.accompliceEnabled !== false,
      witnessEnabled: settings.witnessEnabled !== false,
      forensicDoctorPlayerId: validId(settings.forensicDoctorPlayerId || ""),
      manualKillerId: validId(settings.manualKillerId || ""),
      manualAccompliceId: validId(settings.manualAccompliceId || ""),
      manualWitnessId: validId(settings.manualWitnessId || "")
    };
  }

  function getMinimumPlayers(settings = {}) {
    const specialRoles = 2
      + (settings.accompliceEnabled !== false ? 1 : 0)
      + (settings.witnessEnabled !== false ? 1 : 0);

    return Math.max(MIN_PLAYERS, specialRoles + 1);
  }

  function chooseRolePlayer({ roleName, preferredId, candidates, used, required }) {
    if (preferredId) {
      if (used.has(preferredId)) {
        throw new Error(`${roleName} مختار لدور آخر. اختر لاعباً مختلفاً.`);
      }

      used.add(preferredId);
      return preferredId;
    }

    const playerId = candidates.find(candidate => !used.has(candidate));

    if (!playerId && required) {
      throw new Error(`لا يوجد لاعب متاح لدور ${roleName}.`);
    }

    if (playerId) {
      used.add(playerId);
    }

    return playerId || "";
  }

  function buildPrivateRoles({ playerIds, assignments, killerId, accompliceId, witnessId }) {
    const privateRoles = {};

    playerIds.forEach(playerId => {
      const role = assignments[playerId];
      privateRoles[playerId] = { role };

      if (role === "accomplice") {
        privateRoles[playerId].knownKiller = killerId;
      }

      if (role === "witness") {
        privateRoles[playerId].knownKiller = killerId;

        if (accompliceId) {
          privateRoles[playerId].knownAccomplice = accompliceId;
        }
      }

      if (role === "forensic") {
        privateRoles[playerId].caseAuthority = true;
      }

      if (playerId === witnessId) {
        privateRoles[playerId].mustStayHidden = true;
      }
    });

    return privateRoles;
  }

  function buildPlayerTools(playerIds) {
    return playerIds.reduce((toolsByPlayer, playerId) => {
      toolsByPlayer[playerId] = DetectiveTools.getRandomToolIds(TOOLS_PER_PLAYER);
      return toolsByPlayer;
    }, {});
  }

  function getRoleMeta(role) {
    return ROLE_META[role] || ROLE_META.investigator;
  }

  function describePrivateRole(privateData, playerNames = {}) {
    if (!privateData?.role) {
      return {
        ...ROLE_META.investigator,
        name: "جاري تحميل الدور...",
        description: "لم تصل بياناتك السرية بعد.",
        details: []
      };
    }

    const meta = getRoleMeta(privateData.role);
    const details = [];

    if (privateData.knownKiller) {
      details.push({
        label: "القاتل المعروف لك",
        value: playerNames[privateData.knownKiller] || "لاعب غير معروف"
      });
    }

    if (privateData.knownAccomplice) {
      details.push({
        label: "الشريك المعروف لك",
        value: playerNames[privateData.knownAccomplice] || "لاعب غير معروف"
      });
    }

    if (privateData.role === "killer") {
      details.push({
        label: "مهمتك الآن",
        value: "لا تكشف شيئاً. في المرحلة التالية اختر أداتين فقط من أدواتك."
      });
    }

    if (privateData.role === "forensic") {
      details.push({
        label: "صلاحيتك",
        value: "أنت من يصنع لوحة التحقيق ويطلق التلميحات تدريجياً."
      });
    }

    if (!details.length) {
      details.push({
        label: "معلومة خاصة",
        value: "لا توجد معلومات سرية إضافية في هذه المرحلة."
      });
    }

    return {
      ...meta,
      details
    };
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
    minPlayers: MIN_PLAYERS,
    toolsPerPlayer: TOOLS_PER_PLAYER,
    createDistribution,
    getMinimumPlayers,
    getRoleMeta,
    describePrivateRole
  };
})();
