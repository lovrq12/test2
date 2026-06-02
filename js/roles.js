// ===== NIGHTMARES — ROLES MODULE =====

const ROLES = {
  // ── Basic Roles ──────────────────────────────────────────────────────────
  mafia: {
    id: 'mafia',
    arabicName: 'مافيا',
    team: 'mafia',
    type: 'basic',
    image: 'assets/cards/basic/mafia_new.png',
    description: 'أنت من المافيا. اقتل لاعباً كل ليلة مع فريقك.',
    color: '#ef4444',
    abilities: ['kill'],
    nightAction: true,
  },
  doctor: {
    id: 'doctor',
    arabicName: 'طبيب',
    team: 'citizens',
    type: 'basic',
    image: 'assets/cards/basic/doctor_new.png',
    description: 'أنت الطبيب. احمِ لاعباً كل ليلة من الموت.',
    color: '#22c55e',
    abilities: ['protect'],
    nightAction: true,
  },
  detective: {
    id: 'detective',
    arabicName: 'محقق',
    team: 'citizens',
    type: 'basic',
    image: 'assets/cards/basic/detective_new.png',
    description: 'أنت المحقق. تحقق من هوية لاعب كل ليلة.',
    color: '#3b82f6',
    abilities: ['investigate'],
    nightAction: true,
  },
  citizen: {
    id: 'citizen',
    arabicName: 'مواطن',
    team: 'citizens',
    type: 'basic',
    image: 'assets/cards/basic/citizen_new.png',
    description: 'أنت مواطن عادي. استخدم صوتك في التصويت بذكاء.',
    color: '#94a3b8',
    abilities: [],
    nightAction: false,
  },

  // ── Special Roles ─────────────────────────────────────────────────────────
  cursed: {
    id: 'cursed',
    arabicName: 'الملعون',
    team: 'mafia',
    type: 'special',
    image: 'assets/cards/special/01_cursed.png',
    description: 'مرة واحدة خلال النهار أو التصويت: خمّن دور لاعب حي. إن أصبت — يموت. إن أخطأت — أنت تموت.',
    color: '#a855f7',
    abilities: ['curse'],
    nightAction: false,
    once: true,
    conflicts: ['founder'],
  },
  immune_citizen: {
    id: 'immune_citizen',
    arabicName: 'المواطن المحصن',
    team: 'citizens',
    type: 'special',
    image: 'assets/cards/special/02_immune_citizen.png',
    description: 'تنجو تلقائياً من أول ضربة ليلية فقط. لا تحميك من التصويت.',
    color: '#06b6d4',
    abilities: ['immune'],
    nightAction: false,
    once: true,
    passive: true,
  },
  liar: {
    id: 'liar',
    arabicName: 'الكذاب',
    team: 'citizens',
    type: 'special',
    image: 'assets/cards/special/liar_fake_citizen.png',
    description: 'دورك مزيف. أنت في الأصل مواطن عادي، لكن الهامسة إذا كشفتك ترى كذبتك، بينما المحقق إذا حقق معك يظهر له أنك مواطن.',
    color: '#c084fc',
    abilities: [],
    nightAction: false,
    passive: true,
  },
  whisper: {
    id: 'whisper',
    arabicName: 'الهمسة',
    team: 'mafia',
    type: 'special',
    image: 'assets/cards/special/03_whisper.png',
    description: 'مرة واحدة في الليل: تكشف بطاقة لاعب لنفسك فقط لمدة قصيرة.',
    color: '#818cf8',
    abilities: ['whisper_reveal'],
    nightAction: true,
    once: true,
  },
  founder: {
    id: 'founder',
    arabicName: 'المؤسس',
    team: 'mafia',
    type: 'special',
    image: 'assets/cards/special/04_founder.png',
    description: 'مرة واحدة خلال التصويت: جمّد أصوات الجميع وصوّت منفردًا.',
    color: '#f59e0b',
    abilities: ['freeze_votes'],
    nightAction: false,
    once: true,
    conflicts: ['cursed'],
  },
  eclipse: {
    id: 'eclipse',
    arabicName: 'ضحية أم بطل؟',
    team: 'neutral',
    type: 'special',
    image: 'assets/cards/special/05_eclipse.png',
    description: 'هدفك: أن يتم إعدامك بالتصويت. إن حدث ذلك تفوز منفردًا.',
    color: '#e879f9',
    abilities: [],
    nightAction: false,
    soloWin: true,
  },
  hopebreaker: {
    id: 'hopebreaker',
    arabicName: 'محطم الآمال',
    team: 'citizens',
    type: 'special',
    image: 'assets/cards/special/06_hopebreaker.png',
    description: 'مرة واحدة اختيارية: اختر لاعباً. إن كان مافيا — يُكشف علناً ويموت فوراً وتنجو أنت. إن أخطأت تموت وحدك.',
    color: '#f97316',
    abilities: ['expose'],
    nightAction: false,
    once: true,
  },
  phoenix: {
    id: 'phoenix',
    arabicName: 'العنقاء',
    team: 'neutral',
    type: 'special',
    image: 'assets/cards/special/07_phoenix.png',
    description: 'ترى دور كل لاعب يموت. مرة واحدة: أحيِ لاعباً ميتاً وانضم لفريقه.',
    color: '#f59e0b',
    abilities: ['revive'],
    nightAction: false,
    once: true,
    seesDead: true,
  },
};

const LIAR_FAKE_ROLES = ['citizen', 'doctor', 'detective'];
const LIAR_FAKE_ROLE_IMAGES = {
  citizen: 'assets/cards/special/liar_fake_citizen.png',
  doctor: 'assets/cards/special/liar_fake_doctor.png',
  detective: 'assets/cards/special/liar_fake_detective.png',
};

function getDeterministicLiarFakeRole(playerId = '') {
  const text = String(playerId || 'liar');
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return LIAR_FAKE_ROLES[hash % LIAR_FAKE_ROLES.length];
}

function normalizeLiarFakeRole(fakeRole, playerId = '') {
  return LIAR_FAKE_ROLES.includes(fakeRole) ? fakeRole : getDeterministicLiarFakeRole(playerId);
}

function getLiarCardImage(fakeRole, playerId = '') {
  return LIAR_FAKE_ROLE_IMAGES[normalizeLiarFakeRole(fakeRole, playerId)] || LIAR_FAKE_ROLE_IMAGES.citizen;
}

// ── Role Distribution Logic ──────────────────────────────────────────────────
const RoleEngine = {
  getMafiaCount(playerCount) {
    if (playerCount <= 5) return 1;
    if (playerCount <= 8) return 2;
    return 3;
  },

  distribute(playerIds, enabledSpecialRoles = []) {
    return this.buildDistribution(playerIds, enabledSpecialRoles).assignment;
  },

  buildDistribution(playerIds, enabledSpecialRoles = []) {
    const count = playerIds.length;
    const mafiaCount = this.getMafiaCount(count);
    const citizenCount = count - mafiaCount;
    const warnings = [];
    const selectedSpecialRoles = [];

    let requested = [...new Set(enabledSpecialRoles)]
      .filter(id => ROLES[id]?.type === 'special');

    if (requested.includes('cursed') && requested.includes('founder')) {
      requested = requested.filter(id => id !== 'founder');
      warnings.push('لا يمكن جمع الملعون والمؤسس — تم تفضيل الملعون وتعطيل المؤسس.');
    }

    const mafiaSpecials = requested.filter(id => ROLES[id].team === 'mafia');
    const citizenSpecials = requested.filter(id => ROLES[id].team === 'citizens');
    const neutralSpecials = requested.filter(id => ROLES[id].team === 'neutral');

    const mafiaPool = [];
    for (const sid of mafiaSpecials) {
      if (mafiaPool.length >= mafiaCount) {
        warnings.push(`لا توجد خانة مافيا كافية لإضافة ${this.getRoleArabicName(sid)}.`);
        continue;
      }
      mafiaPool.push(sid);
      selectedSpecialRoles.push(sid);
    }
    while (mafiaPool.length < mafiaCount) mafiaPool.push('mafia');

    const citizenPool = ['doctor', 'detective'];
    let citizenSlotsLeft = citizenCount - citizenPool.length;

    for (const sid of citizenSpecials) {
      if (citizenSlotsLeft <= 0) {
        warnings.push(`لا توجد خانة مواطن كافية لإضافة ${this.getRoleArabicName(sid)}.`);
        continue;
      }
      citizenPool.push(sid);
      selectedSpecialRoles.push(sid);
      citizenSlotsLeft--;
    }

    let neutralCount = 0;
    const minCitizenTeam = mafiaCount + 1;
    for (const sid of neutralSpecials) {
      const citizensAfterNeutral = citizenCount - (neutralCount + 1);
      if (citizenSlotsLeft <= 0 || citizensAfterNeutral < minCitizenTeam) {
        warnings.push(`تم تخطي ${this.getRoleArabicName(sid)} للحفاظ على توازن اللعبة.`);
        continue;
      }
      citizenPool.push(sid);
      selectedSpecialRoles.push(sid);
      neutralCount++;
      citizenSlotsLeft--;
    }

    while (citizenSlotsLeft-- > 0) citizenPool.push('citizen');

    // Combine and shuffle
    const allRoles = [...mafiaPool, ...citizenPool];
    for (let i = allRoles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allRoles[i], allRoles[j]] = [allRoles[j], allRoles[i]];
    }

    // Assign
    const assignment = {};
    playerIds.forEach((pid, idx) => {
      assignment[pid] = allRoles[idx] || 'citizen';
    });

    return { assignment, roles: allRoles, warnings, selectedSpecialRoles };
  },

  filterConflicts(specialIds) {
    let result = [...new Set(specialIds)].filter(id => ROLES[id]);
    if (result.includes('cursed') && result.includes('founder')) {
      result = result.filter(id => id !== 'founder');
    }
    return result;
  },

  sanitizeSpecialRoles(specialIds) {
    const warnings = [];
    let roles = [...new Set(specialIds)].filter(id => ROLES[id]?.type === 'special');
    if (roles.includes('cursed') && roles.includes('founder')) {
      roles = roles.filter(id => id !== 'founder');
      warnings.push('لا يمكن جمع الملعون والمؤسس — تم تفضيل الملعون وتعطيل المؤسس.');
    }
    return { roles, warnings };
  },

  getRole(id) { return ROLES[id] || ROLES.citizen; },

  getTeam(id) { return (ROLES[id] || ROLES.citizen).team; },

  getPlayerTeam(player) {
    if (!player) return 'citizens';
    return player.team || this.getTeam(player.role);
  },

  isMafia(id) { return this.getTeam(id) === 'mafia'; },

  isPlayerMafia(player) { return this.getPlayerTeam(player) === 'mafia'; },

  getRoleImage(id) {
    return (ROLES[id] || ROLES.citizen).image;
  },

  getRoleArabicName(id) {
    return (ROLES[id] || ROLES.citizen).arabicName;
  },

  getRoleColor(id) {
    return (ROLES[id] || ROLES.citizen).color || '#94a3b8';
  },

  // Check win conditions
  checkWin(players) {
    const alive = Object.values(players).filter(p => {
      const active = typeof isPlayerActive === 'function'
        ? isPlayerActive(p)
        : p.status !== 'kicked' && p.status !== 'left';
      return p.alive && active;
    });
    const aliveMafia = alive.filter(p => this.isPlayerMafia(p));
    const aliveNonMafia = alive.filter(p => !this.isPlayerMafia(p));

    if (aliveMafia.length === 0) return 'citizens';
    if (aliveMafia.length >= aliveNonMafia.length) return 'mafia';
    return null;
  },
};
