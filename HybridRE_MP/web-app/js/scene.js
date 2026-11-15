// Narmada Hybrid · realistic 3D plant (three.js r160, runs offline from /vendor)
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Sky } from "three/addons/objects/Sky.js";
import { Water } from "three/addons/objects/Water.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

// ---------------------------------------------------------------- geography (world units ≈ 10 m)
const RES = [[62,-38],[40,-52],[12,-56],[-22,-50],[-52,-64],[-88,-55],[-122,-72],[-168,-56],[-212,-28],[-190,-4],[-236,22],[-186,34],[-140,22],[-100,44],[-60,36],[-30,50],[4,38],[34,28],[62,22]];
const RIVER = [[66,-8],[96,-6],[124,-1],[136,2],[176,3],[196,5],[300,10]];
const PADS = [[42,-76,16],[27,-89,16],[103,-45,22],[57,-106,13],[84,-8,13],[188,3,10],[18,-61,7]];
const WIND = [[-82,76],[-60,104],[-38,74],[-16,108],[6,82],[24,112],[-64,132],[-24,138]];
const FPV = [[-30,-34],[-4,-36],[22,-32],[-30,-10],[-4,-12],[22,-8],[-58,-34],[-58,-10]];

function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y) { let s = 0, a = 1, f = 1; for (let i = 0; i < 5; i++) { s += a * vnoise(x * f, y * f); a *= .5; f *= 2.03; } return s / 1.94; }
function segD(px, pz, a, b) { const vx = b[0] - a[0], vz = b[1] - a[1], t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (pz - a[1]) * vz) / (vx * vx + vz * vz))); return Math.hypot(px - a[0] - t * vx, pz - a[1] - t * vz); }
function inPoly(x, z, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) c = !c; } return c; }
function sdRes(x, z) { let d = 1e9; for (let i = 0; i < RES.length; i++) d = Math.min(d, segD(x, z, RES[i], RES[(i + 1) % RES.length])); return inPoly(x, z, RES) ? -d : d; }
function dRiver(x, z) { let d = 1e9; for (let i = 0; i < RIVER.length - 1; i++) d = Math.min(d, segD(x, z, RIVER[i], RIVER[i + 1])); return d - 6; }
const g2 = (x, z, cx, cz, s, h) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * s * s));
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function natural(x, z) {
  let h = 2.5 + 15 * Math.pow(fbm(x * .011 + 7, z * .011 + 3), 1.6) + 3 * fbm(x * .05, z * .05);
  h += g2(x, z, -30, 104, 46, 9) + g2(x, z, -200, 150, 70, 26) + g2(x, z, 40, 190, 70, 22) + g2(x, z, 260, 150, 60, 20) + g2(x, z, -230, -150, 70, 22) + g2(x, z, 160, -230, 70, 14);
  return h;
}
function hAt(x, z) {
  const wd = Math.min(sdRes(x, z), dRiver(x, z), Math.hypot((x - 152) / 1.7, z - 3) - 18);
  let h;
  if (wd < 0) h = Math.max(-8, wd * .55);
  else h = 0.5 + (natural(x, z) - 0.5) * sstep(0, 16, wd);
  for (const [px, pz, r] of PADS) { const d = Math.hypot(x - px, z - pz); if (d < r + 10) h = h + (1.6 - h) * (1 - sstep(r, r + 10, d)); }
  return h;
}

// ---------------------------------------------------------------- procedural textures
function waterNormals() {
  const n = 256, c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d"), img = g.createImageData(n, n);
  const H = (x, y) => Math.sin(x * .11 + y * .07) * .5 + Math.sin(x * .21 - y * .17) * .35 + Math.sin(x * .05 + y * .23) * .4 + fbm(x * .09, y * .09) * .8;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = H(x + 1, y) - H(x - 1, y), dy = H(x, y + 1) - H(x, y - 1), l = Math.hypot(dx, dy, 1), i = (y * n + x) * 4;
    img.data[i] = (-dx / l * .5 + .5) * 255; img.data[i + 1] = (-dy / l * .5 + .5) * 255; img.data[i + 2] = (1 / l * .5 + .5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function softSprite(inner = "rgba(255,255,255,.95)", outer = "rgba(255,255,255,0)") {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}

// ---------------------------------------------------------------- component registry (click for specs)
export const COMPONENTS = {
  fpv: { name: "Floating solar · 390 MWp", c: "--solar", spec: ["Bifacial n-type TOPCon modules on HDPE floats", "Elastic mooring for the 19 m level swing", "Built in 50 MW blocks; each earns when connected", "Cost ₹4.00 Cr/MWp (modules ₹2.10)"] },
  wind: { name: "Wind · 16 × 3.15 MW", c: "--wind", spec: ["Low-wind class, ~140 m hub, ~160 m rotor", "On the plateau above the reservoir", "Built only after a 12-month wind mast", "Cost ₹6.80 Cr/MW"] },
  bess: { name: "Battery · 50 MW / 100 MWh", c: "--bess", spec: ["Grid-forming LFP containers", "Covers seconds to minutes while hydro ramps", "Earns grid-services revenue", "Cost ₹1.00 Cr/MWh"] },
  hydro: { name: "Indira Sagar dam · 1,000 MW", c: "--hydro", spec: ["8 × 125 MW Francis units (existing, NHDC)", "Live storage ≈ 9.75 bn m³", "Ramps in minutes; black-start capable", "We pay a firming fee instead of buying batteries"] },
  osp: { name: "Omkareshwar · 520 MW", c: "--hydro", spec: ["8 × 65 MW units downstream (existing)", "Uses the same water a second time", "RUMSL floating-solar precedent on this reservoir"] },
  pool: { name: "Pooling substation 33/400 kV", c: "--olive", spec: ["2 × 200 MVA transformers (N-1)", "Collects solar, wind and battery", "Cost ₹150 Cr incl. bays and cables"] },
  grid: { name: "Existing 400 kV switchyard", c: "--grid", spec: ["NHDC's switchyard and lines, reused", "No new transmission line needed", "AI-EMS keeps output under the line limit"] },
  ctrl: { name: "AI-EMS control centre", c: "--olive", spec: ["Forecasts sun, wind, inflow and prices", "Dispatches every unit every 15 minutes", "Earns revenue from month 3 on existing hydro"] },
};

const MAJOR = ["fpv", "wind", "hydro", "grid"];
const FOCUS = {
  overview: { p: [70, 240, -300], t: [-5, 0, -5] },
  fpv: { p: [-62, 34, 36], t: [-8, 1, -22] },
  wind: { p: [-120, 58, 210], t: [-26, 20, 100] },
  bess: { p: [92, 26, -32], t: [40, 3, -80] },
  hydro: { p: [132, 36, 50], t: [68, 9, -8] },
  pool: { p: [-4, 34, -150], t: [32, 4, -86] },
  grid: { p: [190, 64, 10], t: [134, 14, -92] },
  ctrl: { p: [18, 22, -146], t: [57, 5, -106] },
  osp: { p: [230, 40, 66], t: [170, 6, 3] },
};

const MODES = {
  day: { name: "Dry-season noon", elev: 58, azim: 160, turb: 2.2, ray: .9, exp: .46, fog: 0xd7e3e6, fogN: 700, fogF: 2200, sunI: 2.6, hemi: .9, bloom: .25, thr: .92, night: 0, rain: 0,
    solar: 300, wind: 8, bess: -50, hydro: 150, note: "Solar carries the load. Hydro backs down and the reservoir saves water. The battery charges." },
  night: { name: "Evening peak · 7 pm", elev: -4, azim: 250, turb: 8, ray: 2.5, exp: .38, fog: 0x232a3a, fogN: 400, fogF: 1600, sunI: .05, hemi: .28, bloom: 1.1, thr: .32, night: 1, rain: 0,
    solar: 0, wind: 22, bess: 50, hydro: 1200, note: "Solar is zero. The water saved at noon runs the turbines at full power. Battery and wind top up." },
  monsoon: { name: "Monsoon afternoon", elev: 30, azim: 200, turb: 18, ray: .3, exp: .4, fog: 0x8f999f, fogN: 180, fogF: 900, sunI: .7, hemi: .7, bloom: .2, thr: .95, night: 0, rain: 1,
    solar: 110, wind: 42, bess: 0, hydro: 1400, note: "Clouds cut solar. Heavy inflow and monsoon wind take over. The battery holds reserve." },
};

export function createPlant() {
  const host = document.createElement("div"); host.id = "plant";
  let renderer, scene, camera, controls, composer, bloom, water, sky, sun, hemi, pmrem, clock, envRT;
  let active = false, mode = "day", tween = null, focusKey = "overview", built = false, ok = true;
  const labels = [], flows = [], blades = [], beacons = [], glows = [], bob = [], clouds = [], pickables = [];
  let rain, stars, infoEl, readEl;
  const sunVec = new THREE.Vector3();

  function init() {
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }); } catch (e) { ok = false; return; }
    renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 1, 6000); camera.position.set(...FOCUS.overview.p);
    controls = new OrbitControls(camera, renderer.domElement); controls.target.set(...FOCUS.overview.t);
    controls.enableDamping = true; controls.maxPolarAngle = Math.PI * .47; controls.minDistance = 14; controls.maxDistance = 900; controls.autoRotateSpeed = .5;
    renderer.domElement.addEventListener("pointerdown", () => { tween = null; });
    renderer.domElement.addEventListener("click", pick);
    sun = new THREE.DirectionalLight(0xfff1dc, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -320, right: 320, top: 280, bottom: -280, near: 10, far: 1600 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .6;
    scene.add(sun); scene.add(sun.target);
    hemi = new THREE.HemisphereLight(0xdfeaf2, 0x5d6b47, .9); scene.add(hemi);
    sky = new Sky(); sky.scale.setScalar(5000); scene.add(sky);
    pmrem = new THREE.PMREMGenerator(renderer);
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), .25, .55, .92); composer.addPass(bloom);
    composer.addPass(new OutputPass());
    clock = new THREE.Clock();
    build(); applyMode();
    new ResizeObserver(resize).observe(host);
    loop();
  }

  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .8, metalness: 0, ...o });
  function add(obj, comp, parent = scene) { obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (comp) { o.userData.comp = comp; pickables.push(o); } } }); parent.add(obj); return obj; }
  function box(w, h, d, mat, x, y, z, comp, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return add(m, comp, parent); }
  function cyl(rt, rb, h, mat, x, y, z, comp, seg = 12) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); return add(m, comp); }

  function build() {
    // terrain
    const tg = new THREE.PlaneGeometry(1000, 760, 250, 190); tg.rotateX(-Math.PI / 2);
    const P = tg.attributes.position;
    for (let i = 0; i < P.count; i++) P.setY(i, hAt(P.getX(i), P.getZ(i)));
    tg.computeVertexNormals();
    const N = tg.attributes.normal, col = new Float32Array(P.count * 3);
    const cSand = new THREE.Color(0xcbb68c), cWet = new THREE.Color(0x8d7d5e), cGrass = new THREE.Color(0x6f8c45), cDry = new THREE.Color(0xa79a5c), cRock = new THREE.Color(0x857a6b), cPad = new THREE.Color(0xb3ada0), c = new THREE.Color();
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), ny = N.getY(i);
      if (y < -.3) c.copy(cWet); else if (y < 1.4) c.copy(cSand);
      else { c.copy(cGrass).lerp(cDry, sstep(4, 22, y) * .8 + (fbm(x * .03, z * .03) - .5) * .5); if (ny < .86) c.lerp(cRock, sstep(.86, .7, ny)); }
      if (PADS.some(([px, pz, r]) => Math.hypot(x - px, z - pz) < r)) c.copy(cPad);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    tg.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 })); terrain.receiveShadow = true; scene.add(terrain);

    // water
    water = new Water(new THREE.PlaneGeometry(1000, 760), { textureWidth: 1024, textureHeight: 1024, waterNormals: waterNormals(), sunDirection: new THREE.Vector3(), sunColor: 0xffffff, waterColor: 0x1d5b70, distortionScale: 2.4, fog: true });
    water.rotation.x = -Math.PI / 2; water.position.y = .2; water.material.uniforms.size.value = 3.5; scene.add(water);

    // trees (instanced, seeded)
    const trunkG = new THREE.CylinderGeometry(.25, .35, 2.4, 5), crownG = new THREE.IcosahedronGeometry(2.1, 0);
    const trunks = new THREE.InstancedMesh(trunkG, std(0x5b4632), 2400), crowns = new THREE.InstancedMesh(crownG, std(0xffffff, { flatShading: true }), 2400);
    const o = new THREE.Object3D(), tc = new THREE.Color(); let k = 0, seed = 1;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const avoid = [...PADS.map(([x, z, r]) => [x, z, r + 12]), ...WIND.map(([x, z]) => [x, z, 9]), [70, -8, 30], [180, 3, 20]];
    for (let tries = 0; tries < 20000 && k < 2400; tries++) {
      const x = (rnd() - .5) * 980, z = (rnd() - .5) * 740, h = hAt(x, z);
      if (h < 2 || h > 28 || avoid.some(([ax, az, r]) => Math.hypot(x - ax, z - az) < r)) continue;
      if (fbm(x * .02 + 3, z * .02) < .45 && rnd() > .25) continue;
      const s = .7 + rnd() * .9;
      o.position.set(x, h + 1.1 * s, z); o.scale.set(s, s, s); o.rotation.y = rnd() * 6; o.updateMatrix(); trunks.setMatrixAt(k, o.matrix);
      o.position.y = h + 3.2 * s; o.scale.set(s, s * (1 + rnd() * .5), s); o.updateMatrix(); crowns.setMatrixAt(k, o.matrix);
      crowns.setColorAt(k, tc.setHSL(.22 + rnd() * .08, .38 + rnd() * .2, .24 + rnd() * .12)); k++;
    }
    trunks.count = crowns.count = k; trunks.castShadow = crowns.castShadow = true; scene.add(trunks); scene.add(crowns);

    // dam (gravity section extruded along the crest)
    const conc = std(0xc4c0b6, { roughness: .9 }), dark = std(0x5d6268, { roughness: .6, metalness: .3 });
    const sec = new THREE.Shape(); sec.moveTo(0, -6); sec.lineTo(0, 17); sec.lineTo(5, 17); sec.lineTo(18, -6); sec.lineTo(0, -6);
    const damG = new THREE.ExtrudeGeometry(sec, { depth: 72, bevelEnabled: false }); const dam = new THREE.Mesh(damG, conc);
    dam.position.set(61, 0, 28); dam.rotation.y = Math.PI; dam.rotation.y = 0; dam.position.set(61, 0, -44); add(dam, "hydro");
    box(6, 1.2, 72, std(0x8f8b82), 63.5, 17.6, -8, "hydro");
    for (let i = 0; i < 9; i++) box(5.6, 1.4, .5, std(0xe8e4dc), 63.5, 18.6, -43 + i * 8.8, "hydro");
    for (let i = 0; i < 6; i++) { box(7, 9, 2, conc, 66, 12, -20 + i * 5.4, "hydro"); if (i < 5) box(.8, 7, 3.4, dark, 69.2, 11, -17.3 + i * 5.4, "hydro"); }
    const ph = box(20, 11, 32, std(0xa9b0b6), 86, 5.5, -8, "hydro"); box(21, 1, 33, std(0x2f5e7a, { roughness: .4 }), 86, 11.5, -8, "hydro");
    const winM = std(0x223344, { emissive: new THREE.Color(0xffc56b), emissiveIntensity: 0 }); glows.push(winM);
    box(.4, 2, 28, winM, 75.8, 7, -8, "hydro");
    for (let i = 0; i < 4; i++) { const p = cyl(1.1, 1.1, 18, std(0x6d747a, { metalness: .5, roughness: .4 }), 72, 7.5, -16 + i * 5.3, "hydro"); p.rotation.z = Math.PI / 2.6; }
    box(10, 6, 46, conc, 176, 3, 3, "osp"); box(14, 8, 20, std(0xa9b0b6), 186, 4, 3, "osp"); box(15, 1, 21, std(0x2f5e7a), 186, 8.4, 3, "osp");

    // floating PV
    const panelM = new THREE.MeshStandardMaterial({ color: 0x14244a, metalness: .55, roughness: .22 }), floatM = std(0xe9ecec, { roughness: .6 }), walkM = std(0xb8bcbd);
    const panelG = new THREE.BoxGeometry(3.3, .14, 2), floatG = new THREE.BoxGeometry(3.7, .45, 2.6);
    FPV.forEach(([cx, cz], ci) => {
      const g = new THREE.Group(); g.position.set(cx, .35, cz); const nx = 7, nz = 9, n = nx * nz;
      const pm = new THREE.InstancedMesh(panelG, panelM, n), fm = new THREE.InstancedMesh(floatG, floatM, n); const q = new THREE.Object3D(); let j = 0;
      for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
        q.position.set(-11.1 + a * 3.7, 0, -11 + b * 2.75); q.rotation.set(0, 0, 0); q.updateMatrix(); fm.setMatrixAt(j, q.matrix);
        q.position.y = .55; q.rotation.set(-.22, 0, 0); q.updateMatrix(); pm.setMatrixAt(j, q.matrix); j++;
      }
      pm.castShadow = true; fm.receiveShadow = true; pm.userData.comp = fm.userData.comp = "fpv"; pickables.push(pm, fm); g.add(fm, pm);
      const w1 = new THREE.Mesh(new THREE.BoxGeometry(26, .3, 1), walkM); w1.position.set(0, .05, 13.2); g.add(w1);
      const w2 = new THREE.Mesh(new THREE.BoxGeometry(1, .3, 26), walkM); w2.position.set(14.2, .05, 0); g.add(w2);
      const inv = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), std(0xdadad3)); inv.position.set(14.2, 1, 0); inv.castShadow = true; inv.userData.comp = "fpv"; pickables.push(inv); g.add(inv);
      scene.add(g); bob.push({ g, ph: ci * .9 });
    });

    // wind turbines
    const white = std(0xf4f5f3, { roughness: .45 });
    const bladeShape = new THREE.Shape(); bladeShape.moveTo(-.9, 0); bladeShape.quadraticCurveTo(-1.3, 6, -.3, 21); bladeShape.lineTo(.25, 21); bladeShape.quadraticCurveTo(.8, 8, .9, 0); bladeShape.lineTo(-.9, 0);
    const bladeG = new THREE.ExtrudeGeometry(bladeShape, { depth: .25, bevelEnabled: false });
    WIND.forEach(([x, z]) => {
      const y = hAt(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = .7;
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(.75, 1.7, 40, 20), white); tw.position.y = 20; g.add(tw);
      const na = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 7), white); na.position.set(0, 40.5, .8); g.add(na);
      const hub = new THREE.Group(); hub.position.set(0, 40.5, -3); g.add(hub);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.4, 16), white); cone.rotation.x = -Math.PI / 2; cone.position.z = -.8; hub.add(cone);
      for (let b = 0; b < 3; b++) { const piv = new THREE.Group(); piv.rotation.z = b * 2 * Math.PI / 3; const bl = new THREE.Mesh(bladeG, white); bl.rotation.y = .25; piv.add(bl); hub.add(piv); }
      const bc = new THREE.Mesh(new THREE.SphereGeometry(.45, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2a1a })); bc.position.set(0, 42.1, 1.5); g.add(bc); beacons.push(bc);
      add(g, "wind"); blades.push(hub);
    });

    // battery yard
    const bessM = std(0xf0f1ef, { roughness: .5 });
    for (let i = 0; i < 10; i++) { const x = 30 + (i % 5) * 6.4, z = -71 - Math.floor(i / 5) * 6; box(5.6, 2.9, 2.5, bessM, x, 3.05, z, "bess"); box(1.4, .7, 1.4, std(0x9aa0a4), x - 1.5, 4.85, z, "bess"); }
    box(3.4, 3, 3.4, std(0x8a73c4), 64, 3.1, -71, "bess"); box(3.4, 3, 3.4, std(0x8a73c4), 64, 3.1, -77, "bess");
    // pooling substation
    const steel = std(0xa9b0b4, { metalness: .6, roughness: .35 }), trans = std(0x7c868d, { metalness: .3, roughness: .5 });
    for (let i = 0; i < 2; i++) { const x = 22 + i * 10; box(5, 5, 6.5, trans, x, 4.1, -89, "pool"); for (let f = 0; f < 5; f++) box(.25, 4, 6, trans, x + 2.8 + f * .35, 3.6, -89, "pool");
      for (let b = 0; b < 3; b++) cyl(.25, .35, 3, std(0x8b5a3c), x - 1.5 + b * 1.5, 7.9, -89, "pool", 8); }
    for (let i = 0; i < 4; i++) { box(.5, 11, .5, steel, 16 + i * 7, 7.1, -97.5, "pool"); box(.5, 11, .5, steel, 16 + i * 7, 7.1, -80.5, "pool"); }
    box(22, .5, .5, steel, 26.5, 12.4, -97.5, "pool"); box(22, .5, .5, steel, 26.5, 12.4, -80.5, "pool");
    // existing switchyard
    for (let i = 0; i < 6; i++) { box(.6, 13, .6, steel, 89 + i * 5.6, 8.1, -54, "grid"); box(.6, 13, .6, steel, 89 + i * 5.6, 8.1, -36, "grid"); }
    box(29, .6, .6, steel, 103, 14.4, -54, "grid"); box(29, .6, .6, steel, 103, 14.4, -36, "grid");
    for (let i = 0; i < 3; i++) box(4.4, 5.5, 5.5, trans, 94 + i * 9, 4.4, -45, "grid");
    // control centre
    box(18, 6, 11, std(0xe9ebec), 57, 4.6, -106, "ctrl");
    const glass = new THREE.MeshStandardMaterial({ color: 0x24465a, metalness: .7, roughness: .1, emissive: new THREE.Color(0xffd27a), emissiveIntensity: 0 }); glows.push(glass);
    box(18.4, 2.2, 11.4, glass, 57, 5.2, -106, "ctrl"); box(18.6, .8, 11.6, std(0x2f3a40), 57, 8, -106, "ctrl");
    // transmission line (lattice towers + sagging wires)
    const tl = [[103, -45], [130, -74], [157, -103], [184, -132], [211, -161], [238, -190], [265, -219]];
    const towerM = std(0x9aa3a8, { metalness: .6, roughness: .4 });
    tl.forEach(([x, z]) => {
      const y = hAt(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = .76;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.18, .26, 26, 5), towerM); leg.position.set(a * 1.6, 13, b * 1.6); leg.rotation.z = -a * .07; leg.rotation.x = b * .07; g.add(leg); });
      [18, 23].forEach(hh => { const arm = new THREE.Mesh(new THREE.BoxGeometry(11, .35, .35), towerM); arm.position.y = hh; g.add(arm); });
      add(g);
    });
    const wireM = new THREE.LineBasicMaterial({ color: 0x4f575c });
    [[-5, 23], [5, 23], [-5, 18], [5, 18]].forEach(([off, hh]) => {
      const pts = [];
      for (let i = 0; i < tl.length - 1; i++) { const [x1, z1] = tl[i], [x2, z2] = tl[i + 1], y1 = hAt(x1, z1) + hh, y2 = hAt(x2, z2) + hh;
        for (let s = 0; s <= 12; s++) { const t = s / 12, ox = off * Math.cos(.76) * .7, oz = -off * Math.sin(.76) * .7; pts.push(new THREE.Vector3(x1 + (x2 - x1) * t + ox, y1 + (y2 - y1) * t - Math.sin(Math.PI * t) * 2.6, z1 + (z2 - z1) * t + oz)); } }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireM));
    });
    // access road
    road([[57, -97], [40, -92], [36, -80], [52, -64], [70, -52], [96, -48]], 3.2);

    // energy flows: glowing tubes + moving pulses
    const F = (key, pts, color) => {
      const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(css(color)), transparent: true, opacity: .35 });
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, .28, 6, false), mat); scene.add(tube);
      const pm = new THREE.MeshBasicMaterial({ color: new THREE.Color(css(color)).multiplyScalar(2.2) });
      const parts = []; for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.85, 12, 8), pm); m.userData.o = i / 14; scene.add(m); parts.push(m); }
      flows.push({ key, curve, tube, parts, inten: 0, dir: 1 });
    };
    F("solar", [[-4, 2.2, -24], [8, 2.2, -46], [18, 2.4, -60], [27, 5, -86]], "--solar");
    F("solar", [[22, 2.2, -20], [22, 2.2, -46], [18, 2.4, -60]], "--solar");
    F("solar", [[-30, 2.2, -22], [-14, 2.2, -42], [8, 2.2, -46]], "--solar");
    F("wind", [[-26, 26, 100], [0, 12, 56], [36, 6, 0], [30, 6, -86]], "--wind");
    F("bess", [[46, 5, -74], [32, 6, -87]], "--bess");
    F("pool", [[32, 9, -89], [64, 11, -72], [98, 15, -47]], "--olive");
    F("hydro", [[86, 10, -8], [92, 12, -30], [98, 15, -45]], "--hydro");
    F("hydro", [[186, 8, 3], [150, 12, -32], [108, 16, -46]], "--hydro");
    F("grid", tl.map(([x, z]) => [x, hAt(x, z) + 24.5, z]), "--grid");

    // weather & sky extras
    const rg = new THREE.BufferGeometry(), rp = new Float32Array(5000 * 3);
    for (let i = 0; i < 5000; i++) { rp[i * 3] = (Math.random() - .5) * 700; rp[i * 3 + 1] = Math.random() * 220; rp[i * 3 + 2] = (Math.random() - .5) * 560; }
    rg.setAttribute("position", new THREE.BufferAttribute(rp, 3));
    rain = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0xcfdbe4, size: 1.3, transparent: true, opacity: .65, sizeAttenuation: true })); rain.visible = false; scene.add(rain);
    const cTex = softSprite("rgba(220,226,230,.95)", "rgba(220,226,230,0)");
    for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cTex, color: 0x9aa4ab, transparent: true, opacity: .85, depthWrite: false })); s.scale.set(140 + Math.random() * 120, 50 + Math.random() * 30, 1); s.position.set((Math.random() - .5) * 900, 120 + Math.random() * 50, (Math.random() - .5) * 700); s.visible = false; scene.add(s); clouds.push(s); }
    const sg = new THREE.BufferGeometry(), sp = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i++) { const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * .45, r = 2400; sp[i * 3] = r * Math.sin(ph) * Math.cos(th); sp[i * 3 + 1] = r * Math.cos(ph); sp[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th); }
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3)); stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false })); stars.visible = false; scene.add(stars);

    // labels
    const L = (key, pos) => { const C = COMPONENTS[key]; const el = document.createElement("div"); el.className = "lbl"; el.innerHTML = `<i style="background:var(${C.c})"></i>${C.name}`; el.addEventListener("click", () => { focus(key); showInfo(key); }); host.appendChild(el); labels.push({ key, el, v: new THREE.Vector3(...pos) }); };
    L("fpv", [-4, 8, -22]); L("wind", [-26, 64, 104]); L("bess", [42, 9, -75]); L("hydro", [70, 24, -8]); L("osp", [180, 15, 3]); L("pool", [27, 16, -89]); L("grid", [103, 20, -45]); L("ctrl", [57, 13, -106]);
    built = true;
  }
  function road(pts, w) {
    const pos = [], idx = []; let n = 0;
    for (let i = 0; i < pts.length - 1; i++) { const [x1, z1] = pts[i], [x2, z2] = pts[i + 1], dx = x2 - x1, dz = z2 - z1, l = Math.hypot(dx, dz), nx = -dz / l * w / 2, nz = dx / l * w / 2;
      for (let s = 0; s <= 10; s++) { const t = s / 10, x = x1 + dx * t, z = z1 + dz * t; pos.push(x + nx, hAt(x + nx, z + nz) + .15, z + nz, x - nx, hAt(x - nx, z - nz) + .15, z - nz);
        if (s > 0) { const a = n - 2, b = n - 1, c = n, d = n + 1; idx.push(a, c, b, b, c, d); } n += 2; } }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, std(0x5d5d58, { roughness: .95, side: THREE.DoubleSide })); m.receiveShadow = true; scene.add(m);
  }

  function applyMode() {
    if (!built) return; const m = MODES[mode];
    const phi = THREE.MathUtils.degToRad(90 - m.elev), theta = THREE.MathUtils.degToRad(m.azim);
    sunVec.setFromSphericalCoords(1, phi, theta);
    const u = sky.material.uniforms; u.turbidity.value = m.turb; u.rayleigh.value = m.ray; u.mieCoefficient.value = .005; u.mieDirectionalG.value = .8; u.sunPosition.value.copy(sunVec);
    water.material.uniforms.sunDirection.value.copy(sunVec).normalize();
    water.material.uniforms.waterColor.value.set(mode === "night" ? 0x0a1c28 : mode === "monsoon" ? 0x2c4a52 : 0x0f4153);
    sun.position.copy(sunVec).multiplyScalar(600); sun.intensity = m.sunI; sun.color.set(mode === "monsoon" ? 0xdfe6ea : 0xfff1dc);
    hemi.intensity = m.hemi; hemi.color.set(mode === "night" ? 0x6f86b6 : 0xdfeaf2);
    renderer.toneMappingExposure = m.exp;
    scene.fog = new THREE.Fog(m.fog, m.fogN, m.fogF);
    bloom.strength = m.bloom; bloom.threshold = m.thr;
    glows.forEach(g => g.emissiveIntensity = m.night ? 2.2 : 0);
    beacons.forEach(b => b.visible = !!m.night || mode === "monsoon");
    rain.visible = !!m.rain; clouds.forEach(c => c.visible = !!m.rain); stars.visible = !!m.night;
    if (envRT) envRT.dispose();
    const envScene = new THREE.Scene(); const s2 = new Sky(); s2.scale.setScalar(4000); Object.keys(u).forEach(k => s2.material.uniforms[k].value = u[k].value.clone ? u[k].value.clone() : u[k].value); envScene.add(s2);
    envRT = pmrem.fromScene(envScene); scene.environment = envRT.texture;
    const I = { solar: m.solar / 300, wind: m.wind / 45, bess: Math.abs(m.bess) / 50, hydro: Math.min(1, m.hydro / 1300), pool: (m.solar + m.wind + Math.max(0, m.bess)) / 330, grid: 1 };
    flows.forEach(f => { f.inten = Math.min(1, I[f.key] || 0); f.dir = (f.key === "bess" && m.bess < 0) ? -1 : 1; f.tube.material.opacity = .12 + .38 * f.inten; });
    readout();
  }
  function readout() {
    if (!readEl) return; const m = MODES[mode];
    const rows = [["--solar", "Floating solar", m.solar], ["--wind", "Wind", m.wind], ["--bess", m.bess < 0 ? "Battery (charging)" : "Battery", m.bess], ["--hydro", "Hydro (NHDC)", m.hydro]];
    readEl.innerHTML = `<h5>${m.name} · MW (indicative)</h5>` + rows.map(([c, n, v]) => `<div class="row"><i style="background:var(${c})"></i><span>${n}</span><b>${v > 0 ? "+" : ""}${v.toLocaleString("en-IN")}</b></div>`).join("") +
      `<div class="row tot"><i></i><span>Sent to grid</span><b>${(m.solar + m.wind + m.bess + m.hydro).toLocaleString("en-IN")}</b></div><p>${m.note}</p>`;
  }
  function showInfo(key) {
    if (!infoEl) return; const C = COMPONENTS[key]; if (!C) return;
    infoEl.hidden = false; infoEl.innerHTML = `<button class="x" type="button" aria-label="Close">×</button><h4><span class="dot" style="background:var(${C.c});width:12px;height:12px;border-radius:50%;display:inline-block;margin-right:8px"></span>${C.name}</h4><ul>${C.spec.map(s => `<li>${s}</li>`).join("")}</ul>`;
    infoEl.querySelector(".x").onclick = () => infoEl.hidden = true;
  }
  const ray = new THREE.Raycaster(), mv = new THREE.Vector2();
  function pick(ev) {
    if (!infoEl) return; const r = renderer.domElement.getBoundingClientRect(); mv.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mv, camera); const hit = ray.intersectObjects(pickables, false)[0]; if (hit) { showInfo(hit.object.userData.comp); }
  }
  function resize() { if (!renderer) return; const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function focus(key) {
    focusKey = key; const f = FOCUS[key] || FOCUS.overview; labels.forEach(l => l.el.classList.toggle("hot", l.key === key));
    if (!camera) return; if (RM) { camera.position.set(...f.p); controls.target.set(...f.t); return; }
    tween = { t0: performance.now(), d: 1700, p0: camera.position.clone(), q0: controls.target.clone(), p1: new THREE.Vector3(...f.p), q1: new THREE.Vector3(...f.t) };
  }
  function loop() {
    requestAnimationFrame(loop); if (!active || !renderer) return;
    const dt = Math.min(.05, clock.getDelta()), now = performance.now(), t = now / 1000;
    if (tween) { const k = Math.min(1, (now - tween.t0) / tween.d), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.q0, tween.q1, e); if (k >= 1) tween = null; }
    controls.update();
    water.material.uniforms.time.value += dt * (mode === "monsoon" ? .9 : .45);
    const ws = MODES[mode].wind / 45; blades.forEach(h => h.rotation.z += dt * (.4 + ws * 2.6) * (RM ? .3 : 1));
    bob.forEach(b => { b.g.position.y = .35 + Math.sin(t * .9 + b.ph) * .07; b.g.rotation.z = Math.sin(t * .6 + b.ph) * .004; });
    beacons.forEach(b => b.material.color.setScalar(Math.sin(t * 3) > 0 ? 1 : .25).multiply(new THREE.Color(1, .16, .1)));
    flows.forEach(f => { const n = Math.round(f.parts.length * f.inten); f.parts.forEach((p, i) => { p.visible = i < n; if (!p.visible) return; let u = (t * .16 * (RM ? .3 : 1) + p.userData.o) % 1; if (f.dir < 0) u = 1 - u; p.position.copy(f.curve.getPointAt(u)); }); });
    if (rain.visible) { const a = rain.geometry.attributes.position; for (let i = 0; i < a.count; i++) { let y = a.getY(i) - dt * 160; if (y < 0) y = 220; a.setY(i, y); } a.needsUpdate = true; clouds.forEach(c => { c.position.x += dt * 6; if (c.position.x > 460) c.position.x = -460; }); }
    composer.render();
    const w = host.clientWidth, h = host.clientHeight;
    labels.forEach(l => { const v = l.v.clone().project(camera); const vis = v.z < 1 && Math.abs(v.x) < 1.02 && Math.abs(v.y) < 1.02 && (MAJOR.includes(l.key) || l.key === focusKey); l.el.style.display = vis ? "flex" : "none"; if (vis) { l.el.style.left = ((v.x + 1) / 2 * w) + "px"; l.el.style.top = ((1 - v.y) / 2 * h - 14) + "px"; } });
  }
  function mount(container, opts = {}) {
    if (!renderer && ok) { const ld = document.createElement("div"); ld.className = "loading"; ld.textContent = "Building the 3D plant…"; container.appendChild(ld); requestAnimationFrame(() => { init(); ld.remove(); finish(); }); }
    else finish();
    function finish() {
      if (!ok) { container.innerHTML = '<div class="loading">This browser cannot run WebGL, so the 3D model is unavailable.</div>'; return; }
      container.appendChild(host);
      if (opts.readout) { if (!readEl) { readEl = document.createElement("div"); readEl.className = "readout"; } host.appendChild(readEl); readout(); } else if (readEl) readEl.remove();
      if (!infoEl) { infoEl = document.createElement("div"); infoEl.className = "info"; infoEl.hidden = true; host.appendChild(infoEl); }
      infoEl.hidden = true;
      let hint = host.querySelector(".hint3d"); if (!hint) { hint = document.createElement("div"); hint.className = "hint3d"; hint.textContent = "Drag to rotate · scroll to zoom · click any part for its specs"; host.appendChild(hint); }
      hint.style.display = opts.hideHint ? "none" : "";
      controls.autoRotate = !!opts.orbit; active = true; requestAnimationFrame(resize);
    }
  }
  return { mount, unmount() { active = false; }, focus, showInfo, setMode(m) { mode = m; applyMode(); }, get mode() { return mode; }, setOrbit(v) { if (controls) controls.autoRotate = v; }, MODES };
}
