// js/3d/characters.js — إدارة الشخصيات

const Characters3D = (() => {

  let _chars = {};

  /**
   * تحميل شخصيتين متواجهتين على الكراسي
   * @param {string} myRole - 'A' أو 'B'
   */
  function loadBoth(scene, myRole, onReady) {
    let loadedCount = 0;
    const total = 2;

    function onCharLoaded() {
      loadedCount++;
      if (loadedCount >= total && onReady) onReady();
    }

    // مواضع الكراسي — مواجهة بعضهما
    const posA = new THREE.Vector3(-0.85, 0, 0.3);
    const posB = new THREE.Vector3(0.85, 0, -0.55);

    Scene3D.loadCharacter(
      'assets/characters/player01.fbx',
      posA,
      0x8a7a6a,
      fbx => {
        if (fbx) {
          fbx.rotation.y = Math.PI * 0.15; // يواجه نحو المنتصف
          _chars['A'] = fbx;
        }
        onCharLoaded();
      }
    );

    Scene3D.loadCharacter(
      'assets/characters/player02.fbx',
      posB,
      0x6a7a8a,
      fbx => {
        if (fbx) {
          fbx.rotation.y = -Math.PI * 0.85; // يواجه الاتجاه المعاكس
          _chars['B'] = fbx;
        }
        onCharLoaded();
      }
    );
  }

  /** تمييز اللاعب النشط */
  function highlightPlayer(role) {
    Object.entries(_chars).forEach(([key, char]) => {
      if (!char) return;
      char.traverse(child => {
        if (child.isMesh && child.material) {
          try {
            const m = child.material;
            if (key === role) {
              m.emissive = new THREE.Color(0x1a0a00);
              m.emissiveIntensity = 0.3;
            } else {
              m.emissive = new THREE.Color(0x000000);
              m.emissiveIntensity = 0;
            }
          } catch (e) {}
        }
      });
    });
  }

  function cleanup() {
    _chars = {};
  }

  return { loadBoth, highlightPlayer, cleanup };
})();
