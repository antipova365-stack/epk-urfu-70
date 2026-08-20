// Один сквозной 3D-слой на весь верх сайта (знак → ручка → термос), а не три
// разных сцены. Канвас зафиксирован на весь экран (position: fixed), сцена
// не пересобирается — объекты появляются/исчезают и камера скрабится по
// общему прогрессу скролла. Светлая сцена: белый/светлый фон сайта,
// оранжевый доминирует, синий — акцент, чёрного нет.
//
// Правки по разбору Опуса (20.08.2026):
// — было: знак «ребром» на первом экране, зеркальный текст «70» на торце
//   цилиндра, вращение по времени (dt), а не по скроллу, жёсткое
//   переключение кадров без сглаживания — читалось как слайды, не кино.
// — стало: сглаженный (lerp) скролл-прогресс двигает и камеру, и объекты;
//   диск «70 лет» — отдельный однослойный круг (CircleGeometry), а не торец
//   цилиндра — там и была зеркальная UV-развёртка; окружение (RoomEnvironment)
//   и ACES-тонмаппинг дают настоящие блики на металле вместо плоского пластика.
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const LOGO_SVG_URL = "img/logo-epk.svg";
const LOGO_PATH_IDS = ["_буква_у", "_малая_часть_оранжевая", "_большая_часть_синяя"];
const ORANGE = 0xe8720c;
const NAVY = 0x1f4e79;

(async function () {
  const canvas = document.getElementById("hero-canvas");
  const stageHost = document.getElementById("scene-host");
  if (!canvas || !stageHost) return;

  // На телефонах живая 3D-сцена со скролл-скрабом ненадёжна и сажает
  // батарею — там CSS показывает статичный знак, а этот код просто не
  // стартует (см. @media (max-width: 900px) в style.css).
  if (window.innerWidth < 900) return;

  let supportsWebGL = false;
  try {
    const test = document.createElement("canvas");
    supportsWebGL = !!(window.WebGLRenderingContext &&
      (test.getContext("webgl2") || test.getContext("webgl")));
  } catch (e) { supportsWebGL = false; }
  if (!supportsWebGL) return;

  document.querySelectorAll(".scene-fallback").forEach((el) => (el.style.display = "none"));
  stageHost.classList.add("scene-ready");

  const scene = new THREE.Scene();
  // EffectComposer теряет альфа-канал рендер-таргета — проще покрасить сцену
  // в белый явно, чем гонять полупрозрачность через bloom. Это тот же белый,
  // что и у остальной страницы, поэтому шва не видно.
  scene.background = new THREE.Color(0xffffff);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.2, 8.6);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.6, 0.86);
  composer.addPass(bloom);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  key.position.set(4, 6, 5);
  scene.add(key);
  const fillOrange = new THREE.PointLight(ORANGE, 1.6, 24);
  fillOrange.position.set(-4, -1, 4);
  scene.add(fillOrange);
  const fillNavy = new THREE.PointLight(NAVY, 1.0, 24);
  fillNavy.position.set(3, -2, -2);
  scene.add(fillNavy);

  // ---------- Диск «70 лет» — переиспользуется знаком и подписывается заново по месту ----------
  function make70Texture() {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#E8720C";
    ctx.beginPath(); ctx.arc(256, 256, 256, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "700 168px Montserrat, sans-serif";
    ctx.fillText("70", 256, 226);
    ctx.font = "700 42px Montserrat, sans-serif";
    ctx.fillText("ЛЕТ", 256, 322);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // ---------- Настоящий логотип: SVG → экструдированные 3D-контуры ----------
  async function buildBadge() {
    const svgText = await fetch(LOGO_SVG_URL).then((r) => r.text());
    const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
    const wanted = LOGO_PATH_IDS.map((id) => doc.getElementById(id)).filter(Boolean);
    if (wanted.length < 3) throw new Error("В SVG не нашлись id логотипа");

    const miniSvg = `<svg xmlns="http://www.w3.org/2000/svg">${wanted.map((el) => el.outerHTML).join("")}</svg>`;
    const data = new SVGLoader().parse(miniSvg);
    const COLOR_BY_ID = {
      "_буква_у": ORANGE,
      "_малая_часть_оранжевая": ORANGE,
      "_большая_часть_синяя": NAVY,
    };

    const badge = new THREE.Group();
    const box = new THREE.Box3();
    let gearBox = new THREE.Box3();

    data.paths.forEach((path) => {
      const id = path.userData.node.getAttribute("id");
      const color = COLOR_BY_ID[id] ?? NAVY;
      SVGLoader.createShapes(path).forEach((shape) => {
        const geo = new THREE.ExtrudeGeometry(shape, {
          depth: 13, bevelEnabled: true, bevelThickness: 2, bevelSize: 1.3, bevelSegments: 4,
        });
        const mat = id === "_большая_часть_синяя"
          ? new THREE.MeshPhysicalMaterial({ color, metalness: 0.75, roughness: 0.22, clearcoat: 0.4 })
          : new THREE.MeshPhysicalMaterial({ color, metalness: 0.2, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 });
        const mesh = new THREE.Mesh(geo, mat);
        badge.add(mesh);
        geo.computeBoundingBox();
        box.union(geo.boundingBox);
        if (id !== "_буква_у") gearBox.union(geo.boundingBox);
      });
    });

    const center = box.getCenter(new THREE.Vector3());
    badge.children.forEach((m) => m.position.sub(center));
    const size = box.getSize(new THREE.Vector3());
    const scale = 4.2 / size.x;
    badge.scale.set(scale, -scale, scale);

    const gearCenter = gearBox.getCenter(new THREE.Vector3()).sub(center);
    const gearSize = gearBox.getSize(new THREE.Vector3());
    const discR = (gearSize.x / 2) * 0.86 * scale;

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(discR, 64),
      new THREE.MeshStandardMaterial({ map: make70Texture(), metalness: 0.08, roughness: 0.45 })
    );
    disc.position.set(gearCenter.x * scale, -gearCenter.y * scale, 13 * scale + 0.02);
    badge.add(disc);

    // декоративные дуги — фирменный мотив "волн" с настоящего сайта ЭПК
    for (let i = 0; i < 3; i++) {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(2.9 + i * 0.5, 0.012, 8, 96, Math.PI * 1.3),
        new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.3 - i * 0.07 })
      );
      arc.rotation.x = Math.PI / 2.3;
      arc.rotation.z = i * 1.1;
      arc.userData.spin = 0.05 + i * 0.015;
      badge.add(arc);
    }

    return badge;
  }

  // ---------- Ручка и термос — настоящая 3D-геометрия (Lathe), не фото ----------
  function brandTexture({ base, label, sub }) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 1024;
    const ctx = c.getContext("2d");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, c.width, c.height);
    // тонкая инженерная линия — фирменный мотив с рендеров Анны
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 2;
    for (let y = 620; y < 980; y += 26) {
      ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(472, y); ctx.stroke();
    }
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.font = "700 92px Montserrat, sans-serif";
    ctx.fillText("У", 60, 260);
    ctx.font = "700 34px Montserrat, sans-serif";
    ctx.fillText(label, 60, 340);
    ctx.font = "500 22px Montserrat, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText(sub, 60, 380);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }

  function buildPen() {
    const pts = [
      new THREE.Vector2(0, 0), new THREE.Vector2(0.05, 0.02), new THREE.Vector2(0.16, 0.15),
      new THREE.Vector2(0.2, 0.9), new THREE.Vector2(0.2, 3.6), new THREE.Vector2(0.17, 3.7),
      new THREE.Vector2(0.17, 4.2), new THREE.Vector2(0.1, 4.35),
    ];
    const body = new THREE.Mesh(
      new THREE.LatheGeometry(pts, 48),
      new THREE.MeshPhysicalMaterial({
        map: brandTexture({ base: "#1F4E79", label: "70 ЛЕТ", sub: "ЭПК УрФУ" }),
        metalness: 0.55, roughness: 0.3, clearcoat: 0.5,
      })
    );
    const clip = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 1.1, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xcfd6dd, metalness: 0.9, roughness: 0.25 })
    );
    clip.position.set(0.2, 3.0, 0);
    const group = new THREE.Group();
    group.add(body, clip);
    group.rotation.z = Math.PI / 2.1;
    group.position.y = -0.2;
    const s = 1.55;
    group.scale.set(s, s, s);
    return group;
  }

  function buildThermos() {
    const pts = [
      new THREE.Vector2(0, 0), new THREE.Vector2(0.62, 0), new THREE.Vector2(0.62, 0.18),
      new THREE.Vector2(0.58, 0.22), new THREE.Vector2(0.58, 2.9), new THREE.Vector2(0.5, 3.15),
      new THREE.Vector2(0.5, 3.45), new THREE.Vector2(0.3, 3.6), new THREE.Vector2(0.3, 3.9),
      new THREE.Vector2(0.34, 3.95), new THREE.Vector2(0.34, 4.05), new THREE.Vector2(0.28, 4.1),
      new THREE.Vector2(0, 4.1),
    ];
    const body = new THREE.Mesh(
      new THREE.LatheGeometry(pts, 56),
      new THREE.MeshPhysicalMaterial({
        map: brandTexture({ base: "#E8720C", label: "70 ЛЕТ", sub: "ЭПК УрФУ" }),
        metalness: 0.35, roughness: 0.32, clearcoat: 0.55,
      })
    );
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.5, 40),
      new THREE.MeshStandardMaterial({ color: 0xcfd6dd, metalness: 0.85, roughness: 0.28 })
    );
    cap.position.y = 4.35;
    const group = new THREE.Group();
    group.add(body, cap);
    group.position.y = -1.4;
    const s = 0.95;
    group.scale.set(s, s, s);
    return group;
  }

  const badge = await buildBadge().catch((err) => {
    console.warn("3D-знак не собрался:", err);
    return new THREE.Group();
  });
  const pen = buildPen();
  const thermos = buildThermos();
  [badge, pen, thermos].forEach((o) => { o.visible = false; scene.add(o); });
  badge.visible = true;

  // ---------- Скролл: сглаженный (lerp) прогресс по ОБЩЕЙ высоте знак+носители ----------
  const track = document.getElementById("scene-track");
  let rawT = 0, smoothT = 0;
  function onScroll() {
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    rawT = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;
    stageHost.style.opacity = rawT <= 0.001 || rawT >= 0.999 ? "" : "";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Три зоны прогресса с перекрёстным затуханием на стыках — сумма непрозрачностей
  // всегда ~1, поэтому не бывает момента, когда виден пустой экран.
  // Все объекты стоят по центру (x=0) — никакого бокового сползания за кадр.
  function updateScene(t) {
    const inRange = t > -0.02 && t < 1.02;
    stageHost.style.opacity = inRange ? "1" : "0";
    if (!inRange) return;

    const toPenT = THREE.MathUtils.smoothstep(t, 0.55, 0.68);
    const toThermosT = THREE.MathUtils.smoothstep(t, 0.80, 0.90);

    const badgeOp = 1 - toPenT;
    const penOp = toPenT * (1 - toThermosT);
    const thermosOp = toThermosT;

    badge.visible = badgeOp > 0.01;
    pen.visible = penOp > 0.01;
    thermos.visible = thermosOp > 0.01;

    setOpacity(badge, badgeOp);
    setOpacity(pen, penOp);
    setOpacity(thermos, thermosOp);

    camera.position.z = THREE.MathUtils.lerp(8.2, 7.0, t);
  }

  function setOpacity(obj, v) {
    obj.traverse((c) => {
      if (c.isMesh) {
        c.material.transparent = true;
        c.material.opacity = v;
      }
    });
  }

  // Знак — плоский (экструдированный), поэтому у него ПОСТОЯННЫЙ наклон по X:
  // при чистом вращении вокруг Y плоский диск на какой-то доле оборота встаёт
  // ребром к камере и пропадает. Наклон превращает круг в эллипс — не исчезает
  // никогда, как кольца Сатурна. Ручка и термос объёмные (Lathe) — им наклон
  // не нужен, крутятся свободно вокруг своей оси.
  badge.rotation.x = 0.32;
  badge.rotation.z = 0.06;

  let raf;
  const clock = new THREE.Clock();
  function animate() {
    raf = requestAnimationFrame(animate);
    const dt = clock.getDelta();
    smoothT += (rawT - smoothT) * Math.min(1, dt * 6.5); // scroll-scrub со сглаживанием
    updateScene(smoothT);

    [badge, pen, thermos].forEach((o) => {
      if (!o.visible) return;
      o.rotation.y += dt * 0.32;
      o.children.forEach((c) => { if (c.userData.spin) c.rotation.z += dt * c.userData.spin; });
    });

    composer.render();
  }
  animate();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else animate();
  });
})();
