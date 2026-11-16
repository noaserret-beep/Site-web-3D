// Modèles 3D procéduraux : produits Maison Mellow + mobilier des pièces
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as T from './textures.js';
import { pbr, tissu, tex } from './realisme.js';

/* ------------------------------------------------------------------ */
/* Outils                                                              */
/* ------------------------------------------------------------------ */
const geoCache = new Map();
const matCache = new Map();

export function rboxGeo(w, h, d, r = 0.06, seg = 3) {
  r = Math.min(r, w * 0.49, h * 0.49, d * 0.49);
  const key = `${w}|${h}|${d}|${r}|${seg}`;
  if (!geoCache.has(key)) geoCache.set(key, new RoundedBoxGeometry(w, h, d, seg, r));
  return geoCache.get(key);
}

export function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

export function box(w, h, d, r, mat, x = 0, y = 0, z = 0) {
  const m = mesh(rboxGeo(w, h, d, r), mat);
  m.position.set(x, y, z);
  return m;
}

function cached(key, make) {
  if (!matCache.has(key)) matCache.set(key, make());
  return matCache.get(key);
}

export const mats = {
  matte: (color, rough = 0.85) =>
    cached('m' + color + rough, () => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 })),
  fabric: (color) => cached('f' + color, () => tissu('rough_linen', color, { repeat: [3, 3], normal: 0.7, sheen: 0.6 })),
  fleece: (color, rep = 2) => cached('fl' + color + rep, () => tissu('polar_fleece', color, { repeat: [rep, rep], normal: 1.3, sheen: 0.9 })),
  knit: (color, rep = 2) => cached('kn' + color + rep, () => tissu('knitted_fleece', color, { repeat: [rep, rep], normal: 1.4, sheen: 0.7 })),
  fur: (color, rep = 3) => cached('fu' + color + rep, () => tissu('faux_fur_geometric', color, { repeat: [rep, rep * 0.4], normal: 1.6, sheen: 1 })),
  boucle: (color, rep = 2) => cached('bo' + color + rep, () => tissu('wool_boucle', color, { repeat: [rep, rep], normal: 1.4, sheen: 0.8 })),
  velvet: (color, rep = 2) => cached('ve' + color + rep, () => tissu('velour_velvet', color, { repeat: [rep, rep], normal: 0.8, sheen: 1 })),
  ceramic: (color) =>
    cached('c' + color, () =>
      new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.25 })),
  wood: (color = '#b98557') =>
    cached('w' + color, () => pbr('fine_grained_wood', { color: '#' + new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.45).getHexString(), repeat: [1, 1], rough: 0.9 })),
  glow: (color, intensity = 1.6) =>
    cached('g' + color + intensity, () =>
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.5 })),
  textured: (map, opts = {}) =>
    new THREE.MeshStandardMaterial({ map, roughness: 0.85, ...opts }),
};

// Effet "moumoute" : petites bosses le long des normales
function fluff(geo, amp = 0.008, freq = 22) {
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const p = geo.attributes.position;
  const n = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d =
      amp *
      (Math.sin(x * freq + 1.3) * Math.sin(y * freq * 1.13 + 0.7) * Math.sin(z * freq * 0.91 + 2.1) +
        0.45 * Math.sin((x * 1.7 + y * 2.3 + z * 1.1) * freq));
    p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
  }
  geo.computeVertexNormals();
  return geo;
}

export function glowSprite(color = '#ffb36b', size = 1, opacity = 0.55) {
  const m = new THREE.SpriteMaterial({
    map: T.glowTexture(),
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const s = new THREE.Sprite(m);
  s.scale.set(size, size, 1);
  s.userData.baseOpacity = opacity;
  return s;
}

export function blobShadow(w = 1, d = 1, opacity = 1) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ map: T.shadowTexture(), transparent: true, depthWrite: false, opacity })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  m.renderOrder = 1;
  return m;
}

/* ------------------------------------------------------------------ */
/* PRODUITS                                                            */
/* ------------------------------------------------------------------ */

function shade(hex, k) {
  return '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
}
function tint(hex, k, to = '#fff6ea') {
  return '#' + new THREE.Color(hex).lerp(new THREE.Color(to), k).getHexString();
}

function slipper(color, side = 1) {
  const g = new THREE.Group();
  const plush = mats.knit(color, 3).clone();
  plush.side = THREE.DoubleSide;

  // Semelle : empreinte de pied extrudée
  const shape = new THREE.Shape();
  const N = 56;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    const s = Math.sin(t);
    const halfW = 0.19 * (0.84 + 0.16 * s);
    const x = Math.cos(t) * halfW + side * 0.02 * Math.max(0, s) ** 2;
    const y = 0.5 * s + 0.07 * Math.cos(t) ** 2;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const soleGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.025,
    bevelSegments: 4,
    curveSegments: 16,
  });
  soleGeo.rotateX(Math.PI / 2);
  soleGeo.translate(0, 0.08, 0);
  g.add(mesh(soleGeo, mats.velvet(shade(color, 0.55), 6)));

  // Semelle intérieure moelleuse
  const inner = mesh(new THREE.ShapeGeometry(shape, 24), mats.fur(tint(color, 0.5), 8));
  inner.geometry.rotateX(-Math.PI / 2);
  inner.scale.set(0.9, 1, 0.92);
  inner.position.y = 0.121;
  g.add(inner);

  // Bout fermé (quart de sphère)
  const toe = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI, 0, Math.PI / 2);
  toe.scale(0.205, 0.27, 0.52);
  toe.translate(side * 0.008, 0.1, -0.03);
  fluff(toe, 0.003, 26);
  g.add(mesh(toe, plush));

  // Contrefort du talon
  const heel = new THREE.CylinderGeometry(1, 1, 0.19, 40, 4, true, Math.PI / 2, Math.PI);
  heel.scale(0.188, 1, 0.47);
  heel.translate(0, 0.19, -0.03);
  fluff(heel, 0.003, 26);
  g.add(mesh(heel, plush));

  // Col en fausse fourrure
  const pts = [];
  for (let k = 0; k <= 16; k++) {
    const th = Math.PI / 2 + (k / 16) * Math.PI;
    pts.push(new THREE.Vector3(0.188 * Math.sin(th), 0.285, -0.03 + 0.47 * Math.cos(th)));
  }
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI - 0.82 - (k / 10) * (Math.PI - 1.64);
    pts.push(new THREE.Vector3(0.205 * Math.cos(a), 0.1 + 0.27 * Math.sin(a) + 0.005, -0.03));
  }
  const collarCurve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const collar = new THREE.TubeGeometry(collarCurve, 90, 0.042, 12, true);
  fluff(collar, 0.014, 34);
  g.add(mesh(collar, mats.fur(tint(color, 0.6), 2)));

  // Petite étiquette brodée
  const tag = box(0.008, 0.06, 0.09, 0.004, mats.matte('#5a3a1e'));
  tag.position.set(side * 0.205, 0.2, -0.12);
  g.add(tag);
  return g;
}

export function makeSlippers(color = '#efe2cf') {
  const g = new THREE.Group();
  const l = slipper(color, -1);
  l.position.set(-0.23, 0, -0.04);
  l.rotation.y = 0.12;
  const r = slipper(color, 1);
  r.position.set(0.23, 0, 0.06);
  r.rotation.y = -0.08;
  g.add(l, r);
  g.userData.kind = 'chaussons';
  return g;
}

// Coussin matelassé paramétrique (bandeau, nuque, housse)
function quiltedGeometry({ length = 1.8, width = 0.5, thick = 0.14, cells = 6, segU = 180, segV = 28, transform }) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= segU; i++) {
    const u = i / segU;
    const x = (u - 0.5) * length;
    const phase = (u * cells) % 1;
    const seam = Math.pow(Math.sin(Math.PI * phase), 0.55);
    const endT = Math.pow(Math.min(1, Math.sin(Math.PI * u) * 7), 0.5);
    const puff = (0.3 + 0.7 * seam) * endT;
    const halfW = (width / 2) * Math.pow(Math.min(1, Math.sin(Math.PI * u) * 9), 0.4) * (0.93 + 0.07 * seam);
    for (let j = 0; j <= segV; j++) {
      const th = (j / segV) * Math.PI * 2;
      const c = Math.cos(th);
      const s = Math.sin(th);
      const z = halfW * Math.sign(c) * Math.pow(Math.abs(c), 0.55);
      const y = (thick / 2) * puff * Math.sign(s) * Math.pow(Math.abs(s), 0.85);
      pos.push(x, y, z);
      uv.push(u * cells, j / segV);
    }
  }
  for (let i = 0; i < segU; i++)
    for (let j = 0; j < segV; j++) {
      const a = i * (segV + 1) + j;
      const b = a + segV + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  if (transform) applyTransform(geo, transform);
  geo.computeVertexNormals();
  return geo;
}

function applyTransform(geo, fn) {
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i));
    fn(v);
    p.setXYZ(i, v.x, v.y, v.z);
  }
}

function strapGeometry(len, wid, thick, offset, transform) {
  const geo = new THREE.BoxGeometry(len, thick, wid, 24, 1, 1);
  geo.translate(offset, 0, 0);
  if (transform) applyTransform(geo, transform);
  geo.computeVertexNormals();
  return geo;
}

export function makeBandeau(color = '#e6b9ad') {
  const g = new THREE.Group();
  const L = 1.7;
  const TH = 0.2;
  // posé à plat en croissant, sangles qui s'enroulent doucement
  const R = 1.05;
  const tf = (v) => {
    const over = Math.max(0, Math.abs(v.x) - L / 2);
    const a = v.x / R;
    const r = R - v.z;
    v.set(r * Math.sin(a), v.y + over * over * 0.35, R - r * Math.cos(a));
  };
  g.add(mesh(quiltedGeometry({ length: L, width: 0.52, thick: TH, cells: 6, transform: tf }), mats.fleece(color, 1)));
  const strapMat = mats.velvet(shade(color, 0.86), 3);
  const sL = 0.75;
  g.add(mesh(strapGeometry(sL, 0.3, 0.035, L / 2 + sL / 2 - 0.1, tf), strapMat));
  g.add(mesh(strapGeometry(sL, 0.3, 0.035, -(L / 2 + sL / 2 - 0.1), tf), strapMat));
  // scratch
  g.add(mesh(strapGeometry(0.24, 0.26, 0.05, L / 2 + sL - 0.26, tf), mats.matte(tint(color, 0.6))));
  // étiquette brodée sur un compartiment
  const cx = (4.5 / 6 - 0.5) * L;
  const lab = box(0.14, 0.012, 0.09, 0.004, mats.matte('#5a3a1e'));
  const la = cx / R;
  lab.position.set(R * Math.sin(la), TH / 2 + 0.004, R - R * Math.cos(la));
  lab.rotation.y = -la;
  g.add(lab);
  g.position.y = TH / 2;
  const wrap = new THREE.Group();
  wrap.add(g);
  wrap.userData.kind = 'bandeau';
  return wrap;
}

export function makeNuque(color = '#a3ad8f') {
  const g = new THREE.Group();
  const R = 0.5;
  const tf = (v) => {
    const a = v.x / R;
    const r = R + v.z;
    v.set(r * Math.sin(a), v.y, -r * Math.cos(a));
  };
  const pad = mesh(quiltedGeometry({ length: 2.1, width: 0.46, thick: 0.3, cells: 7, transform: tf }), mats.velvet(color, 1));
  pad.position.y = 0.14;
  g.add(pad);
  const lab = box(0.14, 0.012, 0.09, 0.004, mats.matte('#5a3a1e'));
  lab.position.set(0, 0.29, -R);
  g.add(lab);
  const wrap = new THREE.Group();
  wrap.add(g);
  wrap.userData.kind = 'nuque';
  return wrap;
}

export function makeHousse(color = '#efe2cf') {
  const g = new THREE.Group();
  const a = mesh(quiltedGeometry({ length: 1.1, width: 0.55, thick: 0.07, cells: 4 }), mats.fleece(color, 1));
  a.position.y = 0.045;
  const b = mesh(quiltedGeometry({ length: 1.1, width: 0.55, thick: 0.07, cells: 4 }), mats.fleece(shade(color, 0.92), 1));
  b.position.set(0.06, 0.11, 0.04);
  b.rotation.y = 0.18;
  const tagGeo = rboxGeo(0.16, 0.012, 0.1, 0.004);
  const tag = mesh(tagGeo, mats.matte('#5a3a1e'));
  tag.position.set(0.2, 0.152, 0.08);
  tag.rotation.y = 0.18;
  g.add(a, b, tag);
  g.userData.kind = 'housse';
  return g;
}

export function makeCoffret(color = '#efe2cf') {
  const g = new THREE.Group();
  const kraft = mats.matte('#e8d4b8', 0.8);
  const inner = mats.matte('#c99b72', 0.9);
  const W = 1.6, H = 0.55, D = 1.15, t = 0.05;
  g.add(box(W, t, D, 0.02, kraft, 0, t / 2, 0));
  g.add(box(W, H, t, 0.02, kraft, 0, H / 2, D / 2 - t / 2));
  g.add(box(W, H, t, 0.02, kraft, 0, H / 2, -D / 2 + t / 2));
  g.add(box(t, H, D, 0.02, kraft, W / 2 - t / 2, H / 2, 0));
  g.add(box(t, H, D, 0.02, kraft, -W / 2 + t / 2, H / 2, 0));
  g.add(box(W - 0.1, 0.02, D - 0.1, 0.01, inner, 0, 0.06, 0));
  // papier de soie
  const tissue = new THREE.PlaneGeometry(W * 1.05, D * 1.05, 24, 18);
  tissue.rotateX(-Math.PI / 2);
  const p = tissue.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const edge = Math.max(Math.abs(x) / (W / 2), Math.abs(z) / (D / 2));
    p.setY(i, 0.12 + 0.05 * Math.sin(x * 9) * Math.cos(z * 7) + Math.max(0, edge - 0.85) * 1.6);
  }
  tissue.computeVertexNormals();
  const tm = new THREE.MeshStandardMaterial({ color: '#f6ddd4', roughness: 0.9, side: THREE.DoubleSide });
  g.add(mesh(tissue, tm));
  // contenu : chaussons + bandeau roulé
  const sl = makeSlippers(color);
  sl.scale.setScalar(0.85);
  sl.position.set(-0.32, 0.1, 0.02);
  sl.rotation.y = 0.15;
  g.add(sl);
  const roll = new THREE.Group();
  const rollMesh = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.48, 32), mats.fabric('#e6b9ad'));
  rollMesh.rotation.x = Math.PI / 2;
  roll.add(rollMesh);
  const spiral = mesh(new THREE.TorusGeometry(0.17, 0.02, 8, 32), mats.fabric(shade('#e6b9ad', 0.85)));
  spiral.position.z = 0.24;
  roll.add(spiral);
  roll.position.set(0.45, 0.32, 0.05);
  roll.rotation.y = -0.3;
  g.add(roll);
  // couvercle posé derrière
  const lid = new THREE.Group();
  lid.add(box(W + 0.06, 0.08, D + 0.06, 0.03, kraft));
  const ribbonMat = mats.fabric('#bf6b47');
  lid.add(box(W + 0.08, 0.09, 0.12, 0.02, ribbonMat));
  lid.add(box(0.12, 0.09, D + 0.08, 0.02, ribbonMat));
  const bowGeo = new THREE.TorusGeometry(0.13, 0.04, 10, 28);
  const b1 = mesh(bowGeo, ribbonMat);
  b1.position.set(-0.12, 0.1, 0);
  b1.rotation.set(Math.PI / 2, 0.5, 0);
  b1.scale.set(1, 0.6, 1);
  const b2 = b1.clone();
  b2.position.x = 0.12;
  b2.rotation.y = -0.5;
  lid.add(b1, b2);
  lid.position.set(0, 0.6, -D / 2 - 0.22);
  lid.rotation.x = -1.15;
  g.add(lid);
  // étiquette
  const label = mesh(
    new THREE.PlaneGeometry(0.62, 0.2),
    new THREE.MeshStandardMaterial({ map: T.textTexture('Maison Mellow', { bg: '#5a3a1e', fg: '#f6ecdd', font: '500 70px Fraunces, Georgia, serif' }), roughness: 0.8 })
  );
  label.position.set(0, 0.3, D / 2 + 0.002);
  g.add(label);
  g.userData.kind = 'coffret';
  return g;
}

export function makeProduct(model, color) {
  switch (model) {
    case 'chaussons': return makeSlippers(color);
    case 'bandeau': return makeBandeau(color);
    case 'nuque': return makeNuque(color);
    case 'coffret': return makeCoffret(color);
    case 'housse': return makeHousse(color);
    default: return makeHousse(color);
  }
}

// Version "posée dans le décor"
export function makeProductProp(model, color) {
  return makeProduct(model, color);
}

/* ------------------------------------------------------------------ */
/* MOBILIER                                                            */
/* ------------------------------------------------------------------ */

export function armchair(color = '#c48a5a') {
  const g = new THREE.Group();
  const f = mats.fabric(color);
  const legs = mats.wood('#8a5a36');
  g.add(box(2.2, 0.55, 1.8, 0.2, f, 0, 0.55, 0));
  g.add(box(2.2, 1.5, 0.5, 0.24, f, 0, 1.2, -0.68));
  g.add(box(0.46, 0.95, 1.8, 0.22, f, -0.92, 0.95, 0));
  g.add(box(0.46, 0.95, 1.8, 0.22, f, 0.92, 0.95, 0));
  const cushion = box(1.36, 0.32, 1.3, 0.15, mats.fabric(tint(color, 0.15)), 0, 0.96, 0.12);
  g.add(cushion);
  [[-0.9, -0.7], [0.9, -0.7], [-0.9, 0.7], [0.9, 0.7]].forEach(([x, z]) => {
    const l = mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.3, 10), legs);
    l.position.set(x, 0.15, z);
    g.add(l);
  });
  return g;
}

export function plaid(color = '#e6b9ad') {
  const geo = new THREE.PlaneGeometry(1.1, 1.8, 16, 24);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, 0.04 * Math.sin(p.getX(i) * 9));
  geo.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ map: T.knit(color), normalMap: tex('knitted_fleece', 'nor', [3, 4]), roughness: 1, side: THREE.DoubleSide });
  m.normalScale.set(1.4, 1.4);
  return mesh(geo, m);
}

export function fireplace() {
  const g = new THREE.Group();
  const brick = pbr('brick_wall_001', { color: '#efe7dd', diffuse: false, repeat: [1.6, 1.4], normal: 1.2 });
  g.add(box(3, 2.6, 0.7, 0.03, brick, 0, 1.3, 0));
  g.add(box(3.4, 0.16, 0.95, 0.03, mats.wood('#9b6a43'), 0, 2.66, 0.08));
  g.add(box(1.7, 1.25, 0.3, 0.04, mats.matte('#1c120b', 1), 0, 0.85, 0.24));
  g.add(box(2.4, 0.1, 0.7, 0.02, pbr('marble_01', { repeat: [1.2, 0.4] }), 0, 0.05, 0.55));
  // bûches
  const logMat = mats.wood('#6e4527');
  for (let i = 0; i < 3; i++) {
    const log = mesh(new THREE.CylinderGeometry(0.09, 0.1, 1.0, 12), logMat);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (i - 1) * 0.25;
    log.position.set(0, 0.32 + (i === 1 ? 0.13 : 0), 0.34 + (i - 1) * 0.04);
    g.add(log);
  }
  // braises
  const embers = mesh(new THREE.BoxGeometry(1.1, 0.06, 0.4), mats.glow('#ff5a1f', 2.5), { cast: false });
  embers.position.set(0, 0.24, 0.36);
  g.add(embers);
  // flammes
  const flames = new THREE.Group();
  const cols = ['#ffb347', '#ff8a3d', '#ffd27a'];
  for (let i = 0; i < 6; i++) {
    const fl = mesh(new THREE.ConeGeometry(0.09 + (i % 2) * 0.05, 0.45 + (i % 3) * 0.14, 12), mats.glow(cols[i % 3], 3.2), { cast: false });
    fl.position.set((i - 2.5) * 0.14, 0.62, 0.36 + (i % 2) * 0.06);
    fl.userData.phase = i * 1.7;
    flames.add(fl);
  }
  g.add(flames);
  const gl = glowSprite('#ff9a4a', 2.4, 0.45);
  gl.position.set(0, 0.8, 0.6);
  g.add(gl);
  g.userData.flames = flames;
  g.userData.glow = gl;
  return g;
}

export function candle(h = 0.3) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, h, 16), mats.matte('#fbf3e6', 0.6)));
  g.children[0].position.y = h / 2;
  const flame = mesh(new THREE.SphereGeometry(0.035, 10, 8), mats.glow('#ffcf6b', 3), { cast: false });
  flame.scale.y = 1.8;
  flame.position.y = h + 0.06;
  g.add(flame);
  const gl = glowSprite('#ffc370', 0.55, 0.6);
  gl.position.y = h + 0.07;
  g.add(gl);
  g.userData.flicker = gl;
  return g;
}

export function rug(w = 4, d = 3, colors = ['#e9d3b6']) {
  // tapis en laine, bord légèrement plus foncé
  const c = new THREE.Color(colors[0]).lerp(new THREE.Color('#f6eee4'), 0.35);
  const wool = (col, r) => {
    const m = new THREE.MeshStandardMaterial({
      color: col,
      map: tex('poly_wool_herringbone', 'diff', r),
      normalMap: tex('poly_wool_herringbone', 'nor', r),
      roughnessMap: tex('poly_wool_herringbone', 'rough', r),
      roughness: 1,
    });
    m.normalScale.set(1.4, 1.4);
    return m;
  };
  const g = new THREE.Group();
  const border = mesh(rboxGeo(w, 0.035, d, 0.015, 2), wool('#' + c.clone().multiplyScalar(0.78).getHexString(), [w / 1.2, d / 1.2]), { cast: false });
  border.position.y = 0.018;
  const inner = mesh(rboxGeo(w - 0.36, 0.04, d - 0.36, 0.015, 2), wool('#' + c.getHexString(), [w / 1.2, d / 1.2]), { cast: false });
  inner.position.y = 0.021;
  g.add(border, inner);
  return g;
}

export function plant(scale = 1, potColor = '#c98b62') {
  const g = new THREE.Group();
  const pot = mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.55, 24), mats.ceramic(potColor));
  pot.position.y = 0.275;
  g.add(pot);
  const leafMat = mats.matte('#7f8f6d', 0.75);
  const leafMat2 = mats.matte('#98a684', 0.75);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const leaf = mesh(new THREE.SphereGeometry(0.22, 12, 10), i % 2 ? leafMat : leafMat2);
    leaf.scale.set(0.55, 1.5, 0.22);
    const r = 0.18 + (i % 3) * 0.06;
    leaf.position.set(Math.cos(a) * r, 0.85 + (i % 3) * 0.18, Math.sin(a) * r);
    leaf.rotation.set(Math.sin(a) * 0.6, -a, Math.cos(a) * 0.6);
    g.add(leaf);
  }
  g.scale.setScalar(scale);
  return g;
}

export function floorLamp(shadeColor = '#f4e3c9') {
  const g = new THREE.Group();
  const metal = mats.matte('#7a5638', 0.5);
  g.add(box(0.5, 0.06, 0.5, 0.03, metal, 0, 0.03, 0));
  const pole = mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 8), metal);
  pole.position.y = 1.3;
  g.add(pole);
  const shadeM = new THREE.MeshStandardMaterial({ color: shadeColor, emissive: '#ffcf8a', emissiveIntensity: 0.55, roughness: 0.9, side: THREE.DoubleSide });
  const sh = mesh(new THREE.CylinderGeometry(0.28, 0.48, 0.55, 28, 1, true), shadeM, { cast: false });
  sh.position.y = 2.65;
  g.add(sh);
  const bulb = mesh(new THREE.SphereGeometry(0.1, 12, 10), mats.glow('#ffe1a6', 2.5), { cast: false });
  bulb.position.y = 2.5;
  g.add(bulb);
  const gl = glowSprite('#ffc982', 2.2, 0.5);
  gl.position.y = 2.5;
  g.add(gl);
  return g;
}

export function sideTable(top = '#b98557') {
  const g = new THREE.Group();
  const w = mats.wood(top);
  const t = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 32), w);
  t.position.y = 0.9;
  g.add(t);
  const leg = mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.9, 12), w);
  leg.position.y = 0.45;
  g.add(leg);
  const base = mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.05, 24), w);
  base.position.y = 0.025;
  g.add(base);
  return g;
}

export function mug(color = '#bf6b47') {
  const g = new THREE.Group();
  const m = mats.ceramic(color);
  const body = mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.26, 24), m);
  body.position.y = 0.13;
  g.add(body);
  const handle = mesh(new THREE.TorusGeometry(0.07, 0.022, 8, 16), m);
  handle.position.set(0.14, 0.14, 0);
  g.add(handle);
  const tea = mesh(new THREE.CircleGeometry(0.11, 20), mats.matte('#a8683a', 0.4));
  tea.rotation.x = -Math.PI / 2;
  tea.position.y = 0.245;
  g.add(tea);
  return g;
}

export function teapot(color = '#a3ad8f') {
  const g = new THREE.Group();
  const m = mats.ceramic(color);
  const body = mesh(new THREE.SphereGeometry(0.32, 28, 20), m);
  body.scale.y = 0.8;
  body.position.y = 0.27;
  g.add(body);
  const lid = mesh(new THREE.SphereGeometry(0.14, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), m);
  lid.position.y = 0.5;
  g.add(lid);
  const knob = mesh(new THREE.SphereGeometry(0.045, 10, 8), mats.wood('#8a5a36'));
  knob.position.y = 0.66;
  g.add(knob);
  const spout = mesh(new THREE.CylinderGeometry(0.035, 0.07, 0.36, 12), m);
  spout.position.set(0.36, 0.33, 0);
  spout.rotation.z = -0.9;
  g.add(spout);
  const handle = mesh(new THREE.TorusGeometry(0.15, 0.03, 8, 20, Math.PI * 1.2), m);
  handle.position.set(-0.3, 0.3, 0);
  handle.rotation.z = Math.PI / 2 + 0.3;
  g.add(handle);
  return g;
}

export function bed(duvet = '#e6b9ad') {
  const g = new THREE.Group();
  const frame = mats.wood('#c49a72');
  g.add(box(3.3, 0.45, 4.1, 0.05, frame, 0, 0.42, 0));
  g.add(box(3.4, 2.1, 0.3, 0.08, mats.velvet('#c98f7a', 2), 0, 1.3, -2.0));
  g.add(box(3.1, 0.45, 3.8, 0.12, tissu('rough_linen', '#fbf4ea', { repeat: [3, 3] }), 0, 0.85, 0.05));
  const duv = rboxGeo(3.25, 0.3, 2.9, 0.14, 4).clone();
  fluff(duv, 0.025, 4);
  const d = mesh(duv, tissu('waffle_pique_cotton', duvet, { repeat: [5, 5], normal: 1.2 }));
  d.position.set(0, 1.1, 0.55);
  g.add(d);
  g.add(box(3.27, 0.2, 0.5, 0.08, tissu('rough_linen', '#f6efe6', { repeat: [3, 1] }), 0, 1.2, -0.75));
  [-0.75, 0.75].forEach((x) => {
    const pg = rboxGeo(1.2, 0.36, 0.7, 0.17, 4).clone();
    fluff(pg, 0.02, 5);
    const p = mesh(pg, tissu('rough_linen', '#fffaf3', { repeat: [2, 1] }));
    p.position.set(x, 1.28, -1.45);
    p.rotation.x = -0.25;
    g.add(p);
  });
  const deco = box(0.8, 0.5, 0.25, 0.12, mats.velvet('#bf6b47', 1), 0, 1.36, -1.08);
  deco.rotation.x = -0.3;
  g.add(deco);
  // plaid en maille au pied du lit
  const throwB = box(3.3, 0.06, 1.0, 0.03, mats.knit('#d9a679', 3), 0, 1.27, 1.45);
  g.add(throwB);
  return g;
}

export function nightstand() {
  const g = new THREE.Group();
  const w = mats.wood('#c49a72');
  g.add(box(0.9, 0.9, 0.8, 0.08, w, 0, 0.45, 0));
  g.add(box(0.7, 0.03, 0.02, 0.01, mats.matte('#7a5638'), 0, 0.6, 0.41));
  const lamp = new THREE.Group();
  const base = mesh(new THREE.SphereGeometry(0.16, 20, 14), mats.ceramic('#efe2cf'));
  base.position.y = 0.14;
  lamp.add(base);
  const sh = mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.3, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#fbefdc', emissive: '#ffcf8a', emissiveIntensity: 0.6, side: THREE.DoubleSide }), { cast: false });
  sh.position.y = 0.45;
  lamp.add(sh);
  const gl = glowSprite('#ffc982', 1.4, 0.55);
  gl.position.y = 0.42;
  lamp.add(gl);
  lamp.position.set(-0.15, 0.9, -0.05);
  g.add(lamp);
  return g;
}

export function bookshelf() {
  const g = new THREE.Group();
  const w = mats.wood('#b98557');
  g.add(box(2.2, 3.4, 0.06, 0.02, mats.matte('#8a5f3c'), 0, 1.7, -0.27));
  [-1.07, 1.07].forEach((x) => g.add(box(0.08, 3.4, 0.6, 0.02, w, x, 1.7, 0)));
  for (let s = 0; s <= 4; s++) g.add(box(2.2, 0.07, 0.6, 0.02, w, 0, 0.2 + s * 0.8, 0));
  const cav = mats.matte('#8a5f3c');
  const colors = ['#bf6b47', '#a3ad8f', '#efe2cf', '#e6b9ad', '#7a5638', '#d9a679', '#5a3a1e'];
  let k = 0;
  for (let s = 0; s < 4; s++) {
    const y = 0.25 + s * 0.8;
    void cav;
    let x = -0.92;
    while (x < 0.85) {
      const bw = 0.08 + ((k * 37) % 7) * 0.012;
      const bh = 0.48 + ((k * 53) % 5) * 0.04;
      const b = box(bw, bh, 0.36, 0.015, mats.matte(colors[k % colors.length], 0.8), x + bw / 2, y + bh / 2 + 0.03, 0.02);
      if (k % 9 === 4) b.rotation.z = -0.25;
      g.add(b);
      x += bw + 0.01;
      k++;
      if (k % 11 === 7) x += 0.25;
    }
  }
  return g;
}

export function pouf(color = '#d9a679') {
  const geo = new THREE.CylinderGeometry(0.6, 0.6, 0.6, 32, 4);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const k = 1 + 0.12 * Math.cos((y / 0.6) * Math.PI);
    p.setX(i, p.getX(i) * k);
    p.setZ(i, p.getZ(i) * k);
  }
  geo.computeVertexNormals();
  fluff(geo, 0.012, 14);
  const m = mesh(geo, new THREE.MeshStandardMaterial({ map: T.knit(color, '#f4e3c9'), roughness: 1 }));
  m.position.y = 0.3;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

export function frame(variant = 0, w = 1.1, h = 1.4) {
  const g = new THREE.Group();
  g.add(box(w, h, 0.08, 0.03, mats.wood('#9b6a43')));
  const art = mesh(new THREE.PlaneGeometry(w - 0.16, h - 0.16), new THREE.MeshStandardMaterial({ map: T.artTexture(variant), roughness: 0.9 }), { cast: false });
  art.position.z = 0.045;
  g.add(art);
  return g;
}

export function windowFrame(w = 1.6, h = 2) {
  const g = new THREE.Group();
  const f = mats.matte('#fbf4ea', 0.6);
  const pane = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: T.windowView() }), { cast: false, receive: false });
  pane.position.z = 0.01;
  g.add(pane);
  g.add(box(w + 0.2, 0.12, 0.14, 0.04, f, 0, h / 2, 0.05));
  g.add(box(w + 0.2, 0.14, 0.3, 0.04, f, 0, -h / 2, 0.1));
  g.add(box(0.12, h, 0.14, 0.04, f, -w / 2, 0, 0.05));
  g.add(box(0.12, h, 0.14, 0.04, f, w / 2, 0, 0.05));
  g.add(box(0.06, h, 0.08, 0.02, f, 0, 0, 0.05));
  g.add(box(w, 0.06, 0.08, 0.02, f, 0, 0.1, 0.05));
  // rideaux
  const cur = mats.fabric('#f1dfc6');
  [-1, 1].forEach((s) => {
    const geo = new THREE.BoxGeometry(0.42, h + 0.5, 0.06, 1, 24, 6);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      p.setZ(i, p.getZ(i) + 0.05 * Math.sin(p.getX(i) * 22 + y));
    }
    geo.computeVertexNormals();
    const c = mesh(geo, cur);
    c.position.set(s * (w / 2 + 0.25), 0.05, 0.16);
    g.add(c);
  });
  return g;
}

export function coatRack() {
  const g = new THREE.Group();
  const w = mats.wood('#9b6a43');
  g.add(box(2.0, 0.14, 0.12, 0.04, w, 0, 2.6, 0.05));
  const colors = ['#bf6b47', '#a3ad8f', '#e6b9ad'];
  for (let i = 0; i < 3; i++) {
    const peg = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), w);
    peg.rotation.x = Math.PI / 2;
    peg.position.set(-0.6 + i * 0.6, 2.55, 0.18);
    g.add(peg);
    // écharpe qui pend
    const sc = new THREE.BoxGeometry(0.32, 1.3, 0.08, 1, 16, 1);
    const p = sc.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k);
      p.setZ(k, p.getZ(k) + 0.06 * Math.sin(y * 4 + i));
    }
    sc.computeVertexNormals();
    const s = mesh(sc, mats.fabric(colors[i]));
    s.position.set(-0.6 + i * 0.6, 1.85, 0.22);
    g.add(s);
  }
  return g;
}

export function bench(color = '#a3ad8f') {
  const g = new THREE.Group();
  const w = mats.wood('#c49a72');
  g.add(box(2.0, 0.12, 0.7, 0.04, w, 0, 0.7, 0));
  g.add(box(2.0, 0.08, 0.6, 0.03, w, 0, 0.28, 0));
  [[-0.9], [0.9]].forEach(([x]) => g.add(box(0.1, 0.7, 0.66, 0.03, w, x, 0.35, 0)));
  g.add(box(1.8, 0.2, 0.6, 0.1, mats.fabric(color), 0, 0.86, 0));
  return g;
}

export function doormat(text = 'Bienvenue') {
  const m = mesh(new THREE.BoxGeometry(1.8, 0.03, 1.1), new THREE.MeshStandardMaterial({ map: T.textTexture(text, { bg: '#c9a27a', fg: '#5a3a1e', font: '600 74px Jost, Arial, sans-serif' }), roughness: 1 }), { cast: false });
  m.position.y = 0.015;
  return m;
}

export function kitchen(len = 3.6) {
  const g = new THREE.Group();
  const cab = pbr('kitchen_wood', { color: '#a7b29a', diffuse: false, repeat: [1, 1], normal: 0.6 });
  const top = pbr('marble_01', { repeat: [2, 0.6] });
  g.add(box(len, 1.7, 1.1, 0.02, cab, 0, 0.85, 0));
  g.add(box(len + 0.2, 0.1, 1.25, 0.02, top, 0, 1.75, 0.04));
  const n = Math.round(len / 1.2);
  const dw = len / n;
  const door = pbr('kitchen_wood', { color: '#b3bda6', diffuse: false, repeat: [0.5, 1], normal: 0.6 });
  const brass = new THREE.MeshStandardMaterial({ color: '#c9a25a', metalness: 0.8, roughness: 0.35 });
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + dw * (i + 0.5);
    g.add(box(dw - 0.08, 1.35, 0.04, 0.01, door, x, 0.82, 0.56));
    g.add(box(0.3, 0.04, 0.05, 0.02, brass, x, 1.35, 0.6));
  }
  // crédence carrelée
  g.add(box(len, 1.2, 0.04, 0.01, pbr('floor_tiles_06', { repeat: [len / 1.4, 0.9], color: '#fbf6ee' }), 0, 2.4, -0.53));
  return g;
}

export function roundTable(color = '#c49a72') {
  const g = new THREE.Group();
  const w = mats.wood(color);
  const t = mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.1, 40), w);
  t.position.y = 1.35;
  g.add(t);
  const leg = mesh(new THREE.CylinderGeometry(0.1, 0.16, 1.3, 14), w);
  leg.position.y = 0.67;
  g.add(leg);
  const base = mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.06, 28), w);
  base.position.y = 0.03;
  g.add(base);
  return g;
}

export function chair(color = '#bf6b47') {
  const g = new THREE.Group();
  const w = mats.wood('#b98557');
  g.add(box(0.85, 0.1, 0.85, 0.04, w, 0, 0.85, 0));
  g.add(box(0.85, 0.9, 0.1, 0.04, w, 0, 1.35, -0.38));
  [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]].forEach(([x, z]) => g.add(box(0.08, 0.85, 0.08, 0.02, w, x, 0.42, z)));
  g.add(box(0.75, 0.12, 0.75, 0.06, mats.fabric(color), 0, 0.95, 0.02));
  return g;
}

export function pendant(color = '#bf6b47') {
  const g = new THREE.Group();
  const cord = mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.6, 6), mats.matte('#3a2618'), { cast: false });
  cord.position.y = 0.8;
  g.add(cord);
  const sh = mesh(new THREE.SphereGeometry(0.42, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color, roughness: 0.6, side: THREE.DoubleSide }), { cast: false });
  g.add(sh);
  const bulb = mesh(new THREE.SphereGeometry(0.12, 12, 10), mats.glow('#ffe1a6', 2.5), { cast: false });
  bulb.position.y = -0.02;
  g.add(bulb);
  const gl = glowSprite('#ffc982', 2.0, 0.5);
  gl.position.y = -0.15;
  g.add(gl);
  return g;
}

export function stairs(steps = 12, rise = 0.45, run = 0.38, width = 1.9) {
  const g = new THREE.Group();
  const w = mats.wood('#c49a72');
  for (let i = 0; i < steps; i++) {
    g.add(box(run + 0.02, rise * (i + 1), width, 0.03, w, i * run + run / 2, (rise * (i + 1)) / 2, 0));
  }
  // rampe
  const rail = mesh(new THREE.CylinderGeometry(0.04, 0.04, Math.hypot(steps * run, steps * rise) + 0.4, 8), mats.wood('#8a5a36'));
  rail.rotation.z = -Math.atan2(steps * run, steps * rise);
  rail.position.set((steps * run) / 2, (steps * rise) / 2 + 1.1, width / 2 - 0.05);
  g.add(rail);
  for (let i = 0; i < steps; i += 2) {
    const post = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), mats.wood('#8a5a36'));
    post.position.set(i * run + run / 2, rise * (i + 1) + 0.55, width / 2 - 0.05);
    g.add(post);
  }
  return g;
}

export function ladder(h = 5.6) {
  const g = new THREE.Group();
  const w = mats.wood('#b98557');
  [-0.35, 0.35].forEach((x) => g.add(box(0.1, h, 0.1, 0.03, w, x, h / 2, 0)));
  for (let y = 0.4; y < h; y += 0.45) g.add(box(0.7, 0.07, 0.08, 0.02, w, 0, y, 0));
  return g;
}

export function bathtub() {
  const g = new THREE.Group();
  const white = mats.ceramic('#fbf7f0');
  g.add(box(3.0, 1.0, 1.5, 0.45, white, 0, 0.62, 0));
  const water = mesh(new THREE.PlaneGeometry(2.5, 1.0), new THREE.MeshPhysicalMaterial({ color: '#cfe0dc', roughness: 0.1, transmission: 0, clearcoat: 1 }), { cast: false });
  water.rotation.x = -Math.PI / 2;
  water.position.y = 1.0;
  g.add(water);
  // mousse
  for (let i = 0; i < 14; i++) {
    const b = mesh(new THREE.SphereGeometry(0.12 + (i % 4) * 0.04, 12, 10), mats.matte('#ffffff', 0.6));
    b.position.set(-1 + (i * 0.37) % 2.1, 1.04, -0.35 + ((i * 0.53) % 0.8));
    g.add(b);
  }
  [[-1.3, -0.55], [1.3, -0.55], [-1.3, 0.55], [1.3, 0.55]].forEach(([x, z]) => {
    const f = mesh(new THREE.SphereGeometry(0.09, 10, 8), mats.matte('#c9a27a', 0.4));
    f.position.set(x, 0.08, z);
    g.add(f);
  });
  return g;
}

export function towel(color = '#e6b9ad') {
  const g = new THREE.Group();
  g.add(box(1.2, 0.06, 0.06, 0.02, mats.matte('#c9a27a', 0.4), 0, 1.8, 0));
  const geo = new THREE.BoxGeometry(0.9, 1.1, 0.06, 1, 10, 1);
  const t = mesh(geo, mats.fabric(color));
  t.position.set(0, 1.25, 0.05);
  g.add(t);
  return g;
}

export function mirror() {
  const g = new THREE.Group();
  const r = mesh(new THREE.TorusGeometry(0.62, 0.06, 12, 48), mats.wood('#c9a27a'));
  g.add(r);
  const glass = mesh(new THREE.CircleGeometry(0.6, 40), new THREE.MeshPhysicalMaterial({ color: '#e8eee9', roughness: 0.05, metalness: 0.6 }), { cast: false });
  g.add(glass);
  return g;
}

export function giftBox(w, h, d, color, ribbon = '#fbf3e6') {
  const g = new THREE.Group();
  g.add(box(w, h, d, 0.04, mats.matte(color, 0.7), 0, h / 2, 0));
  g.add(box(w + 0.04, 0.12, d + 0.04, 0.03, mats.matte(color, 0.7), 0, h, 0));
  const rm = mats.fabric(ribbon);
  g.add(box(w + 0.05, h + 0.13, 0.1, 0.02, rm, 0, h / 2 + 0.01, 0));
  g.add(box(0.1, h + 0.13, d + 0.05, 0.02, rm, 0, h / 2 + 0.01, 0));
  const bow = mesh(new THREE.TorusGeometry(0.1, 0.035, 8, 20), rm);
  bow.position.set(-0.09, h + 0.12, 0);
  bow.rotation.set(0, 0, 0.6);
  const bow2 = bow.clone();
  bow2.position.x = 0.09;
  bow2.rotation.z = -0.6;
  g.add(bow, bow2);
  return g;
}

export function fir(h = 2.6, color = '#7f8f6d') {
  const g = new THREE.Group();
  const m = mats.matte(color, 0.8);
  for (let i = 0; i < 3; i++) {
    const c = mesh(new THREE.ConeGeometry(h * (0.38 - i * 0.08), h * 0.45, 20), m);
    c.position.y = h * (0.3 + i * 0.22);
    g.add(c);
  }
  const trunk = mesh(new THREE.CylinderGeometry(0.08, 0.1, h * 0.2, 8), mats.wood('#7a5638'));
  trunk.position.y = h * 0.08;
  g.add(trunk);
  // neige
  const snow = mats.matte('#fbf6ef', 0.9);
  for (let i = 0; i < 3; i++) {
    const s = mesh(new THREE.ConeGeometry(h * (0.38 - i * 0.08) * 0.55, h * 0.16, 20), snow);
    s.position.y = h * (0.3 + i * 0.22) + h * 0.15;
    g.add(s);
  }
  return g;
}

export function lantern() {
  const g = new THREE.Group();
  const dark = mats.matte('#5a3a1e', 0.5);
  g.add(box(0.36, 0.06, 0.36, 0.02, dark, 0, 0.03, 0));
  g.add(box(0.36, 0.06, 0.36, 0.02, dark, 0, 0.62, 0));
  const glass = mesh(new THREE.BoxGeometry(0.3, 0.52, 0.3), mats.glow('#ffd08a', 1.2), { cast: false });
  glass.position.y = 0.33;
  g.add(glass);
  const roof = mesh(new THREE.ConeGeometry(0.28, 0.2, 4), dark);
  roof.position.y = 0.75;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  const gl = glowSprite('#ffc370', 1.3, 0.45);
  gl.position.y = 0.35;
  g.add(gl);
  return g;
}

// Guirlande lumineuse (petits points chauds)
export function garland(points, count = 40) {
  const curve = new THREE.CatmullRomCurve3(points);
  const g = new THREE.Group();
  const wire = mesh(new THREE.TubeGeometry(curve, 80, 0.012, 5, false), mats.matte('#5a3a1e'), { cast: false });
  g.add(wire);
  const geo = new THREE.SphereGeometry(0.05, 8, 6);
  const im = new THREE.InstancedMesh(geo, mats.glow('#ffd58f', 3), count);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    const p = curve.getPoint((i + 0.5) / count);
    m4.makeTranslation(p.x, p.y - 0.04, p.z);
    im.setMatrixAt(i, m4);
  }
  g.add(im);
  return g;
}
