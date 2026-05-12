(function () {
  window.MB3D = window.MB3D || {};

  function configureRenderer(renderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  function addAtmosphere(scene) {
    scene.background = new THREE.Color(0x030405);
    scene.fog = new THREE.FogExp2(0x050608, 0.052);

    const ambient = new THREE.HemisphereLight(0x879bb0, 0x100b0b, 0.22);
    scene.add(ambient);

    const key = new THREE.SpotLight(0xe4eef6, 4.2, 12, Math.PI / 6, 0.48, 1.25);
    key.position.set(0.15, 4.9, 1.15);
    key.target.position.set(0, 0.8, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.00018;
    scene.add(key, key.target);

    const red = new THREE.PointLight(0x9e3430, 0.92, 5.4);
    red.position.set(-2.25, 1.35, 1.2);
    scene.add(red);

    const blue = new THREE.PointLight(0x4d78a8, 0.74, 5.2);
    blue.position.set(2.15, 1.25, -1.15);
    scene.add(blue);
  }

  function optimizeObject(root) {
    root.traverse(function (node) {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.material) {
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach(function (material) {
          material.side = THREE.FrontSide;
          material.needsUpdate = true;
        });
      }
    });
  }

  window.MB3D.Effects = {
    configureRenderer,
    addAtmosphere,
    optimizeObject
  };
})();
