// 3D-сцена юбилейного знака. Светлая сцена (не тёмная!) — под настоящий
// сайт ЭПК УрФУ: белый/светлый фон, оранжевый доминирует, синий — акцент.
// Если WebGL недоступен — скрываем канвас и показываем плоскую картинку
// (fallback в HTML), сайт не ломается ни на одном устройстве.
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

(function () {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return;

  let supportsWebGL = false;
  try {
    const test = document.createElement("canvas");
    supportsWebGL = !!(window.WebGLRenderingContext &&
      (test.getContext("webgl") || test.getContext("experimental-webgl")));
  } catch (e) { supportsWebGL = false; }
  if (!supportsWebGL) return;

  const fallback = document.querySelector(".hero-3d-fallback");
  if (fallback) fallback.style.display = "none"; // WebGL есть — статичная картинка не нужна

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.4, 7.2);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // Свет — мягкий, студийный, без тёмного фона
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(4, 6, 5);
  scene.add(key);
  const fillOrange = new THREE.PointLight(0xe8720c, 1.4, 20);
  fillOrange.position.set(-4, -1, 3);
  scene.add(fillOrange);
  const fillNavy = new THREE.PointLight(0x1f4e79, 0.8, 20);
  fillNavy.position.set(3, -2, -3);
  scene.add(fillNavy);

  const group = new THREE.Group();
  scene.add(group);

  // Внешнее кольцо — шестерня (эмблема ЭПК), металлик-навy
  const gearRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.65, 0.16, 32, 64),
    new THREE.MeshStandardMaterial({ color: 0x1f4e79, metalness: 0.55, roughness: 0.25 })
  );
  group.add(gearRing);

  // Зубцы шестерни — маленькие боксы по кругу
  const teeth = new THREE.Group();
  const toothGeo = new THREE.BoxGeometry(0.26, 0.34, 0.34);
  const toothMat = new THREE.MeshStandardMaterial({ color: 0x1f4e79, metalness: 0.5, roughness: 0.3 });
  const TEETH = 14;
  for (let i = 0; i < TEETH; i++) {
    const t = new THREE.Mesh(toothGeo, toothMat);
    const a = (i / TEETH) * Math.PI * 2;
    t.position.set(Math.cos(a) * 1.65, Math.sin(a) * 1.65, 0);
    t.rotation.z = a;
    teeth.add(t);
  }
  group.add(teeth);

  // Внутренний диск — оранжевый, со знаком «70»
  const discCanvas = document.createElement("canvas");
  discCanvas.width = 512; discCanvas.height = 512;
  const ctx = discCanvas.getContext("2d");
  ctx.fillStyle = "#E8720C";
  ctx.beginPath(); ctx.arc(256, 256, 256, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 190px Montserrat, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("70", 256, 240);
  ctx.font = "700 44px Montserrat, sans-serif";
  ctx.fillText("ЛЕТ", 256, 350);
  const discTex = new THREE.CanvasTexture(discCanvas);
  discTex.colorSpace = THREE.SRGBColorSpace;

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.28, 1.28, 0.22, 64),
    [
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ map: discTex, metalness: 0.15, roughness: 0.35 }),
      new THREE.MeshStandardMaterial({ map: discTex, metalness: 0.15, roughness: 0.35 }),
    ]
  );
  disc.rotation.x = Math.PI / 2;
  group.add(disc);

  // Декоративные дуги-«волны» — фирменный мотив с их сайта, орбитами вокруг знака
  for (let i = 0; i < 3; i++) {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(2.2 + i * 0.42, 0.014, 8, 96, Math.PI * 1.3),
      new THREE.MeshBasicMaterial({ color: 0xe8720c, transparent: true, opacity: 0.35 - i * 0.08 })
    );
    arc.rotation.x = Math.PI / 2.3;
    arc.rotation.z = i * 1.1;
    arc.userData.speed = 0.06 + i * 0.02;
    group.add(arc);
    arc.userData.isArc = true;
  }

  group.rotation.x = 0.15;

  let scrollT = 0;
  function onScroll() {
    const story = document.getElementById("story");
    if (!story) return;
    const rect = story.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;
    scrollT = progress;
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  let raf;
  const clock = new THREE.Clock();
  function animate() {
    raf = requestAnimationFrame(animate);
    const dt = clock.getDelta();
    group.rotation.y += dt * (0.28 + scrollT * 0.9);
    group.rotation.x = 0.15 + Math.sin(clock.elapsedTime * 0.3) * 0.05 + scrollT * 0.35;
    group.children.forEach((c) => {
      if (c.userData.isArc) c.rotation.z += dt * c.userData.speed;
    });
    camera.position.z = 7.2 - scrollT * 1.4;
    renderer.render(scene, camera);
  }
  animate();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else animate();
  });
})();
