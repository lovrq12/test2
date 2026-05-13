// js/3d/scene.js — مشهد Three.js الرئيسي

const Scene3D = (() => {

  let renderer, scene, camera, clock, animFrame;
  let animMixers = [];
  let isInitialized = false;

  const DEBUG_3D = false; // تفعيل للتطوير

  /** تهيئة المشهد */
  function init(canvasId) {
    if (isInitialized) return;

    const canvas = document.getElementById(canvasId);
    if (!canvas) { console.error('[Scene3D] Canvas not found:', canvasId); return; }

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled  = true;
    renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
    renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.outputColorSpace   = THREE.SRGBColorSpace;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x0a0505, 0.045);

    // Camera — سينمائية ثابتة
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 60);
    camera.position.set(0, 1.7, 3.8);
    camera.lookAt(0, 1.0, 0);

    // Clock
    clock = new THREE.Clock();

    // OrbitControls — للتطوير فقط
    if (DEBUG_3D && typeof THREE.OrbitControls !== 'undefined') {
      const controls = new THREE.OrbitControls(camera, canvas);
      controls.target.set(0, 1, 0);
      controls.update();
    }

    // إضاءة سينمائية
    _setupLighting();

    // Resize
    window.addEventListener('resize', _onResize);

    isInitialized = true;
    return { scene, camera, renderer };
  }

  /** إضاءة سينمائية داكنة */
  function _setupLighting() {
    // Ambient خافت جدًا
    const ambient = new THREE.AmbientLight(0x1a0a0a, 0.4);
    scene.add(ambient);

    // ضوء رئيسي — مثل مصباح استجواب
    const mainLight = new THREE.SpotLight(0xfff5e0, 3.5, 12, Math.PI / 5, 0.35, 2);
    mainLight.position.set(0, 4.5, 0.5);
    mainLight.target.position.set(0, 0, 0);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(1024, 1024);
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far  = 15;
    scene.add(mainLight);
    scene.add(mainLight.target);

    // ضوء حمراء خفيف من الجانب
    const rimLight = new THREE.PointLight(0x8b0000, 1.2, 6);
    rimLight.position.set(-2.5, 2, -1);
    scene.add(rimLight);

    // ضوء أزرق بارد خفيف
    const coolLight = new THREE.PointLight(0x0a1a3a, 0.8, 5);
    coolLight.position.set(2.5, 1.5, 1.5);
    scene.add(coolLight);

    // ضوء الطاولة — يضيء الصندوق
    const tableLight = new THREE.PointLight(0xffd070, 0.6, 2);
    tableLight.position.set(0, 1.2, 0);
    scene.add(tableLight);
  }

  /** هل نحن على file:// (بدون سيرفر)؟ */
  function _isFileProtocol() {
    return window.location.protocol === 'file:';
  }

  /** تحميل الغرفة GLB */
  function loadRoom(onLoaded, onError) {
    // إذا كان التشغيل محلياً بدون سيرفر، انتقل مباشرة للـ fallback
    if (_isFileProtocol()) {
      console.warn('[Scene3D] file:// detected — skipping GLB (CORS). Use a local server.');
      _buildFallbackRoom();
      if (onLoaded) onLoaded(null);
      return;
    }

    if (typeof THREE.GLTFLoader === 'undefined') {
      console.warn('[Scene3D] GLTFLoader not found — using fallback room');
      _buildFallbackRoom();
      if (onLoaded) onLoaded(null);
      return;
    }

    const loader = new THREE.GLTFLoader();
    loader.load(
      'assets/models/interrogation_room.glb',
      gltf => {
        const model = gltf.scene;
        const box   = new THREE.Box3().setFromObject(model);
        const size  = box.getSize(new THREE.Vector3());
        const scale = 4 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(scale);

        box.setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.position.y = 0;

        model.traverse(child => {
          if (child.isMesh) {
            child.castShadow    = true;
            child.receiveShadow = true;
          }
        });

        scene.add(model);
        console.log('[Scene3D] Room loaded ✓');
        if (onLoaded) onLoaded(model);
      },
      xhr => { if (xhr.total) console.log(`[Scene3D] Room: ${Math.round(xhr.loaded / xhr.total * 100)}%`); },
      err => {
        console.warn('[Scene3D] GLB load failed — fallback room:', err.message || err);
        _buildFallbackRoom();
        if (onError) onError(err);
        if (onLoaded) onLoaded(null);
      }
    );
  }

  /** تحميل شخصية FBX */
  function loadCharacter(path, position, color, onLoaded) {
    // file:// أو loader غائب — placeholder مباشرة
    if (_isFileProtocol() || typeof THREE.FBXLoader === 'undefined') {
      console.warn('[Scene3D] Skipping FBX (file:// or no FBXLoader) — placeholder');
      const ph = _createCharacterPlaceholder(position, color);
      scene.add(ph);
      if (onLoaded) onLoaded(ph);
      return;
    }

    const loader = new THREE.FBXLoader();
    loader.load(
      path,
      fbx => {
        const box   = new THREE.Box3().setFromObject(fbx);
        const size  = box.getSize(new THREE.Vector3());
        const scale = 1.6 / size.y;
        fbx.scale.setScalar(scale);
        fbx.position.copy(position);

        fbx.traverse(child => {
          if (child.isMesh) {
            child.castShadow = child.receiveShadow = true;
            if (child.material) {
              try {
                child.material = child.material.clone();
                child.material.color.multiplyScalar(0.85);
              } catch(e) {}
            }
          }
        });

        if (fbx.animations?.length > 0) {
          const mixer = new THREE.AnimationMixer(fbx);
          mixer.clipAction(fbx.animations[0]).play();
          animMixers.push(mixer);
        }

        scene.add(fbx);
        console.log('[Scene3D] FBX loaded:', path);
        if (onLoaded) onLoaded(fbx);
      },
      null,
      err => {
        console.warn('[Scene3D] FBX failed — placeholder:', err.message || err);
        const ph = _createCharacterPlaceholder(position, color);
        scene.add(ph);
        if (onLoaded) onLoaded(ph);
      }
    );
  }

  /** غرفة بديلة مبسطة */
  function _buildFallbackRoom() {
    const mat = (color, roughness = 0.9) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 });

    // أرضية
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), mat(0x1a1510));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // جدران
    const wallB = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), mat(0x111111));
    wallB.position.set(0, 2.5, -4);
    scene.add(wallB);

    const wallL = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), mat(0x0f0f0f));
    wallL.position.set(-4, 2.5, 0);
    wallL.rotation.y = Math.PI / 2;
    scene.add(wallL);

    const wallR = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), mat(0x0f0f0f));
    wallR.position.set(4, 2.5, 0);
    wallR.rotation.y = -Math.PI / 2;
    scene.add(wallR);

    // سقف
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), mat(0x0a0a0a));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 5;
    scene.add(ceiling);

    // طاولة
    _buildTable();

    // كراسي
    _buildChair(new THREE.Vector3(-0.9, 0, 0.2));
    _buildChair(new THREE.Vector3(0.9, 0, -0.6), Math.PI);
  }

  function _buildTable() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.7, metalness: 0.1 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.8), mat);
    top.position.set(0, 0.75, 0);
    top.castShadow = top.receiveShadow = true;
    scene.add(top);

    // أرجل
    [[-0.6, 0.6], [0.6, 0.6], [-0.6, -0.3], [0.6, -0.3]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8), mat);
      leg.position.set(x, 0.375, z);
      scene.add(leg);
    });
  }

  function _buildChair(pos, rotY = 0) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.9 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.4), mat);
    seat.position.copy(pos);
    seat.position.y = 0.45;
    seat.rotation.y = rotY;
    scene.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.05), mat);
    back.position.copy(pos);
    back.position.y = 0.7;
    back.position.z += rotY === 0 ? -0.175 : 0.175;
    back.rotation.y = rotY;
    scene.add(back);
  }

  /** placeholder شخصية */
  function _createCharacterPlaceholder(position, color = 0x888888) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });

    // جسم
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.55, 8), mat);
    body.position.y = 0.9;
    group.add(body);

    // رأس
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), mat);
    head.position.y = 1.35;
    group.add(head);

    group.position.copy(position);
    group.castShadow = true;
    return group;
  }

  /** حلقة الرسم */
  function startRenderLoop() {
    function loop() {
      animFrame = requestAnimationFrame(loop);
      const delta = clock.getDelta();
      animMixers.forEach(m => m.update(delta));
      renderer.render(scene, camera);
    }
    loop();
  }

  function stopRenderLoop() {
    if (animFrame) cancelAnimationFrame(animFrame);
  }

  function _onResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /** نقل الكاميرا */
  function setCameraForPlayer(isPlayerA) {
    if (isPlayerA) {
      camera.position.set(-1.1, 1.65, 1.6);
      camera.lookAt(1.1, 1.2, -0.5);
    } else {
      camera.position.set(1.1, 1.65, 1.6);
      camera.lookAt(-1.1, 1.2, -0.5);
    }
  }

  function setCameraDefault() {
    camera.position.set(0, 2.2, 4.2);
    camera.lookAt(0, 1.0, 0);
  }

  return { init, loadRoom, loadCharacter, startRenderLoop, stopRenderLoop, setCameraForPlayer, setCameraDefault, get scene() { return scene; } };
})();
