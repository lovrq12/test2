(function () {
  window.MB = window.MB || {};

  const Utils = window.MB.Utils;
  const C = window.MB.Constants;

  function nextPowerOfTwo(value) {
    let size = 2;
    while (size < value) size *= 2;
    return Math.min(size, C.MAX_PLAYERS);
  }

  function roundName(roundIndex, totalRounds) {
    const fromEnd = totalRounds - roundIndex;
    if (fromEnd === 1) return "النهائي";
    if (fromEnd === 2) return "نصف النهائي";
    if (fromEnd === 3) return "ربع النهائي";
    if (fromEnd === 4) return "دور الـ16";
    return "دور " + roundIndex;
  }

  function createMatch(roundIndex, matchIndex, totalRounds, playerA, playerB) {
    const id = "match_r" + roundIndex + "_m" + matchIndex;
    const match = {
      id,
      roundIndex,
      matchIndex,
      name: roundName(roundIndex, totalRounds),
      playerA: playerA ? playerA.id : null,
      playerB: playerB ? playerB.id : null,
      winnerId: null,
      status: C.MATCH_STATUS.WAITING,
      score: { playerA: 0, playerB: 0 },
      currentRoundId: null,
      sourceA: null,
      sourceB: null
    };

    if (match.playerA && !match.playerB) {
      match.winnerId = match.playerA;
      match.status = C.MATCH_STATUS.FINISHED;
    } else if (!match.playerA && match.playerB) {
      match.winnerId = match.playerB;
      match.status = C.MATCH_STATUS.FINISHED;
    } else if (!match.playerA && !match.playerB) {
      match.status = C.MATCH_STATUS.FINISHED;
    }

    return match;
  }

  function create(players) {
    const activePlayers = Utils.shuffle(players).slice(0, C.MAX_PLAYERS);
    const bracketSize = nextPowerOfTwo(activePlayers.length);
    const totalRounds = Math.log2(bracketSize);
    const slots = activePlayers.concat(new Array(bracketSize - activePlayers.length).fill(null));
    const shuffledSlots = Utils.shuffle(slots);
    const rounds = [];
    const matches = {};

    for (let roundIndex = 1; roundIndex <= totalRounds; roundIndex += 1) {
      const matchCount = bracketSize / Math.pow(2, roundIndex);
      const round = {
        id: "round_" + roundIndex,
        index: roundIndex,
        name: roundName(roundIndex, totalRounds),
        matchIds: []
      };

      for (let matchIndex = 1; matchIndex <= matchCount; matchIndex += 1) {
        let match;
        if (roundIndex === 1) {
          const playerA = shuffledSlots[(matchIndex - 1) * 2];
          const playerB = shuffledSlots[(matchIndex - 1) * 2 + 1];
          match = createMatch(roundIndex, matchIndex, totalRounds, playerA, playerB);
        } else {
          match = createMatch(roundIndex, matchIndex, totalRounds, null, null);
          match.status = C.MATCH_STATUS.WAITING;
          match.sourceA = "match_r" + (roundIndex - 1) + "_m" + ((matchIndex - 1) * 2 + 1);
          match.sourceB = "match_r" + (roundIndex - 1) + "_m" + ((matchIndex - 1) * 2 + 2);
        }
        round.matchIds.push(match.id);
        matches[match.id] = match;
      }

      rounds.push(round);
    }

    normalizeAutoAdvances(matches, rounds);
    const currentMatchId = getNextPlayableMatchId(matches, rounds);
    if (currentMatchId) {
      matches[currentMatchId].status = C.MATCH_STATUS.PLAYING;
    }

    return {
      tournament: {
        players: activePlayers.map(function (player) { return player.id; }),
        rounds,
        currentMatchId,
        championId: null,
        startedAt: Date.now()
      },
      matches
    };
  }

  function isSlotResolved(match, slot, matches) {
    const source = slot === "A" ? match.sourceA : match.sourceB;
    return !source || (matches[source] && matches[source].status === C.MATCH_STATUS.FINISHED);
  }

  function applyWinnerToNext(match, matches) {
    if (!match || !match.winnerId) return false;
    const nextRoundIndex = match.roundIndex + 1;
    const nextMatchIndex = Math.ceil(match.matchIndex / 2);
    const nextId = "match_r" + nextRoundIndex + "_m" + nextMatchIndex;
    const next = matches[nextId];
    if (!next) return false;
    const slot = match.matchIndex % 2 === 1 ? "playerA" : "playerB";
    if (next[slot] === match.winnerId) return false;
    next[slot] = match.winnerId;
    return true;
  }

  function normalizeAutoAdvances(matches, rounds) {
    let changed = true;
    while (changed) {
      changed = false;
      rounds.forEach(function (round) {
        round.matchIds.forEach(function (matchId) {
          const match = matches[matchId];
          if (!match || match.status !== C.MATCH_STATUS.FINISHED) return;
          if (applyWinnerToNext(match, matches)) changed = true;
        });
      });

      rounds.forEach(function (round) {
        round.matchIds.forEach(function (matchId) {
          const match = matches[matchId];
          if (!match || match.winnerId || match.status === C.MATCH_STATUS.PLAYING || match.status === C.MATCH_STATUS.FINISHED) return;
          const resolvedA = isSlotResolved(match, "A", matches);
          const resolvedB = isSlotResolved(match, "B", matches);
          if (!resolvedA || !resolvedB) return;
          if (match.playerA && !match.playerB) {
            match.winnerId = match.playerA;
            match.status = C.MATCH_STATUS.FINISHED;
            changed = true;
          } else if (!match.playerA && match.playerB) {
            match.winnerId = match.playerB;
            match.status = C.MATCH_STATUS.FINISHED;
            changed = true;
          } else if (!match.playerA && !match.playerB) {
            match.status = C.MATCH_STATUS.FINISHED;
            changed = true;
          }
        });
      });
    }
  }

  function getNextPlayableMatchId(matches, rounds) {
    for (let i = 0; i < rounds.length; i += 1) {
      const round = rounds[i];
      for (let j = 0; j < round.matchIds.length; j += 1) {
        const match = matches[round.matchIds[j]];
        if (match && match.status === C.MATCH_STATUS.WAITING && match.playerA && match.playerB) {
          return match.id;
        }
      }
    }
    return null;
  }

  function advanceWinner(room, matchId, winnerId) {
    const rounds = room.tournament.rounds || [];
    const matches = JSON.parse(JSON.stringify(room.matches || {}));
    const match = matches[matchId];
    if (!match || match.status === C.MATCH_STATUS.FINISHED) {
      return null;
    }

    match.winnerId = winnerId;
    match.status = C.MATCH_STATUS.FINISHED;
    match.currentRoundId = match.currentRoundId || null;
    normalizeAutoAdvances(matches, rounds);

    const nextMatchId = getNextPlayableMatchId(matches, rounds);
    Object.keys(matches).forEach(function (id) {
      if (matches[id].status === C.MATCH_STATUS.PLAYING) {
        matches[id].status = C.MATCH_STATUS.WAITING;
      }
    });

    const tournament = Object.assign({}, room.tournament);
    tournament.currentMatchId = nextMatchId || null;

    if (nextMatchId) {
      matches[nextMatchId].status = C.MATCH_STATUS.PLAYING;
    } else {
      tournament.championId = winnerId;
    }

    return { tournament, matches };
  }

  function render(container, room) {
    if (!container) return;
    const tournament = room && room.tournament;
    const rounds = tournament && tournament.rounds ? tournament.rounds : [];
    const matches = room && room.matches ? room.matches : {};
    const players = room && room.players ? room.players : {};

    if (!rounds.length) {
      container.innerHTML = '<div class="empty-state">لم تبدأ البطولة بعد</div>';
      return;
    }

    container.innerHTML = rounds.map(function (round) {
      const matchesHtml = round.matchIds.map(function (matchId) {
        const match = matches[matchId] || {};
        const active = tournament.currentMatchId === matchId ? " is-active" : "";
        const nameA = match.playerA && players[match.playerA] ? players[match.playerA].name : "انتظار";
        const nameB = match.playerB && players[match.playerB] ? players[match.playerB].name : "انتظار";
        const winA = match.winnerId === match.playerA ? " is-winner" : "";
        const winB = match.winnerId === match.playerB ? " is-winner" : "";
        return [
          '<article class="bracket-match' + active + '">',
          '<div class="bracket-slot' + winA + '"><span>' + Utils.escapeHtml(nameA) + '</span><small>' + (match.score ? match.score.playerA || 0 : 0) + '</small></div>',
          '<div class="bracket-slot' + winB + '"><span>' + Utils.escapeHtml(nameB) + '</span><small>' + (match.score ? match.score.playerB || 0 : 0) + '</small></div>',
          '</article>'
        ].join("");
      }).join("");
      return '<section class="bracket-round"><h3>' + Utils.escapeHtml(round.name) + '</h3>' + matchesHtml + '</section>';
    }).join("");
  }

  window.MB.Tournament = {
    create,
    advanceWinner,
    render,
    getNextPlayableMatchId,
    normalizeAutoAdvances
  };
})();
