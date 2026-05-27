const DetectiveLobby = (() => {
  const ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const ROOM_CODE_PREFIX = "D";
  const ROOM_CODE_LENGTH = 5;
  const LEGACY_ROOM_CODE_LENGTH = 4;
  const MIN_NAME_LENGTH = 2;

  const state = {
    playerId: "",
    roomCode: "",
    playerName: "",
    isHost: false,
    stopWatchingRoom: null,
    stopWatchingPrivate: null,
    disconnectStatus: "",
    closeCleanupSent: false,
    publicData: null,
    privateData: null
  };

  function init({ playerId, retryConnection }) {
    state.playerId = playerId;

    DetectiveUI.bindLobbyActions({
      showCreate,
      showJoin,
      showScreen,
      createRoom: handleCreateRoom,
      joinRoom: handleJoinRoom,
      updateSettings: handleSettingsChange,
      startGame: handleStartGame,
      forceStartGame: () => handleStartGame({ force: true }),
      restartRoom: handleRestartRoom,
      transferHost: handleTransferHost,
      kickPlayer: handleKickPlayer,
      continueToChoosing: handleContinueToChoosing,
      submitKillerTools: handleSubmitKillerTools,
      submitForensicCase: handleSubmitForensicCase,
      submitForensicHint: handleSubmitForensicHint,
      sendDiscussion: handleSendDiscussionMessage,
      deleteDiscussion: handleDeleteDiscussionMessage,
      advanceAccusation: handleAdvanceAccusation,
      submitAccusation: handleSubmitAccusation,
      leaveRoom: handleLeaveRoom,
      retryConnection
    });

    attachLifecycleCleanup();
    DetectiveUI.showScreen("home");
    applyPortalIntent();
    restoreSession().catch(() => {});
  }

  function showScreen(screenName) {
    DetectiveUI.showScreen(screenName);
    DetectiveUI.setHomeMessage("");
  }

  async function restoreSession() {
    const savedSession = readSession();

    if (!savedSession?.roomCode || !savedSession?.playerName) {
      return;
    }

    const publicData = await DetectiveFirebase.readRoomPublic(savedSession.roomCode);

    if (!publicData) {
      clearSession();
      return;
    }

    if (publicData.status === "lobby" && !publicData.playerNames?.[state.playerId]) {
      await DetectiveFirebase.addPlayerToRoom({
        roomCode: savedSession.roomCode,
        playerId: state.playerId,
        playerName: savedSession.playerName,
        playerProfile: savedSession.profile || {}
      });
    } else if (publicData.status !== "lobby") {
      await DetectiveFirebase.markPlayerConnected({
        roomCode: savedSession.roomCode,
        playerId: state.playerId,
        playerName: savedSession.playerName,
        playerProfile: savedSession.profile || {},
        status: publicData.status
      });
    }

    if (publicData.status === "lobby" && savedSession.wasHost) {
      await DetectiveFirebase.transferHost({
        roomCode: savedSession.roomCode,
        nextHostId: state.playerId
      });
    }

    enterRoom({
      roomCode: savedSession.roomCode,
      playerName: savedSession.playerName,
      profile: savedSession.profile || {},
      publicData
    });
    DetectiveUI.setHomeMessage("تم استرجاع جلستك في هذه النافذة.", "success");
  }

  function showCreate() {
    DetectiveUI.setCreateDefaults("");
    DetectiveUI.showScreen("create");
  }

  function showJoin(roomCode = "") {
    DetectiveUI.setJoinDefaults("", roomCode);
    DetectiveUI.showScreen("join");
  }

  function applyPortalIntent() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");

    if (mode === "create") {
      showCreate();
    } else if (mode === "join") {
      showJoin(params.get("code") || "");
    }
  }

  async function handleCreateRoom({ playerName, profile, settings }) {
    const validationMessage = validatePlayerName(playerName);

    if (validationMessage) {
      DetectiveUI.setCreateMessage(validationMessage, "error");
      return;
    }

    DetectiveUI.setBusy("create", true);
    DetectiveUI.setCreateMessage("جاري إنشاء الغرفة...");

    try {
      const roomCode = await generateUniqueRoomCode();
      await DetectiveFirebase.createRoom({
        roomCode,
        hostId: state.playerId,
        hostName: playerName,
        hostProfile: profile,
        settings
      });

      enterRoom({ roomCode, playerName, profile });
    } catch (error) {
      DetectiveUI.setCreateMessage(error.message || "فشل إنشاء الغرفة.", "error");
    } finally {
      DetectiveUI.setBusy("create", false);
    }
  }

  async function handleJoinRoom({ roomCode, playerName, profile }) {
    const cleanRoomCode = normalizeRoomCode(roomCode);
    const nameMessage = validatePlayerName(playerName);
    const codeMessage = validateRoomCode(cleanRoomCode);

    if (codeMessage || nameMessage) {
      DetectiveUI.setJoinMessage(codeMessage || nameMessage, "error");
      return;
    }

    DetectiveUI.setBusy("join", true);
    DetectiveUI.setJoinMessage("جاري دخول اللوبي...");

    try {
      const publicData = await DetectiveFirebase.readRoomPublic(cleanRoomCode);

      if (!publicData) {
        throw new Error("لم يتم العثور على غرفة بهذا الكود.");
      }

      if (publicData.status !== "lobby") {
        throw new Error("هذه الغرفة بدأت بالفعل.");
      }

      await DetectiveFirebase.addPlayerToRoom({
        roomCode: cleanRoomCode,
        playerId: state.playerId,
        playerName,
        playerProfile: profile
      });

      enterRoom({ roomCode: cleanRoomCode, playerName, profile, publicData });
    } catch (error) {
      DetectiveUI.setJoinMessage(error.message || "فشل الانضمام للغرفة.", "error");
    } finally {
      DetectiveUI.setBusy("join", false);
    }
  }

  async function handleSettingsChange(settings) {
    if (!state.isHost || !state.roomCode) {
      return;
    }

    try {
      await DetectiveFirebase.updateRoomSettings(state.roomCode, settings);
    } catch (error) {
      DetectiveUI.setLobbyMessage(error.message || "تعذر تحديث الإعدادات.", "error");
    }
  }

  async function handleRestartRoom() {
    if (!state.isHost || !state.roomCode) {
      return;
    }

    DetectiveUI.setBusy("restartRoom", true);

    try {
      await DetectiveFirebase.resetRoomForNewRound({
        roomCode: state.roomCode,
        settings: state.publicData?.settings || DetectiveFirebase.defaultRoomSettings
      });
      DetectiveUI.setLobbyMessage("تمت إعادة ضبط الغرفة لجولة جديدة.", "success");
    } catch (error) {
      DetectiveUI.setLobbyMessage(error.message || "تعذرت إعادة ضبط الغرفة.", "error");
    } finally {
      DetectiveUI.setBusy("restartRoom", false);
    }
  }

  async function handleTransferHost({ playerId }) {
    if (!state.isHost || !state.roomCode || !playerId) {
      return;
    }

    try {
      await DetectiveFirebase.transferHost({
        roomCode: state.roomCode,
        nextHostId: playerId
      });
    } catch (error) {
      DetectiveUI.setLobbyMessage(error.message || "تعذر نقل الهوست.", "error");
    }
  }

  async function handleKickPlayer({ playerId }) {
    if (!state.isHost || !state.roomCode || !playerId || playerId === state.playerId) {
      return;
    }

    try {
      await DetectiveFirebase.kickPlayer({
        roomCode: state.roomCode,
        playerId
      });
      DetectiveUI.setLobbyMessage("تم إخراج اللاعب من اللوبي.", "success");
    } catch (error) {
      DetectiveUI.setLobbyMessage(error.message || "تعذر إخراج اللاعب.", "error");
    }
  }

  async function handleStartGame(options = {}) {
    if (!state.isHost || !state.roomCode) {
      return;
    }

    const isForced = options.force === true;
    DetectiveUI.setBusy(isForced ? "forceStart" : "start", true);

    try {
      const playerIds = Object.keys(state.publicData?.playerNames || {});
      const settings = {
        ...DetectiveFirebase.defaultRoomSettings,
        ...(state.publicData?.settings || {})
      };

      if ((state.publicData?.status || "lobby") !== "lobby") {
        throw new Error("تم بدء الجولة بالفعل.");
      }

      if (!isForced && playerIds.length < settings.requiredPlayerCount) {
        throw new Error(`عدد اللاعبين يجب أن يكون ${settings.requiredPlayerCount} على الأقل قبل البدء.`);
      }

      const minimumPlayers = DetectiveRoles.getMinimumPlayers(settings);

      if (playerIds.length < minimumPlayers) {
        throw new Error(`تحتاج إلى ${minimumPlayers} لاعبين على الأقل لهذه الأدوار.`);
      }

      const distribution = DetectiveRoles.createDistribution(playerIds, settings);
      await DetectiveFirebase.writeRoleDistribution({
        roomCode: state.roomCode,
        playerTools: distribution.playerTools,
        privateRoles: distribution.privateRoles
      });
    } catch (error) {
      DetectiveUI.setLobbyMessage(error.message || "تعذر توزيع الأدوار.", "error");
    } finally {
      DetectiveUI.setBusy(isForced ? "forceStart" : "start", false);
    }
  }

  async function handleContinueToChoosing() {
    if (!state.isHost || !state.roomCode) {
      return;
    }

    DetectiveUI.setBusy("continueChoosing", true);

    try {
      if (state.publicData?.status !== "roles") {
        throw new Error("لا يمكن بدء اختيار الأدوات إلا بعد توزيع الأدوار.");
      }

      const privateRoles = await DetectiveFirebase.readRoomPrivate(state.roomCode);
      const phase = DetectiveGame.createKillerToolPhase({ privateRoles });

      await DetectiveFirebase.writeKillerToolPhase({
        roomCode: state.roomCode,
        publicUpdates: phase.publicUpdates,
        privateUpdates: phase.privateUpdates
      });
    } catch (error) {
      DetectiveUI.setRolesMessage(error.message || "تعذر بدء اختيار الأدوات.", "error");
    } finally {
      DetectiveUI.setBusy("continueChoosing", false);
    }
  }

  async function handleSubmitKillerTools(input) {
    if (!state.roomCode || state.privateData?.role !== "killer") {
      return;
    }

    DetectiveUI.setBusy("submitMurder", true);

    try {
      if (state.publicData?.status !== DetectiveGame.killerToolsStatus) {
        throw new Error("اختيار الأدوات غير متاح الآن.");
      }

      const privateRoles = await DetectiveFirebase.readRoomPrivate(state.roomCode);
      const result = DetectiveGame.submitKillerTools({
        privateRoles,
        playerTools: state.publicData.playerTools || {},
        playerNames: state.publicData.playerNames || {},
        killerId: state.playerId,
        selectedToolIds: input.selectedToolIds
      });

      await DetectiveFirebase.writeKillerToolSelection({
        roomCode: state.roomCode,
        publicUpdates: result.publicUpdates,
        privateUpdates: result.privateUpdates
      });
    } catch (error) {
      DetectiveUI.setMurderMessage(error.message || "تعذر إرسال الأدوات.", "error");
    } finally {
      DetectiveUI.setBusy("submitMurder", false);
    }
  }

  async function handleSubmitForensicCase(input) {
    if (!state.roomCode || state.privateData?.role !== "forensic") {
      return;
    }

    DetectiveUI.setBusy("submitForensicCase", true);

    try {
      if (state.publicData?.status !== DetectiveGame.forensicSetupStatus) {
        throw new Error("بناء لوحة التحقيق غير متاح الآن.");
      }

      const result = DetectiveGame.createForensicCase({
        privateData: state.privateData,
        caseInput: input
      });

      await DetectiveFirebase.writeForensicCaseForPlayer({
        roomCode: state.roomCode,
        forensicPlayerId: state.playerId,
        publicUpdates: result.publicUpdates,
        privateUpdates: result.privateUpdates
      });
    } catch (error) {
      DetectiveUI.setInvestigationMessage(error.message || "تعذر بناء القضية.", "error");
    } finally {
      DetectiveUI.setBusy("submitForensicCase", false);
    }
  }

  async function handleSubmitForensicHint(hintInput) {
    if (!state.roomCode || state.privateData?.role !== "forensic") {
      return;
    }

    DetectiveUI.setBusy("sendHint", true);

    try {
      if (state.publicData?.status !== DetectiveGame.investigationStatus) {
        throw new Error("لا يمكن إرسال التلميحات إلا أثناء التحقيق.");
      }

      const releasedHintIds = new Set(
        Object.values(state.publicData?.investigationFeed || {})
          .map(entry => entry?.selectedHintId)
          .filter(Boolean)
      );

      if (
        hintInput.selectedHintId &&
        hintInput.selectedHintId !== "__custom__" &&
        releasedHintIds.has(hintInput.selectedHintId)
      ) {
        throw new Error("تم إرسال هذا التلميح من قبل. اختر تلميحاً آخر أو اكتب ملاحظة يدوية.");
      }

      const hint = DetectiveGame.createForensicHint({
        privateData: state.privateData,
        playerNames: state.publicData.playerNames || {},
        selectedHintId: hintInput.selectedHintId,
        customText: hintInput.customText
      });

      await DetectiveFirebase.sendForensicHint({
        roomCode: state.roomCode,
        hint
      });

      DetectiveUI.clearForensicHintInput();
      DetectiveUI.setInvestigationMessage("تم إرسال التلميح للجميع.", "success");
    } catch (error) {
      DetectiveUI.setInvestigationMessage(error.message || "تعذر إرسال التلميح.", "error");
    } finally {
      DetectiveUI.setBusy("sendHint", false);
    }
  }

  async function handleSendDiscussionMessage(input) {
    if (!state.roomCode) {
      return;
    }

    DetectiveUI.setBusy("sendDiscussion", true);

    try {
      if (![DetectiveGame.investigationStatus, DetectiveGame.accusationStatus].includes(state.publicData?.status)) {
        throw new Error("النقاش المكتوب متاح أثناء التحقيق والاتهام فقط.");
      }

      const message = DetectiveGame.createDiscussionMessage({
        playerId: state.playerId,
        playerName: state.playerName,
        text: input.text
      });

      await DetectiveFirebase.sendDiscussionMessage({
        roomCode: state.roomCode,
        message
      });

      DetectiveUI.clearDiscussionInput();
    } catch (error) {
      DetectiveUI.setInvestigationMessage(error.message || "تعذر إرسال الرسالة.", "error");
    } finally {
      DetectiveUI.setBusy("sendDiscussion", false);
    }
  }

  async function handleDeleteDiscussionMessage({ messageId }) {
    if (!state.isHost || !state.roomCode || !messageId) {
      return;
    }

    try {
      await DetectiveFirebase.deleteDiscussionMessage({
        roomCode: state.roomCode,
        messageId
      });
    } catch (error) {
      DetectiveUI.setInvestigationMessage(error.message || "تعذر حذف الرسالة.", "error");
    }
  }

  async function handleAdvanceAccusation() {
    if (!state.isHost || !state.roomCode) {
      return;
    }

    DetectiveUI.setBusy("advanceAccusation", true);

    try {
      if (state.publicData?.status !== DetectiveGame.investigationStatus) {
        throw new Error("لا يمكن فتح الاتهام إلا بعد بدء التحقيق.");
      }

      await DetectiveFirebase.advanceToAccusation({
        roomCode: state.roomCode
      });
    } catch (error) {
      DetectiveUI.setInvestigationMessage(error.message || "تعذر فتح الاتهام.", "error");
    } finally {
      DetectiveUI.setBusy("advanceAccusation", false);
    }
  }

  async function handleSubmitAccusation({ accusedPlayerId }) {
    if (!state.isHost || !state.roomCode || !accusedPlayerId) {
      return;
    }

    DetectiveUI.setBusy("submitAccusation", true);

    try {
      if (state.publicData?.status !== DetectiveGame.accusationStatus) {
        throw new Error("الاتهام النهائي غير متاح الآن.");
      }

      const privateRoles = await DetectiveFirebase.readRoomPrivate(state.roomCode);
      const forensicId = Object.keys(privateRoles || {}).find(playerId => privateRoles[playerId]?.role === "forensic");
      const endReveal = DetectiveGame.createEndReveal({
        privateRoles,
        playerNames: state.publicData.playerNames || {},
        playerTools: state.publicData.playerTools || {},
        forensicPanel: privateRoles?.[forensicId]?.forensicPanel,
        investigationFeed: state.publicData.investigationFeed || {},
        accusedPlayerId
      });

      await DetectiveFirebase.writeEndReveal({
        roomCode: state.roomCode,
        endReveal
      });
    } catch (error) {
      DetectiveUI.setInvestigationMessage(error.message || "تعذر كشف النهاية.", "error");
    } finally {
      DetectiveUI.setBusy("submitAccusation", false);
    }
  }

  async function handleLeaveRoom() {
    if (!state.roomCode) {
      DetectiveUI.showScreen("home");
      return;
    }

    setLeaveBusy(true);

    try {
      await cleanupCurrentPlayer();
    } catch (error) {
      DetectiveUI.setHomeMessage(error.message || "تعذرت مغادرة الغرفة.", "error");
    } finally {
      stopWatching();
      resetRoomState();
      clearSession();
      setLeaveBusy(false);
      DetectiveUI.showScreen("home");
    }
  }

  function enterRoom({ roomCode, playerName, profile = {}, publicData = null }) {
    stopWatching();

    state.roomCode = roomCode;
    state.playerName = playerName;
    state.publicData = publicData;
    state.privateData = null;
    state.isHost = publicData?.hostId === state.playerId;
    state.closeCleanupSent = false;
    state.disconnectStatus = "";
    writeSession({
      roomCode,
      playerName,
      profile: publicData?.playerProfiles?.[state.playerId] || profile || readSession()?.profile || {},
      wasHost: state.isHost
    });

    DetectiveUI.showScreen("lobby");
    syncDisconnectCleanup(publicData || { status: "lobby" });

    if (publicData) {
      renderCurrentRoom(publicData);
    }

    state.stopWatchingRoom = DetectiveFirebase.watchRoomPublic(
      roomCode,
      nextPublicData => {
        if (!nextPublicData) {
          stopWatching();
          DetectiveFirebase.cancelPlayerDisconnect().catch(() => {});
          resetRoomState();
          clearSession();
          DetectiveUI.showScreen("home");
          DetectiveUI.setHomeMessage("تم حذف الغرفة أو لم تعد متاحة.", "error");
          return;
        }

        if (nextPublicData.status === "lobby" && state.playerName && !nextPublicData.playerNames?.[state.playerId]) {
          stopWatching();
          DetectiveFirebase.cancelPlayerDisconnect().catch(() => {});
          resetRoomState();
          clearSession();
          DetectiveUI.showScreen("home");
          DetectiveUI.setHomeMessage("تم إخراجك من الغرفة.", "error");
          return;
        }

        state.publicData = nextPublicData;
        state.isHost = nextPublicData.hostId === state.playerId;
        writeSession({
          roomCode: state.roomCode,
          playerName: state.playerName,
          profile: nextPublicData.playerProfiles?.[state.playerId] || readSession()?.profile || {},
          wasHost: state.isHost
        });
        syncDisconnectCleanup(nextPublicData);
        renderCurrentRoom(nextPublicData);
      },
      error => {
        DetectiveUI.setLobbyMessage(error.message || "انقطع تحديث الغرفة.", "error");
      }
    );

    state.stopWatchingPrivate = DetectiveFirebase.watchPlayerPrivate(
      roomCode,
      state.playerId,
      nextPrivateData => {
        state.privateData = nextPrivateData;

        if (["roles", DetectiveGame.killerToolsStatus, DetectiveGame.forensicSetupStatus, DetectiveGame.investigationStatus, DetectiveGame.accusationStatus, DetectiveGame.endStatus].includes(state.publicData?.status)) {
          renderCurrentRoom(state.publicData);
        }
      },
      error => {
        const message = error.message || "تعذر تحميل بياناتك الخاصة.";
        if (state.publicData?.status === DetectiveGame.killerToolsStatus) {
          DetectiveUI.setMurderMessage(message, "error");
        } else if ([DetectiveGame.forensicSetupStatus, DetectiveGame.investigationStatus].includes(state.publicData?.status)) {
          DetectiveUI.setInvestigationMessage(message, "error");
        } else {
          DetectiveUI.setRolesMessage(message, "error");
        }
      }
    );
  }

  function renderCurrentRoom(publicData) {
    if ([DetectiveGame.forensicSetupStatus, DetectiveGame.investigationStatus, DetectiveGame.accusationStatus].includes(publicData.status)) {
      DetectiveUI.showScreen("investigation");
      DetectiveUI.renderInvestigation({
        roomCode: state.roomCode,
        publicData,
        privateData: state.privateData,
        playerId: state.playerId,
        isHost: state.isHost
      });
      return;
    }

    if (publicData.status === DetectiveGame.endStatus) {
      DetectiveUI.showScreen("end");
      DetectiveUI.renderEnd({
        roomCode: state.roomCode,
        publicData,
        playerId: state.playerId,
        isHost: state.isHost
      });
      return;
    }

    if (publicData.status === DetectiveGame.killerToolsStatus) {
      DetectiveUI.showScreen("murderSetup");
      DetectiveUI.renderMurderSetup({
        roomCode: state.roomCode,
        publicData,
        privateData: state.privateData,
        playerId: state.playerId
      });
      return;
    }

    if (publicData.status === "roles") {
      DetectiveUI.showScreen("roles");
      DetectiveUI.renderRoles({
        roomCode: state.roomCode,
        publicData,
        privateData: state.privateData,
        playerId: state.playerId,
        isHost: state.isHost
      });
      return;
    }

    DetectiveUI.showScreen("lobby");
    DetectiveUI.renderLobby({
      roomCode: state.roomCode,
      publicData,
      playerId: state.playerId,
      isHost: state.isHost
    });
  }

  function syncDisconnectCleanup(publicData) {
    const status = publicData?.status || "lobby";

    if (!state.roomCode || state.disconnectStatus === status) {
      return;
    }

    state.disconnectStatus = status;
    DetectiveFirebase.registerPlayerDisconnect({
      roomCode: state.roomCode,
      playerId: state.playerId,
      playerName: state.playerName,
      status,
      nextHostId: status === "lobby" && state.isHost ? getNextLobbyHostId(publicData) : undefined
    }).catch(error => {
      const message = error.message || "تعذر تجهيز تنظيف الاتصال.";
      if (status === "lobby") {
        DetectiveUI.setLobbyMessage(message, "error");
      } else if (status === DetectiveGame.killerToolsStatus) {
        DetectiveUI.setMurderMessage(message, "error");
      } else {
        DetectiveUI.setInvestigationMessage(message, "error");
      }
    });
  }

  function stopWatching() {
    if (state.stopWatchingRoom) {
      state.stopWatchingRoom();
      state.stopWatchingRoom = null;
    }

    if (state.stopWatchingPrivate) {
      state.stopWatchingPrivate();
      state.stopWatchingPrivate = null;
    }
  }

  async function cleanupCurrentPlayer() {
    if (!state.roomCode) {
      return;
    }

    await DetectiveFirebase.cleanupPlayerSession({
      roomCode: state.roomCode,
      playerId: state.playerId,
      playerName: state.playerName,
      status: state.publicData?.status || "lobby"
    });
    await DetectiveFirebase.cancelPlayerDisconnect();
  }

  function attachLifecycleCleanup() {
    const handlePageLeaving = () => {
      if (!state.roomCode || state.closeCleanupSent) {
        return;
      }

      const status = state.publicData?.status || "lobby";

      if (status === "lobby") {
        return;
      }

      state.closeCleanupSent = true;
      DetectiveFirebase.sendPlayerCleanup({
        roomCode: state.roomCode,
        playerId: state.playerId,
        playerName: state.playerName,
        status
      });
    };

    window.addEventListener("pagehide", handlePageLeaving);
    window.addEventListener("beforeunload", handlePageLeaving);
  }

  function resetRoomState() {
    state.roomCode = "";
    state.playerName = "";
    state.isHost = false;
    state.publicData = null;
    state.privateData = null;
    state.disconnectStatus = "";
    state.closeCleanupSent = false;
  }

  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem("detectiveRoomSession") || "null");
    } catch (error) {
      return null;
    }
  }

  function writeSession(sessionData) {
    sessionStorage.setItem("detectiveRoomSession", JSON.stringify(sessionData));
  }

  function clearSession() {
    sessionStorage.removeItem("detectiveRoomSession");
  }

  function setLeaveBusy(isBusy) {
    ["leave", "rolesLeave", "murderLeave", "investigationLeave", "endLeave"].forEach(name => {
      DetectiveUI.setBusy(name, isBusy);
    });
  }

  function getNextLobbyHostId(publicData) {
    return Object.keys(publicData?.playerNames || {}).find(playerId => playerId !== state.playerId) || "";
  }

  async function generateUniqueRoomCode() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const roomCode = generateRoomCode();
      const exists = await DetectiveFirebase.roomExists(roomCode);

      if (!exists) {
        return roomCode;
      }
    }

    throw new Error("تعذر توليد كود غرفة فريد. حاول مرة أخرى.");
  }

  function generateRoomCode() {
    let code = ROOM_CODE_PREFIX;

    for (let index = 1; index < ROOM_CODE_LENGTH; index += 1) {
      const randomIndex = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
      code += ROOM_CODE_CHARS[randomIndex];
    }

    return code;
  }

  function normalizeRoomCode(roomCode) {
    return roomCode.trim().toUpperCase().replace(/\s/g, "");
  }

  function validatePlayerName(playerName) {
    if (!playerName || playerName.trim().length < MIN_NAME_LENGTH) {
      return "اكتب اسماً من حرفين على الأقل.";
    }

    return "";
  }

  function validateRoomCode(roomCode) {
    const isLegacyCode = roomCode.length === LEGACY_ROOM_CODE_LENGTH &&
      [...roomCode].every(char => ROOM_CODE_CHARS.includes(char));
    const isNewCode = roomCode.length === ROOM_CODE_LENGTH &&
      roomCode.startsWith(ROOM_CODE_PREFIX) &&
      [...roomCode.slice(1)].every(char => ROOM_CODE_CHARS.includes(char));

    if (!isLegacyCode && !isNewCode) {
      return "كود التحقيق الجديد يبدأ بـ D ويتكون من 5 أحرف. الأكواد القديمة من 4 أحرف ما زالت مدعومة.";
    }
    return "";
  }

  return {
    init,
    generateRoomCode,
    normalizeRoomCode
  };
})();
