// tournament.js — نظام البطولة والبركت

const Tournament = (() => {

  /**
   * توليد bracket لأي عدد من 2 إلى 16 لاعب
   * يعمل بنظام single-elimination مع byes
   */
  function generateBracket(playerIds) {
    const n = playerIds.length;
    if (n < 2 || n > 16) throw new Error('عدد اللاعبين يجب أن يكون بين 2 و16');

    // ترتيب عشوائي
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

    // حساب حجم البركت (أقل قوة لـ2 أكبر من n)
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
    const byes = bracketSize - n;

    // ملء المراحل الأولى
    const seeds = [...shuffled];
    // إضافة bye slots
    for (let i = 0; i < byes; i++) seeds.push(null);

    // بناء الجولة الأولى
    const rounds = [];
    const firstRoundMatches = [];

    for (let i = 0; i < seeds.length; i += 2) {
      const pA = seeds[i];
      const pB = seeds[i + 1];

      const matchId = generateId(12);

      // لو أحدهم bye، الآخر يتأهل تلقائيًا
      const match = {
        id:       matchId,
        playerA:  pA,
        playerB:  pB,
        winnerId: (pB === null) ? pA : (pA === null ? pB : null),
        status:   (pA === null || pB === null) ? 'finished' : 'waiting',
        isBye:    (pA === null || pB === null),
        score:    { playerA: 0, playerB: 0 }
      };
      firstRoundMatches.push(match);
    }

    rounds.push(firstRoundMatches);

    // بناء الجولات التالية (placeholders)
    let prevRound = firstRoundMatches;
    while (prevRound.length > 1) {
      const nextRound = [];
      for (let i = 0; i < prevRound.length; i += 2) {
        const matchId = generateId(12);
        nextRound.push({
          id:      matchId,
          playerA: null,
          playerB: null,
          winnerId: null,
          status:  'waiting',
          isBye:   false,
          score:   { playerA: 0, playerB: 0 },
          fromMatchA: prevRound[i].id,
          fromMatchB: prevRound[i + 1]?.id || null
        });
      }
      rounds.push(nextRound);
      prevRound = nextRound;
    }

    return rounds;
  }

  /**
   * إيجاد المباراة الأولى الجاهزة للعب
   */
  function getNextActiveMatch(rounds) {
    for (const round of rounds) {
      for (const match of round) {
        if (match.status === 'waiting' && match.playerA && match.playerB) {
          return match;
        }
      }
    }
    return null;
  }

  /**
   * تحديث bracket بعد فوز لاعب
   */
  function advanceWinner(rounds, matchId, winnerId) {
    let winnerPlayer = null;

    // تحديث المباراة المنتهية
    for (const round of rounds) {
      for (const match of round) {
        if (match.id === matchId) {
          match.winnerId = winnerId;
          match.status = 'finished';
          winnerPlayer = winnerId;
          break;
        }
      }
    }

    if (!winnerPlayer) return rounds;

    // تمرير الفائز للمباراة التالية
    for (const round of rounds) {
      for (const match of round) {
        if (match.fromMatchA === matchId) {
          match.playerA = winnerId;
        }
        if (match.fromMatchB === matchId) {
          match.playerB = winnerId;
        }
        // إذا اكتمل اللاعبان في مباراة كانت waiting
        if (!match.isBye && match.playerA && match.playerB && match.status === 'waiting') {
          // تبقى waiting — ستُفعَّل بعدها
        }
      }
    }

    return rounds;
  }

  /**
   * التحقق من انتهاء البطولة
   */
  function getChampion(rounds) {
    const finalRound = rounds[rounds.length - 1];
    if (!finalRound || finalRound.length !== 1) return null;
    const finalMatch = finalRound[0];
    return finalMatch.winnerId || null;
  }

  /**
   * حفظ البركت في Firebase
   */
  async function saveBracket(code, rounds, playerIds) {
    const bracketData = {
      players: playerIds,
      rounds:  rounds,
      currentMatchId: null,
      championId: null
    };
    await db.ref(`rooms/${code}/tournament`).set(bracketData);
    return bracketData;
  }

  /**
   * الحصول على البركت من Firebase
   */
  async function getBracket(code) {
    const snap = await db.ref(`rooms/${code}/tournament`).get();
    return snap.val();
  }

  /**
   * تحديث مباراة في Firebase
   */
  async function updateMatch(code, matchId, data) {
    await db.ref(`rooms/${code}/matches/${matchId}`).update(data);
  }

  /**
   * الاستماع للتغييرات في البطولة
   */
  function listenTournament(code, callback) {
    const ref = db.ref(`rooms/${code}/tournament`);
    ref.on('value', snap => callback(snap.val()));
    return ref;
  }

  /**
   * الاستماع لمباراة محددة
   */
  function listenMatch(code, matchId, callback) {
    const ref = db.ref(`rooms/${code}/matches/${matchId}`);
    ref.on('value', snap => callback(snap.val()));
    return ref;
  }

  /**
   * الاستماع للجولة الحالية
   */
  function listenRound(code, roundId, callback) {
    const ref = db.ref(`rooms/${code}/rounds/${roundId}`);
    ref.on('value', snap => callback(snap.val()));
    return ref;
  }

  /**
   * حساب عنوان الجولة في البطولة
   */
  function getRoundLabel(totalRounds, roundIndex) {
    const remaining = totalRounds - roundIndex;
    if (remaining === 1) return 'النهائي';
    if (remaining === 2) return 'نصف النهائي';
    if (remaining === 3) return 'ربع النهائي';
    return `دور الـ${Math.pow(2, remaining)}`;
  }

  return { generateBracket, getNextActiveMatch, advanceWinner, getChampion, saveBracket, getBracket, updateMatch, listenTournament, listenMatch, listenRound, getRoundLabel };
})();
