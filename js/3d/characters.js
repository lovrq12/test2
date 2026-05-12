(function () {
  window.MB3D = window.MB3D || {};

  const Loaders = window.MB3D.Loaders;
  const Effects = window.MB3D.Effects;
  const Utils = window.MB.Utils;

  function wrapNormalizedCharacter(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);

    const height = size.y || 1;
    const targetHeight = 1.28;
    const scale = targetHeight / height;
    object.scale.multiplyScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(object);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);
    object.position.x -= scaledCenter.x;
    object.position.z -= scaledCenter.z;
    object.position.y -= scaledBox.min.y;

    const wrapper = new THREE.Group();
    wrapper.add(object);
    return wrapper;
  }

  function prepareFBX(object) {
    object.traverse(function (node) {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        if (node.material) node.material.needsUpdate = true;
      }
    });
    Effects.optimizeObject(object);
    const wrapper = wrapNormalizedCharacter(object);

    let mixer = null;
    if (object.animations && object.animations.length) {
      mixer = new THREE.AnimationMixer(object);
      const action = mixer.clipAction(object.animations[0]);
      action.play();
    }
    return { object: wrapper, mixer };
  }

  function seatObject(entry, seat) {
    const object = entry.object;
    if (seat === "A") {
      object.position.set(-0.62, 0.02, 0.92);
      object.rotation.y = Math.PI;
    } else {
      object.position.set(0.62, 0.02, -0.92);
      object.rotation.y = 0;
    }
  }

  function createCharacterManager(scene, reportError) {
    let entries = [];
    let signature = "";

    function clear() {
      entries.forEach(function (entry) {
        scene.remove(entry.object);
      });
      entries = [];
      signature = "";
    }

    function loadOne(player, seat) {
      const skin = Utils.skinById(player && player.skinId);
      return Loaders.loadFBX(skin.asset, reportError).then(function (object) {
        if (!object) return false;
        const entry = prepareFBX(object);
        seatObject(entry, seat);
        scene.add(entry.object);
        entries.push(entry);
        return true;
      });
    }

    function setPlayers(players) {
      const nextSignature = players.map(function (player) {
        return player ? player.id + ":" + player.skinId : "empty";
      }).join("|");
      if (nextSignature === signature) return Promise.resolve(false);
      clear();
      signature = nextSignature;
      const tasks = [];
      if (players[0]) tasks.push(loadOne(players[0], "A"));
      if (players[1]) tasks.push(loadOne(players[1], "B"));
      return Promise.all(tasks).then(function () {
        return true;
      });
    }

    function update(delta) {
      entries.forEach(function (entry) {
        if (entry.mixer) entry.mixer.update(delta);
      });
    }

    return {
      setPlayers,
      update,
      clear
    };
  }

  window.MB3D.Characters = {
    createCharacterManager
  };
})();
