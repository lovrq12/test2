// js/3d/box.js — الصندوق الغامض على الطاولة

const MysteryBox3D = (() => {

  let boxGroup = null;
  let lid = null;
  let glowLight = null;
  let isOpen = false;
  let _pulseRaf = null;

  /**
   * بناء الصندوق وتثبيته على سطح الطاولة
   * يستخدم ANCHORS.tableCenter من Scene3D
   */
  function build(scene) {
    const A  = Scene3D.ANCHORS;
    // وضع الصندوق فوق الطاولة مباشرة بـ 0.04 (نصف ارتفاع الجسم)
    const pos = new THREE.Vector3(A.tableCenter.x, A.tableCenter.y + 0.04, A.tableCenter.z);

    boxGroup = new THREE.Group();

    // المواد
    const bodyMat = new THREE.MeshStandardMaterial({
      color:     0x1a1010,
      roughness: 0.35,
      metalness: 0.55,
    });
    const edgeMat = new THREE.MeshStandardMaterial({
      color:            0x8b1a0a,
      roughness:        0.28,
      metalness:        0.80,
      emissive:         new THREE.Color(0x3a0800),
      emissiveIntensity: 0.45,
    });

    // ===== جسم الصندوق =====
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.20, 0.22), bodyMat);
    body.castShadow = body.receiveShadow = true;
    boxGroup.add(body);

    // زوايا الجسم
    _addCorners(boxGroup, edgeMat, 0.30, 0.20, 0.22);

    // ===== الغطاء =====
    lid = new THREE.Group();
    // mesh الغطاء — مرفوع 0.10 داخل مجموعة الغطاء
    const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, 0.24), bodyMat);
    lidMesh.position.y = 0.035;
    lid.add(lidMesh);
    _addCorners(lid, edgeMat, 0.32, 0.07, 0.24, 0.035);

    // نقطة تدوير الغطاء: الحافة الخلفية (Z سالب)
    lid.position.set(0, 0.135, 0);
    boxGroup.add(lid);

    // ===== ضوء المزامنة (يتسرب لما يُفتح) =====
    glowLight = new THREE.PointLight(0xff2200, 0, 0.9);
    boxGroup.add(glowLight);

    // وضع المجموعة على الطاولة
    boxGroup.position.copy(pos);
    scene.add(boxGroup);

    _startPulse();
    console.log('[Box3D] Built at', pos.toArray().map(v => v.toFixed(3)));
    return boxGroup;
  }

  function _addCorners(group, mat, W, H, D, yOff = 0) {
    const hw = W / 2, hh = H / 2, hd = D / 2;
    [
      [-hw, -hh + yOff, -hd], [hw, -hh + yOff, -hd],
      [-hw, -hh + yOff,  hd], [hw, -hh + yOff,  hd],
      [-hw,  hh + yOff, -hd], [hw,  hh + yOff, -hd],
      [-hw,  hh + yOff,  hd], [hw,  hh + yOff,  hd],
    ].forEach(([x, y, z]) => {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 6), mat);
      c.position.set(x, y, z);
      group.add(c);
    });
  }

  // نبضة هادئة للصندوق المغلق
  function _startPulse() {
    let t = 0;
    function pulse() {
      if (!boxGroup || isOpen) { _pulseRaf = requestAnimationFrame(pulse); return; }
      t += 0.012;
      boxGroup.rotation.y = Math.sin(t) * 0.025;
      _pulseRaf = requestAnimationFrame(pulse);
    }
    _pulseRaf = requestAnimationFrame(pulse);
  }

  /** فتح الغطاء بأنيميشن */
  function openBox(onDone) {
    if (isOpen || !lid) return;
    isOpen = true;

    if (glowLight) glowLight.intensity = 2.5;

    const duration = 1100;
    const start = performance.now();
    const targetRot = -Math.PI * 0.82;

    // نقطة التدوير: الحافة الخلفية للغطاء (Z سالب)
    lid.position.set(0, 0.135, -0.12);

    function animate(ts) {
      const t    = Math.min((ts - start) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOut
      lid.rotation.x = ease * targetRot;
      if (glowLight) glowLight.intensity = 2.5 * (1 - ease * 0.6);
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        lid.rotation.x = targetRot;
        if (glowLight) glowLight.intensity = 0;
        if (onDone) onDone();
      }
    }
    requestAnimationFrame(animate);
  }

  /** إعادة الصندوق لحالته المغلقة */
  function resetBox() {
    if (!lid) return;
    isOpen = false;
    lid.rotation.x = 0;
    lid.position.set(0, 0.135, 0);
    if (glowLight) glowLight.intensity = 0;
  }

  function destroy(scene) {
    if (_pulseRaf) cancelAnimationFrame(_pulseRaf);
    if (boxGroup && scene) scene.remove(boxGroup);
    boxGroup = lid = glowLight = null;
    isOpen = false;
  }

  return { build, openBox, resetBox, destroy };
})();
