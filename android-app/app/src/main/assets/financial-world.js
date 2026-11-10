import {
  TextureLoader,
  Scene,
  Vector3,
  PerspectiveCamera,
  WebGLRenderer,
  ACESFilmicToneMapping,
  SRGBColorSpace,
  Group,
  Box3,
  MathUtils,
  AmbientLight,
  DirectionalLight,
  PointLight,
  GLTFLoader,
  OrbitControls,
  RoomEnvironment,
  PMREMGenerator,
} from "./vendor/financial-scene-three.js";

// A single continuous scene, with no household records or identifiers in the GPU.
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const poses = {
  inicio: { x: 1.15, y: 1.12, turn: -0.18, orbit: 0 },
  recursos: { x: 1.25, y: 1.25, turn: -0.48, orbit: 1.3 },
  planos: { x: 1.35, y: 1.32, turn: 0.12, orbit: 2.6 },
  acesso: { x: -1.1, y: 1.12, turn: -0.3, orbit: 3.8 },
};
let renderer,
  scene,
  camera,
  controls,
  character,
  props,
  stars,
  modelPromise,
  frame = 0,
  last = 0,
  dialog = null,
  inlineHost = null,
  view = "inicio",
  visible = false,
  editing = false,
  enabled = true,
  failed = false;
let pointer = { x: 0, y: 0 },
  scrollProgress = 0;
try {
  enabled = localStorage.getItem("cf_android_screen_motion") !== "off";
} catch (_) {}

function resize() {
  if (!renderer) return;
  const host = dialog?.querySelector(".cf-model-stage") || (inlineHost?.isConnected ? inlineHost : null),
    width = host ? host.clientWidth : innerWidth,
    height = host ? host.clientHeight : innerHeight;
  if (!width || !height) return;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2.5));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  draw(performance.now(), true);
}
function initialize() {
  if (failed) return Promise.reject(new Error("WebGL unavailable"));
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    try {
      renderer = new WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.9;
      renderer.domElement.className = "cf-world-canvas";
      renderer.domElement.setAttribute("aria-hidden", "true");
      document.body.prepend(renderer.domElement);
      scene = new Scene();
      const pmrem = new PMREMGenerator(renderer),
        room = new RoomEnvironment();
      scene.environment = pmrem.fromScene(room, 0.04).texture;
      room.dispose();
      pmrem.dispose();
      scene.environmentIntensity = 0.55;
      camera = new PerspectiveCamera(38, 1, 0.1, 30);
      camera.position.set(0.1, 1, 5.3);
      camera.lookAt(0, 1, 0);
      scene.add(new AmbientLight(0xf4e6cf, 0.8));
      const key = new DirectionalLight(0xffe7c5, 2.2);
      key.position.set(3, 5, 5);
      scene.add(key);
      const rim = new DirectionalLight(0xb1d2bc, 2.8);
      rim.position.set(-3, 2, -2);
      scene.add(rim);
      const fill = new PointLight(0xf1d29a, 7, 12);
      fill.position.set(-2, 2, 3);
      scene.add(fill);
      character = new Group();
      scene.add(character);
      props = new Group();
      scene.add(props);
      // Keep the presentation focused on the character; no abstract floating props.
      stars = new Group();
      controls = new OrbitControls(camera, renderer.domElement);
      controls.addEventListener('change',()=>{if(renderer && (dialog || visible)) renderer.render(scene,camera);});
      controls.enabled = false;
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.minDistance = 2.2;
      controls.maxDistance = 7;
      renderer.domElement.dataset.stage = "loading-model";
      const loader = new GLTFLoader().register((parser) => ({
        name: "CF_ANDROID_IMAGE_LOADER",
        beforeRoot() {
          renderer.domElement.dataset.stage = "parsing";
          parser.textureLoader = new TextureLoader(parser.options.manager);
        },
      }));
      let loadingTimer;
      const gltf = await Promise.race([
        loader.loadAsync("tamandua-authored-3d.glb", (event) => {
          renderer.domElement.dataset.loaded = String(event.loaded);
        }),
        new Promise((_, reject) => {
          loadingTimer = setTimeout(
            () => reject(new Error("Model loading timed out")),
            20000,
          );
        }),
      ]).finally(() => {
        clearTimeout(loadingTimer);
      });
      renderer.domElement.dataset.stage = "ready";
      const model = gltf.scene;
      const box = new Box3().setFromObject(model),
        center = box.getCenter(new Vector3()),
        height = box.getSize(new Vector3()).y;
      model.position.sub(center);
      const scale = new Group();
      scale.scale.setScalar(1.8 / height);
      scale.add(model);
      character.add(scale);
      character.position.set(0.45, 1.12, 0);
      document.documentElement.classList.add("cf-world-ready");
      resize();
      sync();
      return true;
    } catch (error) {
      console.warn("Android 3D asset unavailable:", error.message);
      failed = true;
      renderer?.dispose();
      renderer?.domElement.remove();
      document.documentElement.classList.add("cf-world-unavailable");
      throw error;
    }
  })();
  return modelPromise;
}
function draw(now, force = false) {
  frame = 0;
  if (!renderer || failed || document.visibilityState !== "visible") return;
  const moving = enabled && !reduced.matches && !editing;
  if (force || now - last >= 32) {
    const dt = Math.min(0.08, Math.max(0.001, (now - last) / 1000));
    last = now;
    if (dialog || (inlineHost?.isConnected && visible)) {
      controls.update();
    } else {
      const pose = poses[view] || poses.inicio;
      const damp = moving ? 9 : 1000;
      const phone = innerWidth <= 760;
      props.scale.setScalar(phone ? 0.65 : 1);
      props.position.x = phone ? 1.15 : 0;
      props.visible = scrollY < innerHeight * 0.65;
      character.scale.setScalar(phone ? 0.9 : 1);
      if (!moving) {
        character.position.set(phone ? 0 : pose.x, phone ? 0.55 : pose.y, 0);
        character.rotation.y = pose.turn;
        props.rotation.y = pose.orbit;
      }
      character.position.x = MathUtils.damp(
        character.position.x,
        phone ? 0 : pose.x,
        damp,
        dt,
      );
      character.position.y = MathUtils.damp(
        character.position.y,
        (phone ? 0.55 : pose.y) +
          (moving ? Math.sin(now * 0.00065) * 0.018 : 0),
        damp,
        dt,
      );
      character.rotation.y = MathUtils.damp(
        character.rotation.y,
        pose.turn + (moving ? pointer.x * 0.09 + scrollProgress * 0.3 : 0),
        damp,
        dt,
      );
      props.rotation.y = MathUtils.damp(
        props.rotation.y,
        pose.orbit + scrollProgress * 0.8,
        damp,
        dt,
      );
      props.children.forEach((part, i) => {
        if (i < 3 && moving)
          part.rotation.z =
            Math.sin(now * 0.00032 + i * 0.9) * 0.05 + (i - 1) * 0.15;
      });
      camera.position.x = MathUtils.damp(
        camera.position.x,
        0.1 + (moving ? pointer.x * 0.075 : 0),
        6,
        dt,
      );
      camera.position.y = MathUtils.damp(
        camera.position.y,
        1 + (moving ? pointer.y * 0.04 : 0),
        6,
        dt,
      );
      camera.position.z = MathUtils.damp(camera.position.z, 5.3, 8, dt);
      camera.lookAt(0, 1, 0);
    }
    renderer.render(scene, camera);
  }
  if ((dialog || visible) && (moving || dialog) && !frame)
    frame = requestAnimationFrame(draw);
}
function sync() {
  const shell = document.querySelector(".landing-page");
  visible = !!inlineHost?.isConnected && !document.querySelector('dialog[open]:not(.cf-character-3d)') && inlineHost.getBoundingClientRect().bottom > 0 && inlineHost.getBoundingClientRect().top < innerHeight;
  if (inlineHost && !inlineHost.isConnected) { inlineHost = null; controls && (controls.enabled = false); }
  view = shell?.dataset.screen || "inicio";
  if (renderer) {
    renderer.domElement.style.display = visible || dialog ? "block" : "none";
    if (!frame && (visible || dialog)) draw(performance.now(), true);
  } else if (visible && !failed) initialize().catch(() => {});
}
export async function openCharacter() {
  if (dialog) return;
  dialog = document.createElement("dialog");
  dialog.className = "cf-character-3d";
  dialog.id = "cf-character-3d";
  dialog.innerHTML =
    '<header><div><h2>Seu Tamanduá, de perto</h2><p>Arraste para girar. Aproxime para conferir os detalhes.</p></div><form method="dialog"><button aria-label="Fechar personagem 3D">Fechar</button></form></header><div class="cf-model-stage"><p role="status">Preparando personagem…</p></div><p class="cf-model-caption">Modelo em acabamento para o teste interno.</p>';
  document.body.append(dialog);
  dialog.showModal();
  dialog.addEventListener("close", () => {
    const old = dialog;
    dialog = null;
    controls && (controls.enabled = false);
    if (renderer) {
      if(inlineHost?.isConnected) inlineHost.replaceChildren(renderer.domElement);
      else document.body.prepend(renderer.domElement);
      props.visible = true;
      stars.visible = true;
      camera.position.set(0.1, 1, 5.3);
      resize();
    }
    old.remove();
    if(inlineHost?.isConnected) prepareInline();
    sync();
  });
  try {
    await initialize();
    if (!dialog) return;
    dialog
      .querySelector(".cf-model-stage")
      .replaceChildren(renderer.domElement);
    props.visible = false;
    stars.visible = false;
    character.scale.setScalar(1);
    character.position.set(0, 0, 0);
    character.rotation.set(0, 0, 0);
    camera.position.set(2.2, 0.7, 3.8);
    controls.target.set(0, 0, 0);
    controls.enabled = true;
    controls.enableZoom = true;
    controls.update();
    resize();
    draw(performance.now(), true);
  } catch (_) {
    if (dialog)
      dialog.querySelector(".cf-model-stage").textContent =
        "Não foi possível abrir o 3D neste dispositivo. Você pode continuar usando o aplicativo.";
  }
}
function prepareInline() {
  if(!renderer || !inlineHost?.isConnected || dialog) return;
  inlineHost.replaceChildren(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden','false');
  renderer.domElement.setAttribute('aria-label','Tamanduá 3D interativo. Arraste para girar.');
  renderer.domElement.tabIndex=0;
  renderer.domElement.onkeydown=event=>{
    if(event.key==='ArrowLeft'||event.key==='ArrowRight') {event.preventDefault();character.rotation.y+=(event.key==='ArrowLeft'?-.2:.2);draw(performance.now(),true);}
  };
  props.visible=false;stars.visible=false;character.scale.setScalar(1);character.position.set(0,0,0);character.rotation.set(0,0,0);
  camera.position.set(1.6,.35,3.4);controls.target.set(0,0,0);controls.enabled=true;controls.enableZoom=false;controls.update();resize();sync();
}
export async function mountCharacter(host) {
  inlineHost=host;
  await initialize();
  if(inlineHost===host && host.isConnected) prepareInline();
}
new MutationObserver(sync).observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["data-screen", "open"],
});
addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    cancelAnimationFrame(frame);
    frame = 0;
  } else sync();
});
document.addEventListener("focusin", (e) => {
  editing = e.target.matches("input,textarea,select");
});
document.addEventListener("focusout", () => {
  editing = false;
  sync();
});
document.addEventListener(
  "pointermove",
  (e) => {
    pointer.x = (e.clientX / innerWidth - 0.5) * 2;
    pointer.y = (e.clientY / innerHeight - 0.5) * 2;
  },
  { passive: true },
);
addEventListener(
  "scroll",
  () => {
    scrollProgress = Math.min(
      1,
      Math.max(
        0,
        scrollY /
          Math.max(1, document.documentElement.scrollHeight - innerHeight),
      ),
    );
    if(inlineHost) sync();
  },
  { passive: true, capture: true },
);
document.addEventListener("click", (e) => {
  if (e.target.closest('[data-act="screenmotion"]')) {
    enabled = document.documentElement.dataset.screenMotion === "on";
    sync();
  }
});
reduced.addEventListener("change", sync);
sync();
