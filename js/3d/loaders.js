(function () {
  window.MB3D = window.MB3D || {};

  function assetLabel(kind, path) {
    return "[مستري بوكس 3D] " + kind + " asset: " + path;
  }

  function fail(kind, path, error, onError) {
    const message = "فشل تحميل الأصل ثلاثي الأبعاد: " + path;
    console.error(assetLabel("failed loading", path), error || "");
    if (onError) onError(path, message, error || null);
    return null;
  }

  function loadGLB(path) {
    const onError = arguments.length > 1 ? arguments[1] : null;
    return new Promise(function (resolve) {
      if (!window.THREE || !THREE.GLTFLoader) {
        fail("GLB", path, new Error("GLTFLoader غير متاح."), onError);
        resolve(null);
        return;
      }
      console.log(assetLabel("loading", path));
      const loader = new THREE.GLTFLoader();
      loader.load(path, function (gltf) {
        console.log(assetLabel("loaded", path));
        resolve(gltf);
      }, undefined, function (error) {
        fail("GLB", path, error, onError);
        resolve(null);
      });
    });
  }

  function loadFBX(path) {
    const onError = arguments.length > 1 ? arguments[1] : null;
    return new Promise(function (resolve) {
      if (!window.THREE || !THREE.FBXLoader) {
        fail("FBX", path, new Error("FBXLoader غير متاح."), onError);
        resolve(null);
        return;
      }
      console.log(assetLabel("loading", path));
      const loader = new THREE.FBXLoader();
      loader.load(path, function (object) {
        console.log(assetLabel("loaded", path));
        resolve(object);
      }, undefined, function (error) {
        fail("FBX", path, error, onError);
        resolve(null);
      });
    });
  }

  window.MB3D.Loaders = {
    loadGLB,
    loadFBX
  };
})();
