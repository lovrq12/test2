// js/3d/characters.js — الشخصيات على الكراسي

const Characters3D = (() => {

  let _chars = { A: null, B: null };
  let _loadedCount = 0;

  /**
   * تحميل الشخصيتين وجلوسهما على المقاعد الصحيحة
   * Player A  → stoolSeat  (الكرسي المرتفع / الكنبة)
   * Player B  → chair1Seat (الكرسي المكتبي)
   */
  function loadBoth(scene, myRole, onReady) {
    _loadedCount = 0;
    const A = Scene3D.ANCHORS;

    function done() {
      _loadedCount++;
      if (_loadedCount >= 2 && onReady) onReady();
    }

    // Player A — stool side (positive Z, facing table)
    Scene3D.loadCharacter(
      'assets/characters/player01.fbx',
      A.stoolSeat,          // seat surface anchor — scene.js places feet on this
      0x9a8878,
      fbx => { _chars.A = fbx; done(); }
    );

    // Player B — office chair side (negative Z, facing table)
    Scene3D.loadCharacter(
      'assets/characters/player02.fbx',
      A.chair1Seat,
      0x788898,
      fbx => { _chars.B = fbx; done(); }
    );
  }

  /** تمييز اللاعب النشط بضوء خفيف */
  function highlightPlayer(role) {
    ['A', 'B'].forEach(key => {
      const char = _chars[key];
      if (!char) return;
      char.traverse(child => {
        if (!child.isMesh) return;
        const mats = Array.isArray(child.material)
          ? child.material
          : [child.material];
        mats.forEach(mat => {
          if (!mat) return;
          try {
            mat.emissive = mat.emissive || new THREE.Color(0, 0, 0);
            if (key === role) {
              mat.emissive.setHex(0x1a0800);
              mat.emissiveIntensity = 0.4;
            } else {
              mat.emissive.setHex(0x000000);
              mat.emissiveIntensity = 0;
            }
          } catch (e) {}
        });
      });
    });
  }

  function cleanup() {
    _chars = { A: null, B: null };
    _loadedCount = 0;
  }

  return { loadBoth, highlightPlayer, cleanup };
})();
