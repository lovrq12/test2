const DetectiveUI = (() => {
  const elements = {};
  const viewState = {
    playerNames: {},
    playerTools: {},
    playerNotes: {},
    suspectMarkers: {},
    openPlayerDetailId: "",
    playerListContext: null,
    timer: null,
    timerInterval: null
  };

  function init() {
    cacheElements();
    populateProfileSelects();
    bindProfilePreviews();
  }

  function cacheElements() {
    elements.connectionChip = document.getElementById("connection-chip");
    elements.connectionChipText = document.getElementById("connection-chip-text");
    elements.globalTimer = document.getElementById("global-timer");

    elements.screens = {
      home: document.getElementById("screen-home"),
      create: document.getElementById("screen-create"),
      join: document.getElementById("screen-join"),
      lobby: document.getElementById("screen-lobby"),
      roles: document.getElementById("screen-roles"),
      murderSetup: document.getElementById("screen-murder-setup"),
      investigation: document.getElementById("screen-investigation"),
      end: document.getElementById("screen-end")
    };

    elements.showCreateButton = document.getElementById("show-create-button");
    elements.showJoinButton = document.getElementById("show-join-button");
    elements.homeMessage = document.getElementById("home-message");

    elements.createForm = document.getElementById("create-room-form");
    elements.createName = document.getElementById("create-player-name");
    elements.createProfileSelect = document.getElementById("create-profile-select");
    elements.createGlowSelect = document.getElementById("create-glow-select");
    elements.createProfilePreview = document.getElementById("create-profile-preview");
    elements.createRequiredPlayerCount = document.getElementById("create-required-player-count");
    elements.createRoundTimer = document.getElementById("create-round-timer");
    elements.createButton = document.getElementById("create-room-button");
    elements.createMessage = document.getElementById("create-message");

    elements.joinForm = document.getElementById("join-room-form");
    elements.joinRoomCode = document.getElementById("join-room-code");
    elements.joinName = document.getElementById("join-player-name");
    elements.joinProfileSelect = document.getElementById("join-profile-select");
    elements.joinGlowSelect = document.getElementById("join-glow-select");
    elements.joinProfilePreview = document.getElementById("join-profile-preview");
    elements.joinButton = document.getElementById("join-room-button");
    elements.joinMessage = document.getElementById("join-message");

    elements.lobbyRoomCode = document.getElementById("lobby-room-code");
    elements.lobbyRoleBadge = document.getElementById("lobby-role-badge");
    elements.lobbyMessage = document.getElementById("lobby-message");
    elements.playerCount = document.getElementById("player-count");
    elements.playerList = document.getElementById("player-list");
    elements.hostSettingsForm = document.getElementById("host-settings-form");
    elements.lobbyRequiredPlayerCount = document.getElementById("lobby-required-player-count");
    elements.lobbyRoundTimer = document.getElementById("lobby-round-timer");
    elements.lobbyAutoRoles = document.getElementById("lobby-auto-roles");
    elements.lobbyEnableWitness = document.getElementById("lobby-enable-witness");
    elements.lobbyEnableAccomplice = document.getElementById("lobby-enable-accomplice");
    elements.lobbyForensicPlayer = document.getElementById("lobby-forensic-player");
    elements.lobbyManualKiller = document.getElementById("lobby-manual-killer");
    elements.lobbyManualAccomplice = document.getElementById("lobby-manual-accomplice");
    elements.lobbyManualWitness = document.getElementById("lobby-manual-witness");
    elements.hostControlPanel = document.getElementById("host-control-panel");
    elements.transferHostPlayer = document.getElementById("transfer-host-player");
    elements.transferHostButton = document.getElementById("transfer-host-button");
    elements.kickPlayerSelect = document.getElementById("kick-player-select");
    elements.kickPlayerButton = document.getElementById("kick-player-button");
    elements.settingsSummary = document.getElementById("settings-summary");
    elements.startGameButton = document.getElementById("start-game-button");
    elements.forceStartGameButton = document.getElementById("force-start-game-button");
    elements.restartRoomButton = document.getElementById("restart-room-button");
    elements.leaveRoomButton = document.getElementById("leave-room-button");

    elements.rolesRoomCode = document.getElementById("roles-room-code");
    elements.roleRevealCard = document.getElementById("role-reveal-card");
    elements.roleName = document.getElementById("role-name");
    elements.roleDescription = document.getElementById("role-description");
    elements.rolePrivateDetails = document.getElementById("role-private-details");
    elements.ownToolsList = document.getElementById("own-tools-list");
    elements.rolesPlayerCount = document.getElementById("roles-player-count");
    elements.rolesPlayerList = document.getElementById("roles-player-list");
    elements.rolesMessage = document.getElementById("roles-message");
    elements.continueChoosingButton = document.getElementById("continue-choosing-button");
    elements.rolesLeaveRoomButton = document.getElementById("roles-leave-room-button");

    elements.murderRoomCode = document.getElementById("murder-room-code");
    elements.murderStatusBanner = document.getElementById("murder-status-banner");
    elements.murderPrivateCard = document.getElementById("murder-private-card");
    elements.murderPrivateLabel = document.getElementById("murder-private-label");
    elements.murderPrivateTitle = document.getElementById("murder-private-title");
    elements.murderPrivateDescription = document.getElementById("murder-private-description");
    elements.murderPrivateDetails = document.getElementById("murder-private-details");
    elements.murderSetupForm = document.getElementById("murder-setup-form");
    elements.murderToolOptions = document.getElementById("murder-tool-options");
    elements.murderSubmitButton = document.getElementById("murder-submit-button");
    elements.murderWeaponCard = document.getElementById("murder-weapon-card");
    elements.murderPlayerStateCount = document.getElementById("murder-player-state-count");
    elements.murderPlayerStateList = document.getElementById("murder-player-state-list");
    elements.murderMessage = document.getElementById("murder-message");
    elements.murderLeaveRoomButton = document.getElementById("murder-leave-room-button");

    elements.investigationRoomCode = document.getElementById("investigation-room-code");
    elements.investigationStatusBanner = document.getElementById("investigation-status-banner");
    elements.caseFileDetails = document.getElementById("case-file-details");
    elements.investigationFeedCount = document.getElementById("investigation-feed-count");
    elements.investigationFeedList = document.getElementById("investigation-feed-list");
    elements.discussionFeedCount = document.getElementById("discussion-feed-count");
    elements.discussionFeedList = document.getElementById("discussion-feed-list");
    elements.discussionForm = document.getElementById("discussion-form");
    elements.discussionMessageInput = document.getElementById("discussion-message-input");
    elements.sendDiscussionButton = document.getElementById("send-discussion-button");
    elements.investigationPrivateCard = document.getElementById("investigation-private-card");
    elements.investigationPrivateLabel = document.getElementById("investigation-private-label");
    elements.investigationPrivateTitle = document.getElementById("investigation-private-title");
    elements.investigationPrivateDescription = document.getElementById("investigation-private-description");
    elements.investigationPrivateDetails = document.getElementById("investigation-private-details");
    elements.forensicPanelSection = document.getElementById("forensic-panel-section");
    elements.forensicCaseForm = document.getElementById("forensic-case-form");
    elements.forensicChosenTools = document.getElementById("forensic-chosen-tools");
    elements.forensicDeathCause = document.getElementById("forensic-death-cause");
    elements.forensicBodyCondition = document.getElementById("forensic-body-condition");
    elements.forensicEvidence = document.getElementById("forensic-evidence");
    elements.forensicLocation = document.getElementById("forensic-location");
    elements.forensicDetail = document.getElementById("forensic-detail");
    elements.forensicHiddenDetails = document.getElementById("forensic-hidden-details");
    elements.submitForensicCaseButton = document.getElementById("submit-forensic-case-button");
    elements.forensicHintForm = document.getElementById("forensic-hint-form");
    elements.forensicAnalysisDetails = document.getElementById("forensic-analysis-details");
    elements.forensicHintButtons = document.getElementById("forensic-hint-buttons");
    elements.forensicClueSelect = document.getElementById("forensic-clue-select");
    elements.forensicCustomHint = document.getElementById("forensic-custom-hint");
    elements.sendHintButton = document.getElementById("send-hint-button");
    elements.investigationPlayerStateCount = document.getElementById("investigation-player-state-count");
    elements.investigationPlayerStateList = document.getElementById("investigation-player-state-list");
    elements.investigationMessage = document.getElementById("investigation-message");
    elements.advanceAccusationButton = document.getElementById("advance-accusation-button");
    elements.accusationPanel = document.getElementById("accusation-panel");
    elements.accusationForm = document.getElementById("accusation-form");
    elements.accusationTarget = document.getElementById("accusation-target");
    elements.submitAccusationButton = document.getElementById("submit-accusation-button");
    elements.investigationLeaveRoomButton = document.getElementById("investigation-leave-room-button");

    elements.endRoomCode = document.getElementById("end-room-code");
    elements.endRevealCard = document.getElementById("end-reveal-card");
    elements.endWinningSide = document.getElementById("end-winning-side");
    elements.endSummary = document.getElementById("end-summary");
    elements.endDetails = document.getElementById("end-details");
    elements.endHintsCount = document.getElementById("end-hints-count");
    elements.endHintsList = document.getElementById("end-hints-list");
    elements.endRestartButton = document.getElementById("end-restart-button");
    elements.endLeaveRoomButton = document.getElementById("end-leave-room-button");
    elements.playerDetailModal = document.getElementById("player-detail-modal");
    elements.playerDetailContent = document.getElementById("player-detail-content");
    elements.playerDetailClose = document.getElementById("player-detail-close");

  }

  function bindLobbyActions(callbacks) {
    elements.showCreateButton.addEventListener("click", () => callbacks.showCreate());
    elements.showJoinButton.addEventListener("click", () => callbacks.showJoin());

    document.querySelectorAll("[data-screen-target]").forEach(button => {
      button.addEventListener("click", () => callbacks.showScreen(button.dataset.screenTarget));
    });

    elements.createForm.addEventListener("submit", event => {
      event.preventDefault();
      callbacks.createRoom(getCreateRoomValues());
    });

    elements.joinForm.addEventListener("submit", event => {
      event.preventDefault();
      callbacks.joinRoom(getJoinRoomValues());
    });

    elements.joinRoomCode.addEventListener("input", () => {
      elements.joinRoomCode.value = elements.joinRoomCode.value.toUpperCase().replace(/\s/g, "");
    });

    elements.hostSettingsForm.addEventListener("change", () => {
      callbacks.updateSettings(getLobbySettingsValues());
    });

    elements.startGameButton.addEventListener("click", callbacks.startGame);
    elements.forceStartGameButton.addEventListener("click", callbacks.forceStartGame);
    elements.restartRoomButton.addEventListener("click", callbacks.restartRoom);
    elements.transferHostButton.addEventListener("click", () => {
      callbacks.transferHost({ playerId: elements.transferHostPlayer.value });
    });
    elements.kickPlayerButton.addEventListener("click", () => {
      callbacks.kickPlayer({ playerId: elements.kickPlayerSelect.value });
    });
    elements.leaveRoomButton.addEventListener("click", callbacks.leaveRoom);
    elements.continueChoosingButton.addEventListener("click", callbacks.continueToChoosing);
    elements.rolesLeaveRoomButton.addEventListener("click", callbacks.leaveRoom);

    elements.murderSetupForm.addEventListener("submit", event => {
      event.preventDefault();
      callbacks.submitKillerTools(getKillerToolValues());
    });
    elements.murderToolOptions.addEventListener("change", event => {
      const selected = getCheckedToolInputs();
      if (selected.length > 2) {
        event.target.checked = false;
        setMurderMessage("اختر أداتين فقط.", "error");
      } else {
        setMurderMessage(selected.length === 2 ? "جاهز للإرسال." : "اختر أداتين بالضبط.", "");
      }
      elements.murderSubmitButton.disabled = getCheckedToolInputs().length !== 2;
    });
    elements.murderLeaveRoomButton.addEventListener("click", callbacks.leaveRoom);

    elements.forensicCaseForm.addEventListener("submit", event => {
      event.preventDefault();
      callbacks.submitForensicCase(getForensicCaseValues());
    });

    elements.forensicHintForm.addEventListener("submit", event => {
      event.preventDefault();
      callbacks.submitForensicHint(getForensicHintValues());
    });
    elements.forensicHintButtons.addEventListener("click", event => {
      const button = event.target.closest("[data-hint-id]");

      if (!button || button.disabled) {
        return;
      }

      elements.forensicClueSelect.value = button.dataset.hintId;
      syncHintButtonSelection();
    });
    elements.forensicClueSelect.addEventListener("change", syncHintButtonSelection);

    elements.discussionForm.addEventListener("submit", event => {
      event.preventDefault();
      callbacks.sendDiscussion(getDiscussionValues());
    });
    elements.discussionFeedList.addEventListener("click", event => {
      const deleteButton = event.target.closest("[data-delete-discussion-id]");

      if (deleteButton) {
        callbacks.deleteDiscussion({ messageId: deleteButton.dataset.deleteDiscussionId });
      }
    });
    elements.advanceAccusationButton.addEventListener("click", callbacks.advanceAccusation);
    elements.accusationForm.addEventListener("submit", event => {
      event.preventDefault();
      callbacks.submitAccusation({ accusedPlayerId: elements.accusationTarget.value });
    });

    elements.investigationLeaveRoomButton.addEventListener("click", callbacks.leaveRoom);
    elements.endRestartButton.addEventListener("click", callbacks.restartRoom);
    elements.endLeaveRoomButton.addEventListener("click", callbacks.leaveRoom);
    [elements.investigationPlayerStateList, elements.murderPlayerStateList].forEach(listElement => {
      listElement.addEventListener("click", event => {
        const trigger = event.target.closest("[data-player-detail-id]");
        if (trigger) {
          togglePlayerDetail(trigger.dataset.playerDetailId);
        }
      });
    });
    elements.playerDetailModal.addEventListener("click", event => {
      if (event.target.closest("[data-close-player-detail]")) {
        closePlayerDetailModal();
        return;
      }

      const markerButton = event.target.closest("[data-modal-marker]");
      if (markerButton) {
        viewState.suspectMarkers[markerButton.dataset.playerId] = markerButton.dataset.modalMarker;
        rerenderStoredPlayerCards();
        renderPlayerDetailModal(markerButton.dataset.playerId);
      }
    });
    elements.playerDetailModal.addEventListener("input", event => {
      const notesField = event.target.closest("[data-player-note-id]");
      if (notesField) {
        viewState.playerNotes[notesField.dataset.playerNoteId] = notesField.value;
      }
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !elements.playerDetailModal.hidden) {
        closePlayerDetailModal();
      }
    });

  }

  function populateProfileSelects() {
    [elements.createProfileSelect, elements.joinProfileSelect].forEach(selectElement => {
      if (!selectElement) {
        return;
      }

      selectElement.textContent = "";
      DetectiveProfiles.getProfiles().forEach(profile => {
        const option = document.createElement("option");
        option.value = profile.id;
        option.textContent = profile.nameAr;
        selectElement.append(option);
      });
    });
  }

  function bindProfilePreviews() {
    [
      [elements.createProfileSelect, elements.createGlowSelect, elements.createProfilePreview],
      [elements.joinProfileSelect, elements.joinGlowSelect, elements.joinProfilePreview]
    ].forEach(([profileSelect, glowSelect, preview]) => {
      if (!profileSelect || !glowSelect || !preview) {
        return;
      }

      const update = () => renderProfilePreview(profileSelect, glowSelect, preview);
      profileSelect.addEventListener("change", update);
      glowSelect.addEventListener("change", update);
      update();
    });
  }

  function renderProfilePreview(profileSelect, glowSelect, preview) {
    const profileData = DetectiveProfiles.normalizeProfile({
      profileId: profileSelect.value,
      glowColor: glowSelect.value
    });
    const profile = DetectiveProfiles.getProfile(profileData.profileId);
    const avatar = renderPlayerAvatar(profileData);
    const name = document.createElement("strong");
    const frame = document.createElement("span");

    preview.textContent = "";
    name.textContent = profile.nameAr;
    frame.textContent = glowSelect.options[glowSelect.selectedIndex]?.textContent || "";
    preview.append(avatar, name, frame);
  }

  function getCreateRoomValues() {
    return {
      playerName: elements.createName.value.trim(),
      profile: DetectiveProfiles.normalizeProfile({
        profileId: elements.createProfileSelect.value,
        glowColor: elements.createGlowSelect.value
      }),
      settings: {
        requiredPlayerCount: Number(elements.createRequiredPlayerCount.value),
        roundTimerMinutes: Number(elements.createRoundTimer.value),
        autoRoleAssignment: true,
        witnessEnabled: true,
        accompliceEnabled: true
      }
    };
  }

  function getJoinRoomValues() {
    return {
      roomCode: elements.joinRoomCode.value.trim().toUpperCase(),
      playerName: elements.joinName.value.trim(),
      profile: DetectiveProfiles.normalizeProfile({
        profileId: elements.joinProfileSelect.value,
        glowColor: elements.joinGlowSelect.value
      })
    };
  }

  function getLobbySettingsValues() {
    return {
      requiredPlayerCount: Number(elements.lobbyRequiredPlayerCount.value),
      roundTimerMinutes: Number(elements.lobbyRoundTimer.value),
      autoRoleAssignment: elements.lobbyAutoRoles.checked,
      witnessEnabled: elements.lobbyEnableWitness.checked,
      accompliceEnabled: elements.lobbyEnableAccomplice.checked,
      forensicDoctorPlayerId: elements.lobbyForensicPlayer.value,
      manualKillerId: elements.lobbyManualKiller.value,
      manualAccompliceId: elements.lobbyManualAccomplice.value,
      manualWitnessId: elements.lobbyManualWitness.value
    };
  }

  function getKillerToolValues() {
    return {
      selectedToolIds: getCheckedToolInputs().map(input => input.value)
    };
  }

  function getCheckedToolInputs() {
    return [...elements.murderToolOptions.querySelectorAll("input[type='checkbox']:checked")];
  }

  function getForensicCaseValues() {
    return {
      deathCauseId: elements.forensicDeathCause.value,
      bodyConditionId: elements.forensicBodyCondition.value,
      evidenceTypeId: elements.forensicEvidence.value,
      locationId: elements.forensicLocation.value,
      forensicDetailId: elements.forensicDetail.value,
      hiddenDetails: elements.forensicHiddenDetails.value
    };
  }

  function getForensicHintValues() {
    return {
      selectedHintId: elements.forensicClueSelect.value,
      customText: elements.forensicCustomHint.value
    };
  }

  function getDiscussionValues() {
    return {
      text: elements.discussionMessageInput.value
    };
  }

  function showScreen(screenName) {
    Object.entries(elements.screens).forEach(([name, screen]) => {
      const isActive = name === screenName;
      screen.hidden = !isActive;
      screen.classList.toggle("is-active", isActive);
    });

    document.body.dataset.screen = screenName;
    window.DetectiveAtmosphere?.syncScreen?.(screenName);

    if (elements.playerDetailModal && !elements.playerDetailModal.hidden) {
      closePlayerDetailModal();
    }
  }

  function setCreateDefaults(playerName = "") {
    elements.createName.value = playerName;
    elements.createRequiredPlayerCount.value = "5";
    elements.createRoundTimer.value = "10";
    elements.createProfileSelect.value = DetectiveProfiles.getProfiles()[0]?.id || "";
    elements.createGlowSelect.value = "gold";
    renderProfilePreview(elements.createProfileSelect, elements.createGlowSelect, elements.createProfilePreview);
    setCreateMessage("");
  }

  function setJoinDefaults(playerName = "", roomCode = "") {
    elements.joinName.value = playerName;
    elements.joinRoomCode.value = roomCode.trim().toUpperCase();
    elements.joinProfileSelect.value = DetectiveProfiles.getProfiles()[0]?.id || "";
    elements.joinGlowSelect.value = "gold";
    renderProfilePreview(elements.joinProfileSelect, elements.joinGlowSelect, elements.joinProfilePreview);
    setJoinMessage("");
  }

  function setBusy(buttonName, isBusy) {
    const buttons = {
      create: elements.createButton,
      join: elements.joinButton,
      start: elements.startGameButton,
      forceStart: elements.forceStartGameButton,
      restartRoom: elements.restartRoomButton,
      leave: elements.leaveRoomButton,
      rolesLeave: elements.rolesLeaveRoomButton,
      continueChoosing: elements.continueChoosingButton,
      submitMurder: elements.murderSubmitButton,
      murderLeave: elements.murderLeaveRoomButton,
      submitForensicCase: elements.submitForensicCaseButton,
      sendHint: elements.sendHintButton,
      sendDiscussion: elements.sendDiscussionButton,
      advanceAccusation: elements.advanceAccusationButton,
      submitAccusation: elements.submitAccusationButton,
      investigationLeave: elements.investigationLeaveRoomButton,
      endLeave: elements.endLeaveRoomButton
    };

    if (buttons[buttonName]) {
      buttons[buttonName].disabled = isBusy;
    }
  }

  function setConnectionState(stateName, label) {
    elements.connectionChip.classList.remove("is-loading", "is-success", "is-error");
    elements.connectionChip.classList.add(`is-${stateName}`);
    elements.connectionChipText.textContent = label;
  }

  function setHomeMessage(message, type = "") {
    setMessage(elements.homeMessage, message, type);
  }

  function setCreateMessage(message, type = "") {
    setMessage(elements.createMessage, message, type);
  }

  function setJoinMessage(message, type = "") {
    setMessage(elements.joinMessage, message, type);
  }

  function setLobbyMessage(message, type = "") {
    setMessage(elements.lobbyMessage, message, type);
  }

  function setRolesMessage(message, type = "") {
    setMessage(elements.rolesMessage, message, type);
  }

  function setMurderMessage(message, type = "") {
    setMessage(elements.murderMessage, message, type);
  }

  function setInvestigationMessage(message, type = "") {
    setMessage(elements.investigationMessage, message, type);
  }

  function setMessage(element, message, type) {
    element.classList.remove("is-error", "is-success");
    if (type) {
      element.classList.add(`is-${type}`);
    }
    element.textContent = message;
  }

  function renderGlobalTimer(timer) {
    viewState.timer = timer || null;

    if (viewState.timerInterval) {
      clearInterval(viewState.timerInterval);
      viewState.timerInterval = null;
    }

    if (!timer || timer.unlimited || timer.paused || !timer.endsAt) {
      elements.globalTimer.hidden = !timer || timer.unlimited;
      elements.globalTimer.textContent = timer?.unlimited ? "بدون مؤقت" : "--:--";
      return;
    }

    elements.globalTimer.hidden = false;
    updateTimerText();
    viewState.timerInterval = setInterval(updateTimerText, 1000);
  }

  function updateTimerText() {
    const timer = viewState.timer;
    const remainingMs = Math.max(0, Number(timer?.endsAt || 0) - Date.now());
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    elements.globalTimer.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    elements.globalTimer.classList.toggle("is-ending", totalSeconds <= 30);
  }

  function clearDiscussionInput() {
    elements.discussionMessageInput.value = "";
  }

  function clearForensicHintInput() {
    elements.forensicCustomHint.value = "";
    elements.forensicClueSelect.value = "__custom__";
    syncHintButtonSelection();
  }

  function fillPlayerSelect(selectElement, players, emptyLabel, selectedValue) {
    selectElement.textContent = "";
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = emptyLabel;
    selectElement.append(emptyOption);

    players.forEach(([playerId, playerName]) => {
      const option = document.createElement("option");
      option.value = playerId;
      option.textContent = playerName;
      selectElement.append(option);
    });

    selectElement.value = players.some(([playerId]) => playerId === selectedValue) ? selectedValue : "";
  }

  function formatTimerSetting(minutes) {
    const numberValue = Number(minutes || 0);
    return numberValue ? `${numberValue} دقيقة` : "بدون مؤقت";
  }

  function formatTimestamp(value) {
    const timestamp = Number(value || 0);

    if (!timestamp) {
      return "";
    }

    return new Date(timestamp).toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function renderLobby({ roomCode, publicData, playerId, isHost }) {
    renderGlobalTimer(publicData.timer);
    const playerNames = publicData.playerNames || {};
    const playerProfiles = publicData.playerProfiles || {};
    const settings = {
      ...DetectiveFirebase.defaultRoomSettings,
      ...(publicData.settings || {})
    };
    const players = Object.entries(playerNames).sort((a, b) => a[1].localeCompare(b[1], "ar"));
    const minimumPlayers = DetectiveRoles.getMinimumPlayers(settings);
    const isReady = players.length >= settings.requiredPlayerCount && players.length >= minimumPlayers;

    elements.lobbyRoomCode.textContent = roomCode;
    elements.lobbyRoleBadge.textContent = isHost ? "الهوست" : "لاعب";
    elements.playerCount.textContent = `${players.length} / ${settings.requiredPlayerCount}`;
    elements.lobbyRequiredPlayerCount.value = String(settings.requiredPlayerCount);
    elements.lobbyRoundTimer.value = String(settings.roundTimerMinutes ?? 10);
    elements.lobbyAutoRoles.checked = settings.autoRoleAssignment !== false;
    elements.lobbyEnableWitness.checked = settings.witnessEnabled !== false;
    elements.lobbyEnableAccomplice.checked = settings.accompliceEnabled !== false;
    fillPlayerSelect(elements.lobbyForensicPlayer, players, "تلقائي", settings.forensicDoctorPlayerId || "");
    fillPlayerSelect(elements.lobbyManualKiller, players, "تلقائي", settings.manualKillerId || "");
    fillPlayerSelect(elements.lobbyManualAccomplice, players, "تلقائي", settings.manualAccompliceId || "");
    fillPlayerSelect(elements.lobbyManualWitness, players, "تلقائي", settings.manualWitnessId || "");
    elements.lobbyRequiredPlayerCount.disabled = !isHost;
    elements.lobbyRoundTimer.disabled = !isHost;
    elements.lobbyAutoRoles.disabled = !isHost;
    elements.lobbyEnableWitness.disabled = !isHost;
    elements.lobbyEnableAccomplice.disabled = !isHost;
    elements.lobbyForensicPlayer.disabled = !isHost;
    elements.lobbyManualKiller.disabled = !isHost || settings.autoRoleAssignment !== false;
    elements.lobbyManualAccomplice.disabled = !isHost || settings.autoRoleAssignment !== false || settings.accompliceEnabled === false;
    elements.lobbyManualWitness.disabled = !isHost || settings.autoRoleAssignment !== false || settings.witnessEnabled === false;
    document.querySelectorAll(".manual-role-field").forEach(field => {
      field.hidden = settings.autoRoleAssignment !== false;
    });
    elements.settingsSummary.textContent = `الحد الأدنى: ${settings.requiredPlayerCount} · أقل عدد صالح للأدوار الحالية: ${minimumPlayers} · المؤقت: ${formatTimerSetting(settings.roundTimerMinutes)}`;
    elements.startGameButton.hidden = !isHost;
    elements.forceStartGameButton.hidden = !isHost;
    elements.restartRoomButton.hidden = !isHost;
    elements.hostControlPanel.hidden = !isHost;
    elements.startGameButton.disabled = !isReady || players.length < minimumPlayers;
    elements.forceStartGameButton.disabled = players.length < minimumPlayers;
    fillPlayerSelect(elements.transferHostPlayer, players.filter(([id]) => id !== playerId), "اختر لاعباً", "");
    fillPlayerSelect(elements.kickPlayerSelect, players.filter(([id]) => id !== playerId), "اختر لاعباً", "");
    elements.transferHostButton.disabled = !isHost || !elements.transferHostPlayer.value;
    elements.kickPlayerButton.disabled = !isHost || !elements.kickPlayerSelect.value;

    renderPlayerList({
      listElement: elements.playerList,
      players,
      hostId: publicData.hostId,
      currentPlayerId: playerId,
      playerProfiles
    });

    setLobbyMessage(
      isReady
        ? (isHost ? "العدد مكتمل. يمكنك توزيع الأدوار." : "العدد مكتمل. بانتظار الهوست.")
        : `بانتظار اكتمال العدد: ${players.length} / ${settings.requiredPlayerCount}.`,
      ""
    );
  }

  function renderRoles({ roomCode, publicData, privateData, playerId, isHost }) {
    renderGlobalTimer(publicData.timer);
    const playerNames = publicData.playerNames || {};
    const playerProfiles = publicData.playerProfiles || {};
    const playerTools = publicData.playerTools || {};
    const players = Object.entries(playerNames).sort((a, b) => a[1].localeCompare(b[1], "ar"));
    const roleView = DetectiveRoles.describePrivateRole(privateData, playerNames);

    elements.rolesRoomCode.textContent = roomCode;
    elements.roleRevealCard.dataset.role = privateData?.role || "loading";
    elements.roleName.textContent = roleView.name;
    elements.roleDescription.textContent = roleView.description;
    renderDetails(elements.rolePrivateDetails, roleView.details);
    renderTools(elements.ownToolsList, playerTools[playerId] || [], true);
    elements.rolesPlayerCount.textContent = String(players.length);
    renderPlayerList({
      listElement: elements.rolesPlayerList,
      players,
      hostId: publicData.hostId,
      currentPlayerId: playerId,
      playerTools,
      playerProfiles
    });
    elements.continueChoosingButton.hidden = !isHost;
    setRolesMessage(isHost ? "بعد أن يقرأ الجميع أدوارهم، انتقل لاختيار أدوات القاتل." : "اقرأ دورك وانتظر الهوست.", "");
  }

  function renderMurderSetup({ roomCode, publicData, privateData, playerId }) {
    renderGlobalTimer(publicData.timer);
    const playerNames = publicData.playerNames || {};
    const playerProfiles = publicData.playerProfiles || {};
    const playerTools = publicData.playerTools || {};
    const playerStates = publicData.playerStates || {};
    const ownTools = playerTools[playerId] || [];
    const view = DetectiveGame.describeKillerSetup({ privateData });

    elements.murderRoomCode.textContent = roomCode;
    elements.murderPrivateCard.dataset.role = privateData?.role || "loading";
    elements.murderStatusBanner.textContent = "القاتل يختار أداتين فقط. لا توجد تفاصيل جريمة أو تلميحات في هذه المرحلة.";
    elements.murderPrivateLabel.textContent = view.label;
    elements.murderPrivateTitle.textContent = view.title;
    elements.murderPrivateDescription.textContent = view.description;
    renderDetails(elements.murderPrivateDetails, view.details);
    renderTools(elements.murderWeaponCard, ownTools, true);
    renderKillerToolOptions(view.canChooseTools ? ownTools : []);
    elements.murderSetupForm.hidden = !view.canChooseTools;
    elements.murderSubmitButton.disabled = true;
    renderPlayerToolCardsTo(elements.murderPlayerStateList, elements.murderPlayerStateCount, playerStates, playerNames, playerTools, playerId, playerProfiles);
    setMurderMessage(view.canChooseTools ? "اختر أداتين من أدواتك الثمانية." : "بانتظار اختيار القاتل للأداتين.", "");
  }

  function renderInvestigation({ roomCode, publicData, privateData, playerId, isHost }) {
    renderGlobalTimer(publicData.timer);
    const playerNames = publicData.playerNames || {};
    const playerProfiles = publicData.playerProfiles || {};
    const playerStates = publicData.playerStates || {};
    const playerTools = publicData.playerTools || {};
    const status = publicData.status;
    const view = DetectiveGame.describeInvestigation({
      privateData,
      publicCaseFile: publicData.caseFile || {},
      status,
      playerNames
    });

    elements.investigationRoomCode.textContent = roomCode;
    elements.investigationPrivateCard.dataset.role = privateData?.role || "loading";
    elements.investigationStatusBanner.textContent = view.description;
    renderDetails(elements.caseFileDetails, view.details);
    renderDetails(elements.investigationPrivateDetails, view.privateDetails);
    elements.investigationPrivateLabel.textContent = "بيانات خاصة";
    elements.investigationPrivateTitle.textContent = view.privateTitle;
    elements.investigationPrivateDescription.textContent = view.privateDescription;
    renderInvestigationFeed(publicData.investigationFeed || {});
    renderDiscussionFeed(publicData.discussionFeed || {}, isHost, playerProfiles);
    elements.discussionForm.hidden = ![DetectiveGame.investigationStatus, DetectiveGame.accusationStatus].includes(status);
    renderForensicPanel(view.forensicPanel, publicData.investigationFeed || {});
    renderPlayerToolCardsTo(elements.investigationPlayerStateList, elements.investigationPlayerStateCount, playerStates, playerNames, playerTools, playerId, playerProfiles);
    syncPlayerDetailData(playerNames, playerTools, playerProfiles, playerStates);
    elements.advanceAccusationButton.hidden = !isHost || status !== DetectiveGame.investigationStatus;
    elements.accusationPanel.hidden = status !== DetectiveGame.accusationStatus || !isHost;
    fillPlayerSelect(elements.accusationTarget, Object.entries(playerNames), "اختر المتهم", elements.accusationTarget.value);
    setInvestigationMessage(
      status === DetectiveGame.forensicSetupStatus
        ? "بانتظار الطبيب الشرعي لبناء لوحة التحقيق."
        : status === DetectiveGame.accusationStatus
          ? "مرحلة الاتهام مفتوحة. ناقشوا القرار النهائي."
        : "ناقش، افحص الأدوات، وانتظر التلميحات المنشورة فقط.",
      ""
    );
  }

  function renderEnd({ roomCode, publicData, isHost }) {
    renderGlobalTimer(publicData.timer);
    const reveal = publicData.endReveal || {};
    const toolNames = (reveal.chosenTools || []).map(tool => tool.nameAr).join("، ") || "غير محدد";
    const caseData = reveal.caseData || {};

    elements.endRoomCode.textContent = roomCode;
    elements.endRevealCard.dataset.role = "reveal";
    elements.endWinningSide.textContent = reveal.winnerLabel || "لم تحدد النتيجة";
    elements.endSummary.textContent = `الاتهام النهائي: ${reveal.accused?.name || "غير محدد"}`;
    renderDetails(elements.endDetails, [
      { label: "القاتل", value: reveal.killer?.name || "غير محدد" },
      { label: "الشريك", value: reveal.accomplice?.name || "غير موجود" },
      { label: "الشاهد", value: reveal.witness?.name || "غير موجود" },
      { label: "الطبيب الشرعي", value: reveal.forensic?.name || "غير محدد" },
      { label: "الأدوات المختارة", value: toolNames },
      { label: "سبب الوفاة", value: caseData.deathCause?.nameAr || "غير محدد" },
      { label: "حالة الجثة", value: caseData.bodyCondition?.nameAr || "غير محدد" },
      { label: "الدليل", value: caseData.evidenceType?.nameAr || "غير محدد" },
      { label: "الموقع", value: caseData.location?.nameAr || "غير محدد" },
      { label: "تفصيل جنائي", value: caseData.forensicDetail?.nameAr || "غير محدد" }
    ]);
    renderFeed({
      listElement: elements.endHintsList,
      countElement: elements.endHintsCount,
      entriesSource: reveal.releasedHints || {},
      emptyText: "لم تنشر تلميحات."
    });
    elements.endRestartButton.hidden = !isHost;
  }

  function renderInvestigationFeed(feed) {
    renderFeed({
      listElement: elements.investigationFeedList,
      countElement: elements.investigationFeedCount,
      entriesSource: feed,
      emptyText: "لم يرسل الطبيب الشرعي أي تلميح بعد."
    });
  }

  function renderDiscussionFeed(feed, isHost = false, playerProfiles = {}) {
    renderFeed({
      listElement: elements.discussionFeedList,
      countElement: elements.discussionFeedCount,
      entriesSource: feed,
      emptyText: "لم يبدأ النقاش المكتوب بعد.",
      canModerate: isHost,
      playerProfiles
    });
  }

  function renderFeed({ listElement, countElement, entriesSource, emptyText, canModerate = false, playerProfiles = {} }) {
    const entries = Object.values(entriesSource || {})
      .filter(Boolean)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    countElement.textContent = String(entries.length);
    listElement.textContent = "";

    if (!entries.length) {
      const item = document.createElement("li");
      item.className = "feed-item";
      item.textContent = emptyText;
      listElement.append(item);
      return;
    }

    entries.forEach(entry => {
      const item = document.createElement("li");
      const content = document.createElement("div");
      const header = document.createElement("div");
      const title = document.createElement("strong");
      const tag = document.createElement("span");
      const time = document.createElement("span");
      const text = document.createElement("p");

      item.className = "feed-item";
      content.className = "feed-item-content";
      header.className = "feed-item-header";
      title.textContent = entry.title || entry.playerName || "تحديث";
      tag.textContent = entry.categoryLabel || entry.authorLabel || "نقاش";
      time.className = "feed-time";
      time.textContent = formatTimestamp(entry.createdAt);
      text.textContent = entry.text || "";
      header.append(title, tag, time);
      if (canModerate && entry.id && entry.source === "player") {
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "feed-delete-button";
        deleteButton.dataset.deleteDiscussionId = entry.id;
        deleteButton.textContent = "حذف";
        header.append(deleteButton);
      }
      if (entry.playerId && playerProfiles[entry.playerId]) {
        const avatar = renderPlayerAvatar(playerProfiles[entry.playerId]);
        avatar.classList.add("feed-avatar");
        item.append(avatar);
      }

      content.append(header, text);
      item.append(content);
      listElement.append(item);
    });
  }

  function renderForensicPanel(panel, feed) {
    const isCaseBuilder = panel?.mode === "caseBuilder";
    const isHintControl = panel?.mode === "hintControl";

    elements.forensicPanelSection.hidden = !panel;
    elements.forensicCaseForm.hidden = !isCaseBuilder;
    elements.forensicHintForm.hidden = !isHintControl;

    if (isCaseBuilder) {
      renderTools(elements.forensicChosenTools, panel.chosenToolIds || [], true);
      renderForensicCaseOptions();
    }

    if (isHintControl) {
      const releasedHintIds = new Set(
        Object.values(feed || {})
          .map(entry => entry?.selectedHintId)
          .filter(Boolean)
      );
      renderTools(elements.forensicChosenTools, panel.chosenToolIds || [], true);
      renderDetails(elements.forensicAnalysisDetails, [
        { label: "القاتل", value: panel.killer?.name || "غير محدد" },
        { label: "الأدوات المختارة", value: formatToolNames(panel.chosenToolIds || []) },
        { label: "سبب الوفاة", value: panel.caseData?.deathCause?.nameAr || "غير محدد" },
        { label: "الموقع الحقيقي", value: panel.caseData?.location?.nameAr || "غير محدد" },
        { label: "تفاصيل مخفية", value: panel.caseData?.hiddenDetails || "لا توجد" }
      ]);
      renderForensicHintOptions(panel.hints || [], releasedHintIds);
      renderForensicHintButtons(panel.hints || [], releasedHintIds);
      syncHintButtonSelection();
    } else {
      elements.forensicAnalysisDetails.textContent = "";
      elements.forensicHintButtons.textContent = "";
    }
  }

  function renderForensicCaseOptions() {
    renderSelectOptions(elements.forensicDeathCause, DetectiveGame.forensicCategories.deathCauses);
    renderSelectOptions(elements.forensicBodyCondition, DetectiveGame.forensicCategories.bodyConditions);
    renderSelectOptions(elements.forensicEvidence, DetectiveGame.forensicCategories.evidenceTypes);
    renderSelectOptions(elements.forensicLocation, DetectiveGame.forensicCategories.locations);
    renderSelectOptions(elements.forensicDetail, DetectiveGame.forensicCategories.forensicDetails);
  }

  function renderSelectOptions(selectElement, options) {
    const currentValue = selectElement.value;
    selectElement.textContent = "";

    options.forEach(option => {
      const node = document.createElement("option");
      node.value = option.id;
      node.textContent = option.nameAr;
      selectElement.append(node);
    });

    selectElement.value = options.some(option => option.id === currentValue)
      ? currentValue
      : options[0]?.id || "";
  }

  function renderForensicHintOptions(hints, releasedHintIds) {
    const currentValue = elements.forensicClueSelect.value;
    elements.forensicClueSelect.textContent = "";

    const customOption = document.createElement("option");
    customOption.value = "__custom__";
    customOption.textContent = "ملاحظة يدوية";
    elements.forensicClueSelect.append(customOption);

    hints.forEach(hint => {
      const option = document.createElement("option");
      option.value = hint.id;
      option.textContent = releasedHintIds.has(hint.id)
        ? `${hint.categoryLabel} - تم الإرسال`
        : `${hint.categoryLabel} - ${hint.title}`;
      option.disabled = releasedHintIds.has(hint.id);
      elements.forensicClueSelect.append(option);
    });

    const validValues = ["__custom__", ...hints.filter(hint => !releasedHintIds.has(hint.id)).map(hint => hint.id)];
    elements.forensicClueSelect.value = validValues.includes(currentValue) ? currentValue : "__custom__";
  }

  function renderForensicHintButtons(hints, releasedHintIds) {
    elements.forensicHintButtons.textContent = "";

    hints.forEach(hint => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hint-button";
      button.dataset.hintId = hint.id;
      button.disabled = releasedHintIds.has(hint.id);
      button.textContent = releasedHintIds.has(hint.id)
        ? `${hint.categoryLabel} ✓`
        : hint.title;
      elements.forensicHintButtons.append(button);
    });
  }

  function syncHintButtonSelection() {
    const selectedHintId = elements.forensicClueSelect.value;

    [...elements.forensicHintButtons.querySelectorAll("[data-hint-id]")].forEach(button => {
      button.classList.toggle("is-selected", button.dataset.hintId === selectedHintId);
    });
  }

  function renderKillerToolOptions(ownTools) {
    elements.murderToolOptions.textContent = "";

    ownTools.forEach(toolId => {
      const tool = DetectiveTools.getTool(toolId);
      const label = document.createElement("label");
      const input = document.createElement("input");
      const image = document.createElement("img");
      const body = document.createElement("span");
      const name = document.createElement("strong");
      const type = document.createElement("small");

      label.className = "tool-choice-card";
      input.type = "checkbox";
      input.value = tool.id;
      image.src = tool.imagePath;
      image.alt = tool.nameAr;
      image.loading = "lazy";
      image.addEventListener("error", () => {
        image.src = DetectiveTools.placeholderImagePath;
      }, { once: true });
      name.textContent = tool.nameAr;
      type.textContent = tool.typeLabel;
      body.append(name, type);
      label.append(input, image, body);
      elements.murderToolOptions.append(label);
    });
  }

  function renderPlayerToolCardsTo(listElement, countElement, playerStates, playerNames, playerTools, currentPlayerId, playerProfiles = {}) {
    viewState.playerListContext = {
      listElement,
      countElement,
      playerStates,
      playerNames,
      playerTools,
      currentPlayerId,
      playerProfiles
    };
    const playerIds = [...new Set([
      ...Object.keys(playerNames || {}),
      ...Object.keys(playerStates || {})
    ])];
    countElement.textContent = String(playerIds.length);
    listElement.textContent = "";

    if (!playerIds.length) {
      const item = document.createElement("li");
      item.textContent = "بانتظار مزامنة اللاعبين.";
      listElement.append(item);
      return;
    }

    playerIds.forEach(playerId => {
      const state = playerStates[playerId] || {};
      const item = document.createElement("li");
      const button = document.createElement("button");
      const avatar = renderPlayerAvatar(playerProfiles[playerId]);
      const header = document.createElement("span");
      const name = document.createElement("span");
      const marker = document.createElement("span");
      const status = document.createElement("span");
      const tools = document.createElement("span");

      item.className = "investigation-player-item";
      button.className = "player-detail-button";
      button.type = "button";
      button.dataset.playerDetailId = playerId;
      button.style.setProperty("--player-glow", DetectiveProfiles.getGlowColor(playerProfiles[playerId]?.glowColor));
      header.className = "player-card-header";
      name.className = "player-name";
      name.textContent = playerNames[playerId] || state.name || (playerId === currentPlayerId ? "أنت" : "لاعب");
      marker.className = "player-tag local-marker";
      marker.textContent = getMarkerLabel(viewState.suspectMarkers[playerId]);
      marker.hidden = !marker.textContent;
      status.className = "player-tag";
      status.textContent = state.connected === false ? "منقطع" : "نشط";
      tools.className = "player-tools mini-tools";
      renderTools(tools, playerTools[playerId] || [], false);
      header.append(name, marker, status);
      button.append(avatar, header, tools);
      item.append(button);
      listElement.append(item);
    });

    if (viewState.openPlayerDetailId && !elements.playerDetailModal.hidden) {
      renderPlayerDetailModal(viewState.openPlayerDetailId);
    }
  }

  function renderInlinePlayerDetail(playerId, toolIds) {
    const detail = document.createElement("div");
    const markerActions = document.createElement("div");
    const notesLabel = document.createElement("label");
    const notesTitle = document.createElement("span");
    const notes = document.createElement("textarea");

    detail.className = "inline-player-detail";
    renderTools(detail, toolIds, true);
    markerActions.className = "marker-actions";
    [
      ["suspect", "مشتبه به"],
      ["low", "أقل شكاً"],
      ["", "مسح"]
    ].forEach(([value, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.inlineMarker = value;
      button.dataset.playerId = playerId;
      button.classList.toggle("is-selected", (viewState.suspectMarkers[playerId] || "") === value);
      button.textContent = label;
      markerActions.append(button);
    });
    notesLabel.className = "player-notes-field";
    notesTitle.textContent = "ملاحظاتك المحلية";
    notes.dataset.playerNoteId = playerId;
    notes.maxLength = 240;
    notes.rows = 3;
    notes.value = viewState.playerNotes[playerId] || "";
    notesLabel.append(notesTitle, notes);
    detail.append(markerActions, notesLabel);

    return detail;
  }

  function renderPlayerList({ listElement, players, hostId = "", currentPlayerId = "", playerTools = {}, playerProfiles = {} }) {
    listElement.textContent = "";

    if (!players.length) {
      const item = document.createElement("li");
      item.textContent = "لا يوجد لاعبون بعد.";
      listElement.append(item);
      return;
    }

    players.forEach(([playerId, playerName]) => {
      const item = document.createElement("li");
      const avatar = renderPlayerAvatar(playerProfiles[playerId]);
      const name = document.createElement("span");
      const meta = document.createElement("div");
      const tools = playerTools[playerId] || [];

      item.style.setProperty("--player-glow", DetectiveProfiles.getGlowColor(playerProfiles[playerId]?.glowColor));
      name.className = "player-name";
      name.textContent = [
        playerName,
        playerId === currentPlayerId ? "(أنت)" : "",
        playerId === hostId ? "(هوست)" : ""
      ].filter(Boolean).join(" ");
      meta.className = tools.length ? "player-tools mini-tools" : "player-tag";

      if (tools.length) {
        renderTools(meta, tools, false);
      } else {
        meta.textContent = "بانتظار الأدوات";
      }

      item.append(avatar, name, meta);
      listElement.append(item);
    });
  }

  function renderPlayerAvatar(profileData = {}) {
    const normalized = DetectiveProfiles.normalizeProfile(profileData);
    const profile = DetectiveProfiles.getProfile(normalized.profileId);
    const wrap = document.createElement("span");
    const image = document.createElement("img");

    wrap.className = "player-avatar";
    wrap.style.setProperty("--profile-glow", DetectiveProfiles.getGlowColor(normalized.glowColor));
    wrap.dataset.profileId = normalized.profileId;
    image.src = profile.imagePath;
    image.alt = profile.nameAr;
    image.loading = "lazy";
    image.addEventListener("error", () => {
      if (profile.fallbackPath && !image.dataset.fallbackApplied) {
        image.dataset.fallbackApplied = "true";
        image.src = profile.fallbackPath;
        return;
      }
      wrap.classList.add("is-missing-avatar");
      image.remove();
    });
    wrap.append(image);

    return wrap;
  }

  function renderTools(container, toolIds, includeDetails) {
    container.textContent = "";

    if (!toolIds.length) {
      const empty = document.createElement("p");
      empty.textContent = "لم تصل الأدوات بعد.";
      container.append(empty);
      return;
    }

    toolIds.forEach(toolId => {
      const tool = DetectiveTools.getTool(toolId);
      const card = document.createElement("article");
      const imageWrap = document.createElement("div");
      const image = document.createElement("img");
      const body = document.createElement("div");
      const name = document.createElement("strong");
      const type = document.createElement("span");

      card.className = includeDetails ? "tool-card" : "tool-card tool-card-mini";
      imageWrap.className = "tool-image-wrap";
      image.src = tool.imagePath;
      image.alt = tool.nameAr;
      image.loading = "lazy";
      image.addEventListener("error", () => {
        card.classList.add("is-missing");
        image.src = DetectiveTools.placeholderImagePath;
      }, { once: true });
      body.className = "tool-card-body";
      name.textContent = tool.nameAr;
      type.textContent = includeDetails ? tool.descriptionAr : tool.typeLabel;
      imageWrap.append(image);
      body.append(name, type);
      card.append(imageWrap, body);
      container.append(card);
    });
  }

  function renderDetails(container, details = []) {
    container.textContent = "";

    if (!details.length) {
      const empty = document.createElement("p");
      empty.textContent = "لا توجد تفاصيل.";
      container.append(empty);
      return;
    }

    details.forEach(detail => {
      const term = document.createElement("dt");
      const description = document.createElement("dd");

      term.textContent = detail.label;
      description.textContent = detail.value;
      container.append(term, description);
    });
  }

  function syncPlayerDetailData(playerNames, playerTools, playerProfiles = {}, playerStates = {}) {
    viewState.playerNames = playerNames;
    viewState.playerTools = playerTools;
    viewState.playerProfiles = playerProfiles;
    viewState.playerStates = playerStates;

    if (viewState.openPlayerDetailId) {
      renderPlayerDetailModal(viewState.openPlayerDetailId);
    }
  }

  function togglePlayerDetail(playerId) {
    if (viewState.openPlayerDetailId === playerId && !elements.playerDetailModal.hidden) {
      closePlayerDetailModal();
      return;
    }

    viewState.openPlayerDetailId = playerId;
    renderPlayerDetailModal(playerId);
  }

  function closePlayerDetailModal() {
    viewState.openPlayerDetailId = "";
    elements.playerDetailModal.hidden = true;
    elements.playerDetailContent.textContent = "";
  }

  function renderPlayerDetailModal(playerId) {
    const context = viewState.playerListContext || {};
    const playerNames = context.playerNames || viewState.playerNames || {};
    const playerTools = context.playerTools || viewState.playerTools || {};
    const playerProfiles = context.playerProfiles || viewState.playerProfiles || {};
    const playerStates = context.playerStates || viewState.playerStates || {};
    const state = playerStates[playerId] || {};
    const toolIds = playerTools[playerId] || [];
    const title = document.createElement("header");
    const avatar = renderPlayerAvatar(playerProfiles[playerId]);
    const identity = document.createElement("div");
    const name = document.createElement("h3");
    const status = document.createElement("span");
    const toolsTitle = document.createElement("p");
    const tools = document.createElement("div");
    const markerActions = document.createElement("div");
    const notesLabel = document.createElement("label");
    const notesTitle = document.createElement("span");
    const notes = document.createElement("textarea");

    elements.playerDetailContent.textContent = "";
    title.className = "player-detail-modal-header";
    identity.className = "player-detail-identity";
    name.id = "player-detail-modal-title";
    name.textContent = playerNames[playerId] || state.name || "لاعب";
    status.className = "player-tag";
    status.textContent = state.connected === false ? "منقطع" : "نشط";
    identity.append(name, status);
    title.append(avatar, identity);

    toolsTitle.className = "player-detail-section-title";
    toolsTitle.textContent = "الأدوات العامة";
    tools.className = "player-detail-tools";
    renderTools(tools, toolIds, true);

    markerActions.className = "marker-actions player-detail-markers";
    [
      ["suspect", "مشتبه به"],
      ["low", "أقل شكاً"],
      ["", "محايد"]
    ].forEach(([value, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.modalMarker = value;
      button.dataset.playerId = playerId;
      button.classList.toggle("is-selected", (viewState.suspectMarkers[playerId] || "") === value);
      button.textContent = label;
      markerActions.append(button);
    });

    notesLabel.className = "player-notes-field";
    notesTitle.textContent = "ملاحظاتك المحلية";
    notes.dataset.playerNoteId = playerId;
    notes.maxLength = 240;
    notes.rows = 3;
    notes.value = viewState.playerNotes[playerId] || "";
    notesLabel.append(notesTitle, notes);

    elements.playerDetailContent.append(title, toolsTitle, tools, markerActions, notesLabel);
    elements.playerDetailModal.hidden = false;
  }

  function rerenderStoredPlayerCards() {
    const context = viewState.playerListContext;

    if (!context) {
      return;
    }

    renderPlayerToolCardsTo(
      context.listElement,
      context.countElement,
      context.playerStates,
      context.playerNames,
      context.playerTools,
      context.currentPlayerId,
      context.playerProfiles
    );
  }

  function getMarkerLabel(marker) {
    const labels = {
      suspect: "مشتبه به",
      low: "أقل شكاً"
    };

    return labels[marker] || "";
  }

  function formatToolNames(toolIds) {
    return toolIds.map(toolId => DetectiveTools.getTool(toolId).nameAr).join("، ") || "لا توجد";
  }

  return {
    init,
    bindLobbyActions,
    showScreen,
    setConnectionState,
    setHomeMessage,
    setCreateMessage,
    setJoinMessage,
    setLobbyMessage,
    setRolesMessage,
    setMurderMessage,
    setInvestigationMessage,
    setBusy,
    setCreateDefaults,
    setJoinDefaults,
    clearDiscussionInput,
    clearForensicHintInput,
    renderLobby,
    renderRoles,
    renderMurderSetup,
    renderInvestigation,
    renderEnd
  };
})();
