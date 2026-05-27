const DetectiveProfiles = (() => {
  const avatarEndpoint = "https://api.dicebear.com/9.x/adventurer-neutral/svg";
  const glowColors = {
    gold: "#c9a84c",
    blue: "#5b8fd9",
    green: "#4aa56f",
    red: "#b85b5b",
    violet: "#a86cff",
    cyan: "#28d7ff",
    amber: "#f0a635",
    steel: "#9aa6b8"
  };

  const profiles = [
    profile("noir_detective", "محقق نوير", "Noir", "assets/profiles/noir-detective.svg"),
    profile("private_eye", "عين خاصة", "Iris", "assets/profiles/private-eye.svg"),
    profile("raincoat_stranger", "غريب المطر", "Storm", "assets/profiles/raincoat-stranger.svg"),
    profile("masked_silhouette", "ظل مقنع", "Shade", "assets/profiles/masked-silhouette.svg"),
    profile("cyber_hacker", "هاكر ليلي", "Cipher", "assets/profiles/cyber-hacker.svg"),
    profile("forensic_analyst", "محلل جنائي", "Vale", "assets/profiles/forensic-analyst.svg"),
    profile("midnight_witness", "شاهد منتصف الليل", "Midnight", "assets/profiles/midnight-witness.svg"),
    profile("red_suspect", "مشتبه أحمر", "Crimson", "assets/profiles/red-suspect.svg")
  ];

  const byId = profiles.reduce((index, item) => {
    index[item.id] = item;
    return index;
  }, {});

  function profile(id, nameAr, avatarSeed, fallbackPath) {
    const imagePath = `${avatarEndpoint}?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=100c1d,2a1240`;
    return { id, nameAr, imagePath, fallbackPath };
  }

  function isPublicProfileImage(profileData) {
    return profileData?.imagePath?.startsWith(avatarEndpoint) &&
      profileData?.fallbackPath?.startsWith("assets/profiles/");
  }

  function getProfile(profileId) {
    const profileData = byId[profileId] || profiles[0];

    return isPublicProfileImage(profileData) ? profileData : profiles[0];
  }

  function getProfiles() {
    return profiles.filter(isPublicProfileImage);
  }

  function getGlowColor(glowId) {
    return glowColors[glowId] || glowColors.gold;
  }

  function normalizeProfile(input = {}) {
    const profileId = byId[input.profileId] ? input.profileId : profiles[0].id;
    const glowColor = glowColors[input.glowColor] ? input.glowColor : "gold";

    return {
      profileId,
      glowColor
    };
  }

  return {
    getProfile,
    getProfiles,
    getGlowColor,
    normalizeProfile,
    glowColors
  };
})();
