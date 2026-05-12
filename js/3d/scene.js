(function () {
  window.MB3D = window.MB3D || {};

  const Loaders = window.MB3D.Loaders;
  const Camera = window.MB3D.Camera;
  const Effects = window.MB3D.Effects;
  const Characters = window.MB3D.Characters;
  const Box = window.MB3D.Box;
  const Utils = window.MB.Utils;

  function normalizeRoom(room) {
    const box = new THREE.Box3().setFromObject(room);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxHorizontal = Math.max(size.x || 1, size.z || 1);
    const targetHorizontal = 5.8;
    const scale = targetHorizontal / maxHorizontal;
    room.scale.multiplyScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(room);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);
    room.position.x -= scaledCenter.x;
    room.position.z -= scaledCenter.z;
    room.position.y -= scaledBox.min.y;
  }

  function createGameScene(canvas) {
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    Effects.configureRenderer(renderer);
    Effects.addAtmosphere(scene);

    const camera = Camera.createCamera();
    const clock = new THREE.Clock();
    const box = Box.createMysteryBox(scene);
    const errorPanel = document.getElementById("assetErrorPanel");
    const shownErrors = {};
    function reportAssetError(path, message) {
      if (shownErrors[path]) return;
      shownErrors[path] = true;
      if (!errorPanel) return;
      errorPanel.hidden = false;
      const line = document.createElement("div");
      line.innerHTML = "<strong>تعذر تحميل ملف ثلاثي الأبعاد:</strong> <code>" + path + "</code>";
      if (message) line.title = message;
      errorPanel.appendChild(line);
    }

    const characters = Characters.createCharacterManager(scene, reportAssetError);
    let disposed = false;
    let lastSeat = "spectator";

    Loaders.loadGLB("assets/models/interrogation_room.glb", reportAssetError).then(function (gltf) {
      if (!gltf || disposed) return;
      const room = gltf.scene;
      normalizeRoom(room);
      Effects.optimizeObject(room);
      scene.add(room);
    });

    function updateSeat(match) {
      const myId = Utils.getPlayerId();
      let seat = "spectator";
      if (match && match.playerA === myId) seat = "playerA";
      if (match && match.playerB === myId) seat = "playerB";
      if (seat !== lastSeat) {
        lastSeat = seat;
        Camera.setCameraSeat(camera, seat);
      }
    }

    function updateMatch(room, match) {
      updateSeat(match);
      if (!room || !match || !room.players) {
        characters.setPlayers([]);
        return;
      }
      characters.setPlayers([
        room.players[match.playerA],
        room.players[match.playerB]
      ]);
    }

    function animate() {
      if (disposed) return;
      requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      characters.update(delta);
      box.update(delta);
      renderer.render(scene, camera);
    }

    function onResize() {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      Camera.resizeCamera(camera, renderer);
    }

    window.addEventListener("resize", onResize);
    animate();

    return {
      scene,
      renderer,
      camera,
      setBoxOpen: box.setOpen,
      updateMatch,
      cleanup: function () {
        disposed = true;
        window.removeEventListener("resize", onResize);
        characters.clear();
        renderer.dispose();
      }
    };
  }

  window.MB3D.Scene = {
    createGameScene
  };
})();
