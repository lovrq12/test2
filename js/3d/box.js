(function () {
  window.MB3D = window.MB3D || {};

  function createMysteryBox(scene) {
    const group = new THREE.Group();
    group.position.set(0, 0.78, 0);

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.54,
      metalness: 0.35
    });
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0xd6aa57,
      emissive: 0x6d4311,
      emissiveIntensity: 0.2,
      roughness: 0.35,
      metalness: 0.55
    });

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.38, 0.82), darkMat);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.23, -0.36);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.08, 0.88), edgeMat);
    lid.position.set(0, 0, 0.36);
    lid.castShadow = true;
    lid.receiveShadow = true;
    lidPivot.add(lid);
    group.add(lidPivot);

    const glow = new THREE.PointLight(0xd6aa57, 0.25, 2.4);
    glow.position.set(0, 0.28, 0);
    group.add(glow);

    scene.add(group);

    let targetOpen = false;
    let pulse = 0;

    function setOpen(open) {
      targetOpen = !!open;
    }

    function update(delta) {
      const target = targetOpen ? -1.25 : 0;
      lidPivot.rotation.x += (target - lidPivot.rotation.x) * Math.min(1, delta * 4);
      pulse += delta;
      glow.intensity = (targetOpen ? 0.95 : 0.25) + Math.sin(pulse * 5) * 0.06;
    }

    return {
      group,
      setOpen,
      update
    };
  }

  window.MB3D.Box = {
    createMysteryBox
  };
})();
