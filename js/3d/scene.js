// js/3d/scene.js — مشهد Three.js — محسوب بدقة من فحص GLB

const Scene3D = (() => {

  let renderer, scene, camera, clock, animFrame;
  let animMixers = [];
  let isInitialized = false;
  let _debugHelpers = [];

  // ===================================================================
  // ANCHOR POINTS — محسوبة من قراءة GLB مباشرة بـ Python
  //
  // Room (Room_Shell_11):
  //   floor Y=0, ceiling Y=3, width=12.4, depth=8
  //   natural center X=2.202, Z=0
  //   → we shift model.position.x = -2.202 to center it
  //
  // After centering:
  //   Table top surface:      X=-2.202, Y=1.070, Z= 0.000
  //   Stool seat top:         X=-2.204, Y=1.093, Z=-0.053
  //   Office Chair 1 seat:    X=-2.113, Y=0.394, Z=-0.473
  //   Office Chair 2 seat:    X=-2.259, Y=0.394, Z=-0.470
  //   Pendant lights:         X=-2.2,   Y=2.650, Z= 0.000
  // ===================================================================
  const ANCHORS = {
    modelOffsetX: -2.202,

    floorY:   0.0,
    ceilingY: 3.0,

    // Table top surface center
    tableCenter: { x: -2.202, y: 1.070, z: 0.000 },

    // Stool (Seat_low) — one side of table
    stoolSeat:   { x: -2.204, y: 1.093, z: -0.053 },

    // Office chairs (rolling) — other side / same side offset
    chair1Seat:  { x: -2.113, y: 0.394, z: -0.473 },
    chair2Seat:  { x: -2.259, y: 0.394, z: -0.470 },

    // Pendant light positions (hang down from ceiling Y=3)
    light1: { x: -2.2, y: 2.65, z:  0.0 },
    light2: { x:  0.3, y: 2.65, z:  0.0 },
  };

  // set true while polishing scene, false for release
  const DEBUG_3D = true;

  // ===================================================================
  // INIT
  // ===================================================================
  function init(canvasId) {
    if (isInitialized) return;
    const canvas = document.getElementById(canvasId);
    if (!canvas) { console.error('[Scene3D] Canvas not found:', canvasId); return; }

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    // r128 uses outputEncoding
    if (renderer.outputEncoding !== undefined) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080808);
    // Fog starts at 8m so near objects are clear
    scene.fog = new THREE.Fog(0x0a0505, 9, 22);

    clock = new THREE.Clock();

    // Camera — perspective, 50° FOV
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 35);
    setCameraDefault();

    _setupLighting();
    if (DEBUG_3D) _addDebugHelpers();

    window.addEventListener('resize', _onResize);
    isInitialized = true;
    console.log('[Scene3D] Initialized ✓  anchors:', ANCHORS);
    return { scene, camera, renderer };
  }

  // ===================================================================
  // CINEMATIC LIGHTING
  // ===================================================================
  function _setupLighting() {
    // Low ambient — keeps scene from going pitch black
    scene.add(new THREE.AmbientLight(0x1c1208, 1.4));

    // Hemisphere — warm top, cool bottom
    scene.add(new THREE.HemisphereLight(0x2a1a08, 0x050814, 0.55));

    // Main interrogation lamp — directly above table
    const mainSpot = new THREE.SpotLight(0xfff2c8, 5.0, 11, Math.PI / 6.5, 0.22, 1.4);
    mainSpot.position.set(ANCHORS.light1.x, ANCHORS.light1.y, ANCHORS.light1.z);
    mainSpot.target.position.set(ANCHORS.tableCenter.x, ANCHORS.floorY, ANCHORS.tableCenter.z);
    mainSpot.castShadow = true;
    mainSpot.shadow.mapSize.set(1024, 1024);
    mainSpot.shadow.camera.near = 0.5;
    mainSpot.shadow.camera.far  = 12;
    mainSpot.shadow.bias = -0.003;
    scene.add(mainSpot);
    scene.add(mainSpot.target);

    // Secondary lamp — softer fill on far side
    const fill = new THREE.SpotLight(0xfff0c0, 2.2, 9, Math.PI / 8, 0.40, 2.0);
    fill.position.set(ANCHORS.light2.x, ANCHORS.light2.y, ANCHORS.light2.z);
    fill.target.position.set(ANCHORS.tableCenter.x + 1.5, 0, ANCHORS.tableCenter.z);
    scene.add(fill);
    scene.add(fill.target);

    // Red rim — behind player B, creates tension
    const rimR = new THREE.PointLight(0x7a0a0a, 3.0, 5.5);
    rimR.position.set(ANCHORS.tableCenter.x - 1.5, 1.9, ANCHORS.tableCenter.z - 3.0);
    scene.add(rimR);

    // Cool blue fill from opposite corner
    const rimB = new THREE.PointLight(0x08081e, 1.8, 4.5);
    rimB.position.set(ANCHORS.tableCenter.x + 2.2, 1.6, ANCHORS.tableCenter.z + 2.0);
    scene.add(rimB);

    // Tiny table glow — illuminates the box
    const tbl = new THREE.PointLight(0xffcc44, 1.4, 1.6);
    tbl.position.set(ANCHORS.tableCenter.x, ANCHORS.tableCenter.y + 0.25, ANCHORS.tableCenter.z);
    scene.add(tbl);
  }

  // ===================================================================
  // DEBUG HELPERS
  // ===================================================================
  function _addDebugHelpers() {
    // World axes at origin
    const axes = new THREE.AxesHelper(1.5);
    scene.add(axes); _debugHelpers.push(axes);

    // Floor grid
    const grid = new THREE.GridHelper(20, 40, 0x333333, 0x1a1a1a);
    grid.position.y = ANCHORS.floorY + 0.001;
    scene.add(grid); _debugHelpers.push(grid);

    // Anchor spheres
    const mkSph = (pos, col, r = 0.09) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(r, 8, 8),
        new THREE.MeshBasicMaterial({ color: col, depthTest: false, transparent: true, opacity: 0.9 })
      );
      m.position.set(pos.x, pos.y, pos.z);
      scene.add(m); _debugHelpers.push(m);
    };
    mkSph(ANCHORS.tableCenter, 0xffff00, 0.11);  // yellow — table top
    mkSph(ANCHORS.stoolSeat,   0x00ff44, 0.09);  // green  — stool seat
    mkSph(ANCHORS.chair1Seat,  0x00ccff, 0.09);  // cyan   — chair 1
    mkSph(ANCHORS.chair2Seat,  0xff8800, 0.09);  // orange — chair 2
    mkSph(ANCHORS.light1,      0xffffff, 0.07);  // white  — light 1
    mkSph(ANCHORS.light2,      0xffffff, 0.07);  // white  — light 2

    // Camera look-at target
    const camTgt = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true })
    );
    camTgt.position.set(ANCHORS.tableCenter.x, ANCHORS.tableCenter.y + 0.3, ANCHORS.tableCenter.z);
    scene.add(camTgt); _debugHelpers.push(camTgt);

    console.log('[Scene3D] Debug helpers active — yellow=table, green=stool, cyan=chair1, orange=chair2');
  }

  function removeDebugHelpers() {
    _debugHelpers.forEach(h => scene.remove(h));
    _debugHelpers = [];
    console.log('[Scene3D] Debug helpers removed');
  }

  // ===================================================================
  // LOAD ROOM GLB
  // ===================================================================
  function _isFile() { return window.location.protocol === 'file:'; }

  function loadRoom(onLoaded, onError) {
    if (_isFile()) {
      console.warn('[Scene3D] file:// — GLB blocked by CORS, using fallback');
      _buildFallbackRoom();
      if (onLoaded) onLoaded(null);
      return;
    }
    if (typeof THREE.GLTFLoader === 'undefined') {
      console.warn('[Scene3D] GLTFLoader not loaded');
      _buildFallbackRoom();
      if (onLoaded) onLoaded(null);
      return;
    }

    new THREE.GLTFLoader().load(
      'assets/models/interrogation_room.glb',
      gltf => {
        const model = gltf.scene;

        // Keep native GLB scale (1 unit ≈ 1 metre, room is ~12m × 3m × 8m)
        model.scale.setScalar(1.0);

        // Shift along X to centre the room (room X centre = 2.202)
        model.position.set(ANCHORS.modelOffsetX, 0, 0);

        // Shadow + detect/hide rogue meshes
        model.traverse(child => {
          if (!child.isMesh) return;
          child.castShadow    = true;
          child.receiveShadow = true;

          // Hide any mesh whose centre is above ceiling
          const bbox = new THREE.Box3().setFromObject(child);
          const cy   = (bbox.min.y + bbox.max.y) * 0.5;
          if (cy > ANCHORS.ceilingY + 0.5) {
            console.warn(`[Scene3D] Hiding above-ceiling mesh: "${child.name}"  centerY=${cy.toFixed(2)}`);
            child.visible = false;
            return;
          }

          // Hide suspiciously blue-ish unlit helper materials
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => {
            if (!mat || !mat.color) return;
            const { r, g, b } = mat.color;
            // pure saturated blue above half-ceiling
            if (r < 0.18 && g < 0.28 && b > 0.65 && cy > ANCHORS.ceilingY * 0.6) {
              console.warn(`[Scene3D] Hiding blue debug mesh: "${child.name}"  centerY=${cy.toFixed(2)}`);
              child.visible = false;
            }
          });
        });

        scene.add(model);
        console.log('[Scene3D] Room GLB loaded ✓');
        if (DEBUG_3D) {
          const b = new THREE.Box3().setFromObject(model);
          console.log('[Scene3D] Room bbox min:', b.min.toArray().map(v=>+v.toFixed(2)),
                                      'max:', b.max.toArray().map(v=>+v.toFixed(2)));
        }
        if (onLoaded) onLoaded(model);
      },
      xhr => { if (xhr.total) console.log(`[Scene3D] Room ${Math.round(xhr.loaded/xhr.total*100)}%`); },
      err => {
        console.warn('[Scene3D] GLB error — fallback:', err.message || err);
        _buildFallbackRoom();
        if (onError) onError(err);
        if (onLoaded) onLoaded(null);
      }
    );
  }

  // ===================================================================
  // LOAD FBX CHARACTER
  // ===================================================================
  function loadCharacter(path, seatAnchor, color, onLoaded) {
    if (_isFile() || typeof THREE.FBXLoader === 'undefined') {
      const ph = _mkPlaceholder(seatAnchor, color);
      scene.add(ph);
      if (onLoaded) onLoaded(ph);
      return;
    }

    new THREE.FBXLoader().load(
      path,
      fbx => {
        // Scale to seated height ~1.0m (sitting character is about 0.9–1.1m)
        const bbox = new THREE.Box3().setFromObject(fbx);
        const h    = bbox.getSize(new THREE.Vector3()).y;
        const scale = 1.0 / h;
        fbx.scale.setScalar(scale);

        // After scaling, recompute bbox to find foot position
        const b2   = new THREE.Box3().setFromObject(fbx);
        const footY = b2.min.y;  // lowest point of character

        // Place character so their lowest point sits on the seat surface
        fbx.position.set(
          seatAnchor.x,
          seatAnchor.y - footY,   // lift/lower so feet rest on seat
          seatAnchor.z
        );

        // Face the table
        const look = new THREE.Vector3(ANCHORS.tableCenter.x, seatAnchor.y, ANCHORS.tableCenter.z);
        fbx.lookAt(look);

        fbx.traverse(child => {
          if (!child.isMesh) return;
          child.castShadow = child.receiveShadow = true;
        });

        if (fbx.animations?.length) {
          const mixer = new THREE.AnimationMixer(fbx);
          mixer.clipAction(fbx.animations[0]).play();
          animMixers.push(mixer);
        }

        scene.add(fbx);
        const fb = new THREE.Box3().setFromObject(fbx);
        console.log(`[Scene3D] FBX "${path}" pos=(${fbx.position.x.toFixed(2)},${fbx.position.y.toFixed(2)},${fbx.position.z.toFixed(2)}) bboxY=${fb.min.y.toFixed(2)}..${fb.max.y.toFixed(2)}`);
        if (onLoaded) onLoaded(fbx);
      },
      null,
      err => {
        console.warn('[Scene3D] FBX failed:', err.message || err, '— placeholder');
        const ph = _mkPlaceholder(seatAnchor, color);
        scene.add(ph);
        if (onLoaded) onLoaded(ph);
      }
    );
  }

  // ===================================================================
  // FALLBACK ROOM (procedural)
  // ===================================================================
  function _buildFallbackRoom() {
    const mat = (c, r = 0.88) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.06 });
    const cx = ANCHORS.modelOffsetX;  // -2.202

    // Floor
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(13, 8.5), mat(0x1a1510));
    fl.rotation.x = -Math.PI / 2;
    fl.position.set(cx, 0, 0);
    fl.receiveShadow = true;
    scene.add(fl);

    // Walls
    const wB = new THREE.Mesh(new THREE.PlaneGeometry(13, 3), mat(0x111111));
    wB.position.set(cx, 1.5, -4); scene.add(wB);

    const wL = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 3), mat(0x0e0e0e));
    wL.rotation.y = Math.PI/2; wL.position.set(cx-6.2, 1.5, 0); scene.add(wL);

    const wR = wL.clone(); wR.rotation.y = -Math.PI/2;
    wR.position.set(cx+6.2, 1.5, 0); scene.add(wR);

    // Ceiling
    const ce = new THREE.Mesh(new THREE.PlaneGeometry(13, 8.5), mat(0x080808));
    ce.rotation.x = Math.PI/2; ce.position.set(cx, 3, 0); scene.add(ce);

    // Table
    const tc = ANCHORS.tableCenter;
    const tm = mat(0x3d2512, 0.65);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 1.2), tm);
    top.position.set(tc.x, tc.y - 0.03, tc.z);
    top.castShadow = top.receiveShadow = true; scene.add(top);
    [[-1.0,-0.5],[1.0,-0.5],[-1.0,0.5],[1.0,0.5]].forEach(([dx,dz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,tc.y,8), tm);
      leg.position.set(tc.x+dx, tc.y/2, tc.z+dz);
      leg.castShadow = true; scene.add(leg);
    });

    // Stools
    const smAt = (a, ry) => {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.20,0.08,12), mat(0x2a1a10,0.85));
      st.position.set(a.x, a.y-0.04, a.z); scene.add(st);
      const le = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,a.y,8), mat(0x1a1010,0.9));
      le.position.set(a.x, a.y/2, a.z); scene.add(le);
    };
    smAt(ANCHORS.stoolSeat);
    smAt(ANCHORS.chair1Seat);
  }

  // ===================================================================
  // PLACEHOLDER CHARACTER
  // ===================================================================
  function _mkPlaceholder(anchor, color) {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    // torso
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.12,0.44,8), m);
    t.position.y = 0.22; g.add(t);
    // head
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.14,10,10), m);
    h.position.y = 0.58; g.add(h);
    // lap (thighs forward)
    const lap = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.42,8), m);
    lap.rotation.x = Math.PI/2; lap.position.set(0, 0.02, 0.22); g.add(lap);

    g.position.set(anchor.x, anchor.y, anchor.z);
    // face toward table
    g.lookAt(ANCHORS.tableCenter.x, anchor.y, ANCHORS.tableCenter.z);
    return g;
  }

  // ===================================================================
  // CAMERA PRESETS — precise positions derived from anchor data
  // ===================================================================
  function setCameraDefault() {
    // Spectator: slightly elevated, looking at table centre
    camera.position.set(-2.2, 2.5, 5.2);
    camera.lookAt(-2.2, 1.07, 0.0);
  }

  function setCameraForPlayer(isPlayerA) {
    if (isPlayerA) {
      // Behind stool (positive Z side), looking toward chair (negative Z)
      camera.position.set(-2.2, 2.4, 3.2);
      camera.lookAt(-2.18, 1.15, -1.0);
    } else {
      // Behind chair (negative Z), looking toward stool (positive Z)
      camera.position.set(-2.15, 1.60, -3.0);
      camera.lookAt(-2.2, 1.12, 0.6);
    }
  }

  // ===================================================================
  // RENDER LOOP
  // ===================================================================
  function startRenderLoop() {
    function loop() {
      animFrame = requestAnimationFrame(loop);
      animMixers.forEach(m => m.update(clock.getDelta()));
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

  return {
    init, loadRoom, loadCharacter,
    startRenderLoop, stopRenderLoop,
    setCameraForPlayer, setCameraDefault,
    removeDebugHelpers,
    get scene()   { return scene;   },
    get camera()  { return camera;  },
    ANCHORS
  };

})();
