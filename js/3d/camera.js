(function () {
  window.MB3D = window.MB3D || {};

  function createCamera() {
    const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 140);
    setCameraSeat(camera, "spectator");
    return camera;
  }

  function setCameraSeat(camera, seat) {
    if (!camera) return;
    const presets = {
      playerA: {
        position: new THREE.Vector3(0.85, 1.45, 2.45),
        target: new THREE.Vector3(0, 1.08, 0)
      },
      playerB: {
        position: new THREE.Vector3(-0.85, 1.45, -2.45),
        target: new THREE.Vector3(0, 1.08, 0)
      },
      spectator: {
        position: new THREE.Vector3(2.55, 1.9, 3.35),
        target: new THREE.Vector3(0, 1.02, 0)
      }
    };
    const preset = presets[seat] || presets.spectator;
    camera.position.copy(preset.position);
    camera.lookAt(preset.target);
  }

  function resizeCamera(camera, renderer) {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  window.MB3D.Camera = {
    createCamera,
    setCameraSeat,
    resizeCamera
  };
})();
