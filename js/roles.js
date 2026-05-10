// ===== NIGHTMARES — ROLES MODULE =====

const ROLES = {
  // ── Basic Roles ──────────────────────────────────────────────────────────
  mafia: {
    id: 'mafia',
    arabicName: 'مافيا',
    team: 'mafia',
    type: 'basic',
    image: 'assets/cards/basic/basic_card_1.jpg',
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
    image: 'assets/cards/basic/basic_card_2.jpg',
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
    image: 'assets/cards/basic/basic_card_3.jpg',
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
    image: 'assets/cards/basic/basic_card_4.jpg',
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
  whisper: {
    id: 'whisper',
    arabicName: 'الهمسة',
    team: 'mafia',
    type: 'special',
    image: 'assets/cards/special/03_whisper.png',
    description: 'مرة واحدة في الليل: اكشف دور لاعب لجميع اللاعبين لمدة 10 ثوانٍ.',
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
    description: 'هدفك: أن يتم تعدامك بالتصويت. إن حدث ذلك تفوز منفردًا.',
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
    description: 'مرة واحدة: اختر لاعباً. إن كان مافيا — يُكشف ويُعدم علنياً وأنت تموت.',
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

// ── Role Distribution Logic ──────────────────────────────────────────────────
const RoleEngine = {
  getMafiaCount(playerCount) {
    if (playerCount <= 5) return 1;
    if (playerCount <= 8) return 2;
    return 3;
  },

  distribute(playerIds, enabledSpecialRoles = []) {
    const count = playerIds.length;
    const mafiaCount = this.getMafiaCount(count);
    const citizenCount = count - mafiaCount;

    // Validate special roles
    const validSpecials = this.filterConflicts(enabledSpecialRoles);

    // Separate specials by team
    const mafiaSpecials  = validSpecials.filter(id => ROLES[id] && ROLES[id].team === 'mafia');
    const citizenSpecials = validSpecials.filter(id => ROLES[id] && (ROLES[id].team === 'citizens' || ROLES[id].team === 'neutral'));

    // Build mafia pool
    const mafiaPool = [];
    let mafiaLeft = mafiaCount;
    for (const sid of mafiaSpecials) {
      if (mafiaLeft <= 0) break;
      mafiaPool.push(sid);
      mafiaLeft--;
    }
    while (mafiaLeft-- > 0) mafiaPool.push('mafia');

    // Build citizen pool
    const citizenPool = [];
    let civLeft = citizenCount;

    // Always doctor + detective if room
    let hasDoctorOrDet = false;
    for (const sid of citizenSpecials) {
      if (civLeft <= 0) break;
      citizenPool.push(sid);
      civLeft--;
    }

    if (civLeft > 0) {
      citizenPool.push('doctor');
      civLeft--;
      hasDoctorOrDet = true;
    }
    if (civLeft > 0) {
      citizenPool.push('detective');
      civLeft--;
    }
    while (civLeft-- > 0) citizenPool.push('citizen');

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

    return assignment;
  },

  filterConflicts(specialIds) {
    const result = [];
    for (const id of specialIds) {
      const role = ROLES[id];
      if (!role) continue;
      const hasConflict = (role.conflicts || []).some(c => result.includes(c));
      if (!hasConflict) result.push(id);
    }
    return result;
  },

  getRole(id) { return ROLES[id] || ROLES.citizen; },

  getTeam(id) { return (ROLES[id] || ROLES.citizen).team; },

  isMafia(id) { return this.getTeam(id) === 'mafia'; },

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
    const alive = Object.values(players).filter(p => p.alive);
    const aliveMafia = alive.filter(p => this.isMafia(p.role));
    const aliveNonMafia = alive.filter(p => !this.isMafia(p.role));

    if (aliveMafia.length === 0) return 'citizens';
    if (aliveMafia.length >= aliveNonMafia.length) return 'mafia';
    return null;
  },
};
