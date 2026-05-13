// js/3d/box.js — الصندوق الغامض

const MysteryBox3D = (() => {

  let boxGroup = null;
  let lid      = null;
  let glowLight = null;
  let isOpen   = false;

  /** بناء الصندوق على الطاولة */
  function build(scene, position = new THREE.Vector3(0, 0.79, -0.05)) {
    boxGroup = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color:     0x1a1010,
      roughness: 0.4,
      metalness: 0.5,
      envMapIntensity: 0.8
    });

    const edgeMat = new THREE.MeshStandardMaterial({
      color:     0x8b2010,
      roughness: 0.3,
      metalness: 0.8,
      emissive:  new THREE.Color(0x3a0a00),
      emissiveIntensity: 0.4
    });

    // جسم الصندوق
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.20), bodyMat);
    body.castShadow = body.receiveShadow = true;
    boxGroup.add(body);

    // حواف بالتفصيل
    _addEdges(boxGroup, edgeMat);

    // الغطاء
    lid = new THREE.Group();
    const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.06, 0.21), bodyMat);
    lidMesh.position.y = 0.03;
    lid.add(lidMesh);
    _addLidEdges(lid, edgeMat);
    lid.position.y = 0.12;
    boxGroup.add(lid);

    // نقطة تدوير الغطاء — من الخلف
    lid.position.z = 0;

    // ضوء خفيف يتسرب من الصندوق
    glowLight = new THREE.PointLight(0xff2200, 0, 0.8);
    glowLight.position.y = 0.1;
    boxGroup.add(glowLight);

    boxGroup.position.copy(position);
    scene.add(boxGroup);

    // نبضة خفيفة
    _startPulse();

    return boxGroup;
  }

  function _addEdges(group, mat) {
    const corners = [
      [-0.12, -0.09, -0.09], [0.12, -0.09, -0.09],
      [-0.12, -0.09,  0.09], [0.12, -0.09,  0.09],
      [-0.12,  0.09, -0.09], [0.12,  0.09, -0.09],
      [-0.12,  0.09,  0.09], [0.12,  0.09,  0.09],
    ];
    corners.forEach(([x, y, z]) => {
      const corner = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), mat);
      corner.position.set(x, y, z);
      group.add(corner);
    });
  }

  function _addLidEdges(group, mat) {
    const corners = [
      [-0.12, 0.06, -0.09], [0.12, 0.06, -0.09],
      [-0.12, 0.06,  0.09], [0.12, 0.06,  0.09],
    ];
    corners.forEach(([x, y, z]) => {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 6), mat);
      c.position.set(x, y, z);
      group.add(c);
    });
  }

  let _pulseDir = 1;
  let _pulseVal = 0;
  function _startPulse() {
    // نبضة خفيفة للصندوق عبر rotation.y
    function pulse() {
      if (!boxGroup || isOpen) return;
      _pulseVal += 0.008 * _pulseDir;
      if (_pulseVal > 1) _pulseDir = -1;
      if (_pulseVal < 0) _pulseDir = 1;
      boxGroup.rotation.y = _pulseVal * 0.03;
      requestAnimationFrame(pulse);
    }
    pulse();
  }

  /** فتح الصندوق بأنيميشن */
  function openBox(onDone) {
    if (isOpen || !lid) return;
    isOpen = true;

    // تضخيم الضوء أثناء الفتح
    if (glowLight) glowLight.intensity = 2;

    const duration = 1200; // ms
    const startTime = performance.now();
    const startY    = lid.position.y;  // 0.12
    const targetRot = -Math.PI * 0.85; // زاوية الفتح
    const startRot  = 0;

    // نقطة التدوير: خلف الصندوق
    lid.position.set(0, 0.12, -0.105);

    function animate(timestamp) {
      const elapsed = timestamp - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic

      lid.rotation.x = startRot + ease * targetRot;

      // ضوء يخفت تدريجيًا
      if (glowLight) glowLight.intensity = 2 * (1 - ease * 0.3);

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

  /** إعادة الصندوق لوضعه المغلق */
  function resetBox() {
    if (!lid) return;
    isOpen = false;
    lid.rotation.x  = 0;
    lid.position.set(0, 0.12, 0);
    if (glowLight) glowLight.intensity = 0;
  }

  /** تدمير الصندوق */
  function destroy(scene) {
    if (boxGroup && scene) scene.remove(boxGroup);
    boxGroup = lid = glowLight = null;
    isOpen = false;
  }

  return { build, openBox, resetBox, destroy };
})();
