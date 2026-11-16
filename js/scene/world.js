// La Maison Mellow en 3D : une maison de poupée que l'on visite pièce par pièce
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as M from './models.js';
import * as T from './textures.js';
import { pbr, modele, manager } from './realisme.js';
import { ETAPES, VUES, DERNIERE } from './parcours.js';

const { box, mats } = M;

/* ------------------------------------------------------------------ */
/* Plan de la maison                                                    */
/* ------------------------------------------------------------------ */
const COLS = [0, 9, 18];           // centre des colonnes de pièces (x)
const LEVEL = [0, 5.4, 10.8];      // hauteur des planchers
const LEFT = -4.5;
const RIGHT = 22.5;
const FRONT = 3.5;
const BACK = -3.5;
const PEAK = 17.3;
const SLOPE = (PEAK - LEVEL[2]) / 13.5;
const ALPHA = Math.atan(SLOPE);

const UP = new THREE.Vector3(0, 1, 0);
// lampe allumée la plus proche, pour chaque étape de la visite
const LAMPES = [
  [0.8, 2.6, 5.5], [0.8, 2.6, 5.0], [0.4, 3.3, -0.2], [0.4, 3.3, -0.2], [12.75, 1.9, -1.5], [17.9, 3.3, 1.3], [19, 4.5, -2],
  [18.05, 7.3, -0.75], [18.05, 7.3, -0.75], [9.75, 7.9, -2.5], [7, 8.6, -1], [13.0, 12.5, -1.55], [9, 14.2, -0.8], [9, 8, 6],
].map((p) => new THREE.Vector3(...p));

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

export class World {
  constructor(canvas, { reducedMotion = false, lite = false } = {}) {
    this.canvas = canvas;
    this.reducedMotion = reducedMotion;
    this.lite = lite;
    this.s = 0;
    this.pointer = new THREE.Vector2();
    this.pointerSmooth = new THREE.Vector2();
    this.time = 0;
    this.hotspots = [];
    this.clickables = [];
    this.hovered = null;
    this.ray = new THREE.Raycaster();
    this.flickers = [];
    this.steams = [];
    this.loading = [];
    this.paused = false;
    this.intro = reducedMotion ? 0 : 1;

    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.4 : 1.75));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.08;
    r.shadowMap.enabled = !lite;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 260);

    // reflets et lumière d'ambiance : une vraie pièce éclairée par un feu de cheminée (HDRI)
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    new HDRLoader(manager).load('assets/textures/fireplace_1k.hdr', (hdr) => {
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.environment = pmrem.fromEquirectangular(hdr).texture;
      this.scene.environmentIntensity = 0.55;
      hdr.dispose();
    });

    // rendu "photo" : ombres de contact (GTAO) et halo des lampes
    if (!lite) {
      const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
      this.composer = new EffectComposer(r, rt);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.gtao = new GTAOPass(this.scene, this.camera, 512, 512, undefined, { radius: 0.7, thickness: 1.5, distanceFallOff: 1, scale: 1.1, samples: 16 });
      this.gtao.blendIntensity = 0.9;
      this.composer.addPass(this.gtao);
      this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.32, 0.55, 0.9);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }

    this._backdrop();
    this._lights();
    this._house();
    this._facade();
    this._roof();
    this._exterior();
    this._rooms();
    this._path();
    this._particles();
    this._buildParcours();
    // les meubles se chargent en arrière-plan ; on attend au plus 20 s
    this.ready = Promise.race([Promise.all(this.loading), new Promise((r) => setTimeout(r, 20000))]);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /* ---------------------------- Ambiance ---------------------------- */
  _backdrop() {
    const mat = new THREE.ShaderMaterial({
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      uniforms: {
        top: { value: new THREE.Color('#ead2c0') },
        bottom: { value: new THREE.Color('#f8eee2') },
        glow: { value: new THREE.Color('#ffc58f') },
        warmth: { value: 0 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
      fragmentShader: `
        uniform vec3 top; uniform vec3 bottom; uniform vec3 glow; uniform float warmth;
        varying vec2 vUv;
        void main(){
          vec3 c = mix(bottom, top, smoothstep(0.05, 1.0, vUv.y));
          float d = distance(vUv, vec2(0.6, 0.42));
          c = mix(c, glow, (1.0 - smoothstep(0.0, 0.8, d)) * (0.18 + 0.32 * warmth));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    q.frustumCulled = false;
    q.renderOrder = -1000;
    q.userData.noAO = true;
    this.backdrop = q;
    this.scene.add(q);
    // ciel d'un soir d'hiver : bleu nuit en haut, lueur chaude à l'horizon
    this.skyCold = { top: new THREE.Color('#26314d'), bottom: new THREE.Color('#c99c8c') };
    this.skyWarm = { top: new THREE.Color('#2b2f4f'), bottom: new THREE.Color('#e3a77e') };
  }

  _lights() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight('#fff1df', '#8a6446', 0.6);
    s.add(this.hemi);
    const key = (this.key = new THREE.DirectionalLight('#ffe2c0', 1.25));
    key.position.set(-6, 16, 30);
    key.target.position.set(9, 6, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.03;
    key.shadow.radius = 4;
    const sc = key.shadow.camera;
    sc.left = -22; sc.right = 22; sc.top = 16; sc.bottom = -14; sc.near = 5; sc.far = 80;
    s.add(key, key.target);
    const fill = new THREE.DirectionalLight('#c9d4ff', 0.25);
    fill.position.set(30, 10, -12);
    s.add(fill);
    // feu de cheminée et lampe la plus proche
    this.fireLight = new THREE.PointLight('#ff8a3a', 9, 9, 1.8);
    this.fireLight.position.set(10.2, 1.0, -2.3);
    s.add(this.fireLight);
    this.lampLight = new THREE.PointLight('#ffcb92', 8, 8, 1.8);
    s.add(this.lampLight);
    this.roomLight = new THREE.PointLight('#ffcf9e', 10, 14, 1.6);
    this.roomLight.position.set(0.8, 2.8, 6);
    s.add(this.roomLight);
    this.cursorLight = new THREE.PointLight('#ffc98f', 0, 7, 2);
    s.add(this.cursorLight);
  }

  /* ------------------------------ Maison ----------------------------- */
  _house() {
    const H = (this.house = new THREE.Group());
    this.scene.add(H);
    const slab = pbr('white_plaster_02', { color: '#f4eee7', diffuse: false, repeat: [4, 2] });
    const trim = mats.wood('#7a5638');
    const plasterIn = pbr('painted_plaster_wall', { color: '#f2e9dd', diffuse: false, repeat: [1.2, 1.6], normal: 0.8 });
    const plasterOut = pbr('white_plaster_02', { color: '#efe4d6', repeat: [2, 3] });

    // Fondations
    H.add(box(28.6, 0.6, 8.4, 0.1, mats.matte('#d6c2a8', 0.95), 9, -0.3, -0.1));
    H.add(box(28.7, 0.12, 0.14, 0.03, trim, 9, -0.02, FRONT + 0.02));

    // Dalles entre les étages (avec trémies pour l'escalier et l'échelle)
    const slabAt = (x0, x1, z0, z1, y) => {
      const m = box(x1 - x0, 0.4, z1 - z0, 0.02, slab, (x0 + x1) / 2, y, (z0 + z1) / 2);
      H.add(m);
      return m;
    };
    slabAt(LEFT, 17.7, BACK, FRONT, 5.2);
    slabAt(17.7, RIGHT, -1.25, FRONT, 5.2);
    slabAt(LEFT, 4.6, BACK, FRONT, 10.6);
    slabAt(6.8, RIGHT, BACK, FRONT, 10.6);
    slabAt(4.6, 6.8, -0.9, FRONT, 10.6);
    // bandeaux bois sur la tranche avant (effet "maison de poupée")
    [5.2, 10.6].forEach((y) => H.add(box(27.2, 0.42, 0.12, 0.03, trim, 9, y, FRONT + 0.04)));

    // Sols
    const floor = (x0, x1, z0, z1, y, mat) => {
      const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ((x1 - x0) / 9), uv.getY(i) * ((z1 - z0) / 9));
      const m = M.mesh(geo, mat, { cast: false });
      m.rotation.x = -Math.PI / 2;
      m.position.set((x0 + x1) / 2, y + 0.006, (z0 + z1) / 2);
      H.add(m);
    };
    // vrais sols : parquet, carrelage, marbre, vieux plancher
    const oak = pbr('wood_floor', { repeat: [2.4, 2.4] });
    const parquet = pbr('herringbone_parquet', { repeat: [3, 3] });
    const planks = pbr('plank_flooring_02', { repeat: [2.2, 2.2] });
    const attic = pbr('old_wood_floor', { repeat: [2.2, 2.2] });
    floor(LEFT, 4.5, BACK, FRONT, 0, oak);
    floor(4.5, 13.5, BACK, FRONT, 0, parquet);
    floor(13.5, RIGHT, BACK, FRONT, 0, pbr('floor_tiles_06', { repeat: [4.5, 4.5] }));
    floor(LEFT, 4.5, BACK, FRONT, LEVEL[1], pbr('marble_tiles', { repeat: [3, 3] }));
    floor(4.5, 13.5, BACK, FRONT, LEVEL[1], planks);
    floor(13.5, 17.7, BACK, FRONT, LEVEL[1], planks);
    floor(17.7, RIGHT, -1.25, FRONT, LEVEL[1], planks);
    floor(LEFT, 4.6, BACK, FRONT, LEVEL[2], attic);
    floor(6.8, RIGHT, BACK, FRONT, LEVEL[2], attic);
    floor(4.6, 6.8, -0.9, FRONT, LEVEL[2], attic);
    // garde-corps autour de la trappe du grenier
    this.house.add(box(2.3, 0.07, 0.07, 0.02, mats.wood('#8a5a36'), 5.7, LEVEL[2] + 1.0, -0.85));
    [4.65, 5.7, 6.75].forEach((x) => this.house.add(box(0.05, 1.0, 0.05, 0.01, mats.wood('#8a5a36'), x, LEVEL[2] + 0.5, -0.85)));

    // Murs du fond : enduit peint, une teinte douce par pièce
    const papers = [
      [0, 0, '#efe2d0'],
      [1, 0, '#ead3bb'],
      [2, 0, '#e3e5d4'],
      [0, 1, '#e2e9e6'],
      [1, 1, '#ecdcc8'],
      [2, 1, '#f1ddd3'],
    ];
    papers.forEach(([c, l, teinte]) => {
      const m = M.mesh(new THREE.BoxGeometry(9, 5.4, 0.3), pbr('painted_plaster_wall', { color: teinte, diffuse: false, repeat: [3, 1.8], normal: 0.8 }));
      m.position.set(COLS[c], LEVEL[l] + 2.7, BACK - 0.15);
      H.add(m);
      // plinthe
      H.add(box(9, 0.22, 0.06, 0.02, mats.matte('#fbf4ea', 0.7), COLS[c], LEVEL[l] + 0.11, BACK + 0.03));
    });
    // Murs latéraux
    [LEFT - 0.15, RIGHT + 0.15].forEach((x) => {
      const m = M.mesh(new THREE.BoxGeometry(0.3, 10.8, 7.3), plasterOut);
      m.position.set(x, 5.4, -0.15);
      H.add(m);
      H.add(box(0.36, 10.85, 0.14, 0.03, trim, x, 5.4, FRONT + 0.03));
    });
    // Cloisons (demi-profondeur pour laisser passer le chemin)
    [4.5, 13.5].forEach((x) =>
      [0, 1].forEach((l) => {
        const m = M.mesh(new THREE.BoxGeometry(0.24, 5.0, 3.5), plasterIn);
        m.position.set(x, LEVEL[l] + 2.5, BACK + 1.75);
        H.add(m);
        H.add(box(0.3, 5.0, 0.12, 0.03, mats.wood('#c49a72'), x, LEVEL[l] + 2.5, -0.02));
      })
    );
    // Pignon du grenier
    const gable = new THREE.Shape();
    gable.moveTo(LEFT, LEVEL[2]);
    gable.lineTo(RIGHT, LEVEL[2]);
    gable.lineTo(9, PEAK);
    gable.closePath();
    const hole = new THREE.Path();
    hole.absarc(9, 13.9, 1.05, 0, Math.PI * 2, true);
    gable.holes.push(hole);
    const gGeo = new THREE.ExtrudeGeometry(gable, { depth: 0.3, bevelEnabled: false });
    const gMesh = M.mesh(gGeo, pbr('plank_flooring_02', { repeat: [0.28, 0.28], color: '#e9d3b8', diffuse: false, rotation: Math.PI / 2 }));
    gMesh.position.z = BACK - 0.3;
    H.add(gMesh);
    const rw = M.mesh(new THREE.CircleGeometry(1.05, 40), new THREE.MeshBasicMaterial({ map: T.windowView() }), { cast: false });
    rw.position.set(9, 13.9, BACK - 0.2);
    H.add(rw);
    const rf = M.mesh(new THREE.TorusGeometry(1.08, 0.1, 10, 48), mats.matte('#fbf4ea', 0.6));
    rf.position.set(9, 13.9, BACK + 0.02);
    H.add(rf);
    H.add(box(0.08, 2.1, 0.08, 0.02, mats.matte('#fbf4ea'), 9, 13.9, BACK + 0.02));
    H.add(box(2.1, 0.08, 0.08, 0.02, mats.matte('#fbf4ea'), 9, 13.9, BACK + 0.02));
  }

  _roof() {
    const over = 1.5;
    const len0 = (13.5 + over) / Math.cos(ALPHA);
    const roofMat = pbr('clay_roof_tiles', { repeat: [len0 / 2.6, 9.4 / 2.6], color: '#d9b3a0' });
    const under = pbr('plank_flooring_02', { repeat: [len0 / 4, 2], color: '#bfa58a', diffuse: false });
    const hx = 13.5 + over;
    const len = hx / Math.cos(ALPHA);
    [-1, 1].forEach((side) => {
      const g = new THREE.Group();
      const top = M.mesh(new THREE.BoxGeometry(len, 0.5, 9.4), [roofMat, roofMat, roofMat, under, roofMat, roofMat]);
      g.add(top);
      const xMid = side < 0 ? 9 - hx / 2 : 9 + hx / 2;
      const yLine = LEVEL[2] + (13.5 - Math.abs(xMid - 9)) * SLOPE;
      g.position.set(xMid + side * 0.25 * Math.sin(ALPHA), yLine + 0.25 * Math.cos(ALPHA), -0.1);
      g.rotation.z = -side * ALPHA;
      this.house.add(g);
      // rive de toit
      const edge = box(len, 0.16, 0.16, 0.05, mats.wood('#5a3a1e'), 0, -0.05, 4.7);
      g.add(edge);
    });
    const ridge = M.mesh(new THREE.CylinderGeometry(0.3, 0.3, 9.6, 16), mats.wood('#5a3a1e'));
    ridge.rotation.x = Math.PI / 2;
    ridge.position.set(9, PEAK + 0.5, -0.1);
    this.house.add(ridge);
    // cheminée
    const ch = new THREE.Group();
    ch.add(box(1.2, 3.4, 1.2, 0.02, pbr('brick_wall_001', { repeat: [0.8, 2] }), 0, 1.7, 0));
    ch.add(box(1.5, 0.3, 1.5, 0.06, mats.matte('#7a5638', 0.9), 0, 3.45, 0));
    ch.add(box(1.25, 0.3, 1.25, 0.12, mats.matte('#fbf6ef', 0.9), 0, 3.66, 0));
    ch.position.set(15.6, 13.4, -1.6);
    this.house.add(ch);
    this.chimneyTop = new THREE.Vector3(15.6, 17.4, -1.6);
  }

  _facade() {
    const plaster = pbr('white_plaster_02', { color: '#f4ead9', diffuse: false, repeat: [0.16, 0.16], normal: 1.2, transparent: true });
    const trimM = pbr('fine_grained_wood', { color: '#a77a58', repeat: [1, 1], transparent: true });
    const frameM = new THREE.MeshStandardMaterial({ color: '#fbf4ea', roughness: 0.6, transparent: true });
    const paneM = new THREE.MeshBasicMaterial({ map: T.warmWindow(), transparent: true });
    const doorM = pbr('fine_grained_wood', { color: '#c97c52', repeat: [0.6, 0.6], transparent: true });
    const greenM = new THREE.MeshStandardMaterial({ color: '#7f8f6d', roughness: 0.8, transparent: true });
    this.facadeMats = [plaster, trimM, frameM, paneM, doorM, greenM];

    const WINS = [
      [-2.6, 2.4, 1.4, 1.8], [6.4, 2.5, 1.8, 2.2], [11.6, 2.5, 1.8, 2.2], [15.4, 2.5, 1.8, 2.2], [20.6, 2.5, 1.8, 2.2],
      [0, 7.9, 2.0, 2.2], [6.4, 7.9, 1.8, 2.2], [11.6, 7.9, 1.8, 2.2], [15.4, 7.9, 1.8, 2.2], [20.6, 7.9, 1.8, 2.2],
    ];
    const CIRCLES = [[6.4, 12.7, 0.75], [11.6, 12.7, 0.75]];
    const DOOR = [0.8, 1.65, 1.8, 3.3];
    const Z0 = FRONT + 0.06;
    const DEPTH = 0.3;
    this.facade = [];

    [-1, 1].forEach((side) => {
      const x0 = side < 0 ? LEFT - 0.3 : 9;
      const x1 = side < 0 ? 9 : RIGHT + 0.3;
      const hingeX = side < 0 ? x0 : x1;
      const sh = new THREE.Shape();
      sh.moveTo(x0, -0.6);
      sh.lineTo(x1, -0.6);
      if (side < 0) {
        sh.lineTo(x1, PEAK);
        sh.lineTo(x0, LEVEL[2] - 0.15);
      } else {
        sh.lineTo(x1, LEVEL[2] - 0.15);
        sh.lineTo(x0, PEAK);
      }
      sh.closePath();
      const inHalf = (x) => (side < 0 ? x < 9 : x > 9);
      const pivot = new THREE.Group();
      pivot.position.set(hingeX, 0, Z0 + DEPTH);
      const content = new THREE.Group();
      content.position.set(-hingeX, 0, -(Z0 + DEPTH));
      pivot.add(content);

      const addWindow = (x, y, w, h) => {
        const p = new THREE.Path();
        p.moveTo(x - w / 2, y - h / 2);
        p.lineTo(x - w / 2, y + h / 2);
        p.lineTo(x + w / 2, y + h / 2);
        p.lineTo(x + w / 2, y - h / 2);
        p.closePath();
        sh.holes.push(p);
        const pane = M.mesh(new THREE.PlaneGeometry(w, h), paneM, { cast: false, receive: false });
        pane.position.set(x, y, Z0 + 0.04);
        content.add(pane);
        content.add(box(w + 0.24, 0.14, 0.2, 0.04, frameM, x, y + h / 2 + 0.05, Z0 + DEPTH + 0.06));
        content.add(box(w + 0.36, 0.16, 0.36, 0.04, frameM, x, y - h / 2 - 0.05, Z0 + DEPTH + 0.12));
        content.add(box(0.07, h, 0.08, 0.02, frameM, x, y, Z0 + 0.12));
        content.add(box(w, 0.07, 0.08, 0.02, frameM, x, y + 0.15, Z0 + 0.12));
        // volets
        [-1, 1].forEach((s2) => {
          const v = box(w * 0.5, h + 0.1, 0.08, 0.03, trimM, x + s2 * (w * 0.75 + 0.06), y, Z0 + DEPTH + 0.05);
          content.add(v);
        });
        const halo = M.glowSprite('#ffbf73', Math.max(w, h) * 1.9, 0.4);
        halo.position.set(x, y, Z0 + DEPTH + 0.4);
        halo.material.transparent = true;
        halo.material.userData.base = 0.4;
        this.facadeMats.push(halo.material);
        content.add(halo);
      };
      WINS.filter(([x]) => inHalf(x)).forEach((w) => addWindow(...w));
      CIRCLES.filter(([x]) => inHalf(x)).forEach(([x, y, r]) => {
        const p = new THREE.Path();
        p.absarc(x, y, r, 0, Math.PI * 2, true);
        sh.holes.push(p);
        const pane = M.mesh(new THREE.CircleGeometry(r, 32), paneM, { cast: false, receive: false });
        pane.position.set(x, y, Z0 + 0.04);
        content.add(pane);
        const ring = M.mesh(new THREE.TorusGeometry(r + 0.04, 0.09, 8, 36), frameM);
        ring.position.set(x, y, Z0 + DEPTH + 0.02);
        content.add(ring);
      });
      if (side < 0) {
        const [dx, dy, dw, dh] = DOOR;
        const p = new THREE.Path();
        p.moveTo(dx - dw / 2, 0);
        p.lineTo(dx - dw / 2, dh - dw / 2);
        p.absarc(dx, dh - dw / 2, dw / 2, Math.PI, 0, true);
        p.lineTo(dx + dw / 2, 0);
        p.closePath();
        sh.holes.push(p);
        const door = new THREE.Shape();
        door.moveTo(-dw / 2, 0);
        door.lineTo(-dw / 2, dh - dw / 2);
        door.absarc(0, dh - dw / 2, dw / 2, Math.PI, 0, true);
        door.lineTo(dw / 2, 0);
        door.closePath();
        const dGeo = new THREE.ExtrudeGeometry(door, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
        dGeo.translate(dw / 2, 0, -0.06);
        // la porte pivote sur ses gonds (côté gauche) et s'ouvre devant le visiteur
        const hinge = new THREE.Group();
        hinge.position.set(dx - dw / 2, 0, Z0 + 0.18);
        content.add(hinge);
        this.door = hinge;
        hinge.add(M.mesh(dGeo, doorM));
        const wreath = M.mesh(new THREE.TorusGeometry(0.34, 0.11, 10, 28), greenM);
        wreath.position.set(dw / 2, 2.0, 0.18);
        hinge.add(wreath);
        const bow = M.mesh(new THREE.SphereGeometry(0.09, 10, 8), trimM);
        bow.position.set(dw / 2, 1.68, 0.24);
        hinge.add(bow);
        const knob = M.mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: '#d9a85b', metalness: 0.6, roughness: 0.3, transparent: true }));
        this.facadeMats.push(knob.material);
        knob.position.set(dw / 2 + 0.6, 1.4, 0.14);
        hinge.add(knob);
        const knobIn = knob.clone();
        knobIn.position.z = -0.14;
        hinge.add(knobIn);
        // lumière chaude qui s'échappe quand la porte s'ouvre
        const spill = M.glowSprite('#ffb866', 4.2, 0);
        spill.position.set(dx, 1.7, Z0 - 0.4);
        content.add(spill);
        this.doorGlow = spill;
        // enseigne Maison Mellow
        const sign = new THREE.Group();
        sign.add(box(1.9, 1.05, 0.1, 0.08, trimM));
        const logoTex = new THREE.TextureLoader().load('assets/monogramme-creme.png');
        logoTex.colorSpace = THREE.SRGBColorSpace;
        const lm = new THREE.MeshBasicMaterial({ map: logoTex, transparent: true });
        this.facadeMats.push(lm);
        const logo = M.mesh(new THREE.PlaneGeometry(1.5, 0.86), lm, { cast: false });
        logo.position.z = 0.06;
        sign.add(logo);
        sign.position.set(dx, dh + 0.85, Z0 + DEPTH + 0.1);
        content.add(sign);
        const lamp = M.lantern();
        lamp.scale.setScalar(0.9);
        lamp.position.set(dx - 1.3, 2.4, Z0 + DEPTH + 0.25);
        content.add(lamp);
      }
      const geo = new THREE.ExtrudeGeometry(sh, { depth: DEPTH, bevelEnabled: false, curveSegments: 24 });
      geo.translate(0, 0, Z0);
      const wall = M.mesh(geo, plaster);
      content.add(wall);
      // bandeau d'étage + chaînages d'angle
      content.add(box(x1 - x0, 0.3, 0.12, 0.04, trimM, (x0 + x1) / 2, 5.2, Z0 + DEPTH + 0.04));
      content.add(box(x1 - x0, 0.3, 0.12, 0.04, trimM, (x0 + x1) / 2, 10.6, Z0 + DEPTH + 0.04));
      content.add(box(0.36, 10.8, 0.14, 0.04, trimM, side < 0 ? x0 + 0.18 : x1 - 0.18, 5.4, Z0 + DEPTH + 0.05));
      // la façade ne fait pas d'ombre dans la maison : l'intérieur reste lumineux
      pivot.traverse((o) => {
        if (o.isMesh) o.castShadow = false;
      });
      this.scene.add(pivot);
      this.facade.push({ pivot, side });
    });
  }

  _exterior() {
    const g = (this.exterior = new THREE.Group());
    this.scene.add(g);
    // jardin sous la neige
    const snow = pbr('snow_02', { repeat: [9, 9], color: '#fbf8f4' });
    const ground = M.mesh(new THREE.CylinderGeometry(1, 1, 0.8, 72), snow, { cast: false });
    ground.scale.set(34, 1, 22);
    ground.position.set(9, -1.0, 2);
    g.add(ground);
    // allée en pierres
    const stone = pbr('marble_01', { repeat: [0.6, 0.6], color: '#cdbfae' });
    for (let i = 0; i < 7; i++) {
      const st = M.mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.1, 20), stone);
      st.position.set(0.8 + Math.sin(i * 1.3) * 0.25, -0.57, 4.8 + i * 1.35);
      st.scale.z = 0.75;
      g.add(st);
    }
    // sapins
    const trees = [[-9, -1, 6.5], [-12, 4, 5], [-8.5, 9, 4], [27.5, -0.5, 7], [30.5, 5, 5], [26.5, 10, 4.2], [-14, -6, 7.5], [32, -5, 6.5], [6, -9, 8], [14, -9.5, 7]];
    trees.forEach(([x, z, h], i) => this._place('fir_sapling_medium', x, -0.6, z, { hauteur: h, ry: i * 1.7 }));
    // lanternes le long de l'allée
    [[-1.4, 6.2], [3.0, 8.4], [-1.2, 11.2], [3.2, 13]].forEach(([x, z]) => {
      this._place('wooden_lantern_01', x, -0.6, z, { hauteur: 1.1 });
      const gl = M.glowSprite('#ffc370', 1.6, 0.5);
      gl.position.set(x, -0.05, z);
      g.add(gl);
    });
    // congères
    [[-6.2, 4.4], [-7.4, 2.2], [24.4, 4.6], [25.6, 2.0], [-2.6, 9.5], [4.6, 11.5]].forEach(([x, z], i) => {
      const sn = M.mesh(new THREE.SphereGeometry(0.9 + (i % 2) * 0.3, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), snow);
      sn.scale.y = 0.6;
      sn.position.set(x, -0.62, z);
      g.add(sn);
    });
  }

  /* ------------------------------ Pièces ----------------------------- */
  _prop(model, color, productId, view, x, y, z, { ry = 0, scale = 1, hotspotY = 0.6 } = {}) {
    const p = M.makeProductProp(model, color);
    p.scale.setScalar(scale);
    p.position.set(x, y, z);
    p.rotation.y = ry;
    p.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    this.scene.add(p);
    if (productId) {
      const anchor = new THREE.Vector3(x, y + hotspotY * scale, z);
      this.hotspots.push({ productId, view, anchor, el: null });
      this._clickable(p, { kind: 'product', productId, view });
    }
    return p;
  }

  // Objets que l'on peut toucher dans la maison
  _clickable(obj, data) {
    obj.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(obj);
    const entry = {
      ...data,
      obj,
      center: bb.getCenter(new THREE.Vector3()),
      top: new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y, (bb.min.z + bb.max.z) / 2),
      baseY: obj.position.y,
      baseScale: obj.scale.x,
      hover: 0,
      bounce: 0,
    };
    obj.userData.clickable = entry;
    this.clickables.push(entry);
    return entry;
  }

  _toy(obj, ligne, productId) {
    return this._clickable(obj, { kind: 'toy', ligne, productId });
  }

  _steam(x, y, z, opts) {
    const st = new Steam(new THREE.Vector3(x, y, z), opts);
    this.scene.add(st.group);
    this.steams.push(st);
    return st;
  }

  // Pose un vrai meuble / objet (modèle 3D) dans la maison. Les modèles sont en mètres : 1 m = 2 unités.
  _place(name, x, y, z, { ry = 0, s = 2, ligne = null, productId = null, hauteur = 0, after = null } = {}) {
    const p = modele(name).then((obj) => {
      if (!obj) return null;
      obj.rotation.y = ry;
      if (hauteur) {
        const h = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3()).y;
        s = hauteur / h;
      }
      obj.scale.setScalar(s);
      obj.position.set(x, y, z);
      if (hauteur) {
        // certains modèles ne sont pas centrés : on les recale sur leur base
        obj.updateMatrixWorld(true);
        const bb = new THREE.Box3().setFromObject(obj);
        obj.position.x += x - (bb.min.x + bb.max.x) / 2;
        obj.position.z += z - (bb.min.z + bb.max.z) / 2;
        obj.position.y += y - bb.min.y;
      }
      this.scene.add(obj);
      if (ligne) this._toy(obj, ligne, productId);
      if (after) after(obj);
      return obj;
    });
    this.loading.push(p);
    return p;
  }

  // Fenêtre donnant sur la nuit enneigée, avec rideaux en lin
  _window(x, y, z, w = 1.6, h = 2.0, ry = 0) {
    const win = M.windowFrame(w, h);
    win.position.set(x, y, z);
    win.rotation.y = ry;
    this.scene.add(win);
    return win;
  }

  _rooms() {
    const S = this.scene;
    const add = (o, x, y, z, ry = 0, s = 1) => {
      o.position.set(x, y, z);
      o.rotation.y = ry;
      o.scale.setScalar(s);
      S.add(o);
      return o;
    };
    const P = (...a) => this._place(...a);
    const G = LEVEL[0];
    const F1 = LEVEL[1];
    const F2 = LEVEL[2];
    const plante = 'Une plante qui pousse au chaud, comme tout le monde ici.';

    /* ENTRÉE : on enlève ses bottes, on enfile ses chaussons */
    add(M.coatRack(), -1.8, G + 0.7, BACK);
    P('painted_wooden_bench', -1.8, G, -3.0, { ligne: 'Un banc pour enlever ses bottes… et enfiler des chaussons tout chauds.', productId: 'chaussons-nuage' });
    this._prop('chaussons', '#c48a5a', 'chaussons-nuage', VUES.entree, -1.5, G + 0.02, -1.95, { ry: 0.35, scale: 0.62, hotspotY: 0.6 });
    P('rubber_boots', 0.4, G, -2.95, { ry: -0.25, ligne: 'Les bottes restent à l\'entrée : ici, on vit en chaussons.', productId: 'chaussons-nuage' });
    P('ornate_mirror_01', 2.1, G + 3.3, BACK + 0.02, { ligne: 'Petit coup d\'œil dans le miroir avant de s\'installer.' });
    P('potted_plant_02', 3.6, G, -2.7, { s: 1.9, ligne: plante });
    P('wall_clock', -4.48, G + 3.7, -0.6, { ry: Math.PI / 2, ligne: 'Il est l\'heure… de se mettre au chaud.' });
    P('wicker_basket_01', -3.7, G, -1.2, { ry: 0.5, s: 2.2 });
    add(M.doormat('Bienvenue'), 0.8, G, 2.55);
    add(M.rug(2.6, 4.0, ['#e6c9a8', '#c48a5a', '#f4e8d8']), 0.6, G, 0.2);
    P('hanging_industrial_lamp', 0.4, 5.0, -0.2, { s: 1.15 });
    this._bulb(0.4, 3.55, -0.2);
    const sign1 = M.mesh(new THREE.PlaneGeometry(1.5, 0.47), new THREE.MeshStandardMaterial({ map: T.signTexture('Salon'), roughness: 0.8 }));
    sign1.position.set(3.6, 3.9, 0.6);
    S.add(sign1);
    S.add(box(0.03, 0.9, 0.03, 0.01, mats.matte('#5a3a1e'), 3.6, 4.6, 0.6));

    /* SALON : le coin du feu */
    const fp = add(M.fireplace(), 10.2, G, BACK + 0.35);
    this.flickers.push({ fire: fp.userData.flames, glow: fp.userData.glow });
    this._toy(fp, 'Rien ne vaut un feu qui crépite… à part des pieds bien au chaud.', 'chaussons-nuage');
    P('mantel_clock_01', 11.0, G + 2.74, BACK + 0.45, { ligne: 'Tic-tac… c\'est l\'heure de se mettre au chaud.' });
    P('brass_candleholders', 9.35, G + 2.74, BACK + 0.45, { s: 1.15 });
    P('hanging_picture_frame_02', 10.2, G + 4.05, BACK + 0.02, { s: 2.2 });
    this._window(6.6, G + 2.9, BACK + 0.02, 1.5, 2.1);
    P('sofa_02', 6.0, G, -0.5, { ry: Math.PI / 2, ligne: 'Le canapé où l\'on se pelotonne sous le plaid, les pieds au chaud.', productId: 'chaussons-nuage' });
    P('throw_pillows_01', 5.62, G + 0.86, -0.5, { ry: Math.PI / 2 });
    const pl = M.plaid('#e6b9ad');
    pl.position.set(6.25, 1.2, 1.05);
    pl.rotation.set(-1.3, 0.2, 0.15);
    S.add(pl);
    add(M.rug(5.2, 3.8, ['#e9d3b6', '#c88f62', '#f4e8d8', '#b8774e']), 9.0, G, 0.4);
    P('coffee_table_round_01', 8.8, G, 0.3, { s: 1.6 });
    P('tea_set_01', 8.75, G + 0.79, 0.25, { s: 1.35, ligne: 'Une infusion bien chaude, et la soirée commence.', productId: 'coffret-soiree-cocon' });
    this._steam(8.55, G + 1.15, 0.2, { count: 5, size: 0.28, height: 0.8 });
    P('ArmChair_01', 12.2, G, 0.5, { ry: -0.8, ligne: 'Le fauteuil de lecture, avec vue sur le feu.' });
    P('side_table_01', 12.7, G, -1.5, { ry: -0.3 });
    P('vintage_oil_lamp', 12.75, G + 1.1, -1.5, { s: 1.5 });
    this._bulb(12.75, G + 1.75, -1.5, 0.5);
    P('potted_plant_01', 13.0, G, -2.85, { s: 1.75, ligne: plante });
    add(M.floorLamp('#f4e3c9'), 5.25, G, -2.95);
    this._prop('chaussons', '#efe2cf', 'chaussons-nuage', VUES.salon, 9.9, G + 0.03, 1.45, { ry: -0.45, scale: 0.72, hotspotY: 0.6 });
    this._steam(9.9, G + 0.4, 1.45, { count: 6, size: 0.35, height: 0.9, color: '#ffd9a8', warm: true });

    /* CUISINE : un vrai repas de famille */
    add(M.kitchen(3.4), 15.5, G, BACK + 0.55);
    this._window(15.5, G + 3.75, BACK + 0.02, 1.5, 1.4);
    P('vintage_electric_kettle', 16.6, G + 1.8, -3.0, { s: 1.8, ligne: 'L\'eau chauffe pour l\'infusion du soir.', productId: 'bandeau-cocon' });
    this._steam(16.6, G + 2.4, -3.0, { count: 4, size: 0.22, height: 0.7 });
    P('wooden_cutting_board', 15.3, G + 1.8, -2.95, { s: 2 });
    P('jug_01', 14.3, G + 1.8, -3.0, { s: 1.8 });
    add(M.stairs(12, 0.45, 0.38, 1.9), 17.8, G, -2.45);
    P('round_wooden_table_01', 17.9, G, 1.3, { s: 1.5 });
    P('dining_chair_02', 16.5, G, 1.45, { ry: Math.PI / 2 });
    P('dining_chair_02', 19.3, G, 1.15, { ry: -Math.PI / 2 });
    P('wooden_bowl_01', 18.45, G + 1.52, 0.85, { s: 1.8 });
    P('food_apple_01', 18.35, G + 1.58, 0.8, { s: 1.8 });
    P('lemon', 18.6, G + 1.66, 0.95, { s: 1.8 });
    P('food_pears_asian_01', 18.4, G + 1.6, 1.02, { s: 1.8, ry: 0.6 });
    P('carved_wooden_plate', 17.3, G + 1.52, 0.75, { s: 1.8 });
    P('carrot_cake', 17.3, G + 1.59, 0.75, { s: 1.8, ligne: 'Après une part de gâteau, un peu de chaleur sur le ventre aide à digérer.', productId: 'bandeau-cocon' });
    P('croissant', 18.7, G + 1.52, 1.85, { s: 1.8, ry: 0.4 });
    this._prop('bandeau', '#d99a8a', 'bandeau-cocon', VUES.cuisine, 17.75, G + 1.53, 1.6, { ry: 0.4, scale: 0.75, hotspotY: 0.45 });
    this._prop('housse', '#efe2cf', 'housse-rechange', VUES.cuisine, 16.5, G + 0.95, 1.45, { ry: 1.2, scale: 0.5, hotspotY: 0.5 });
    P('hanging_industrial_lamp', 17.9, 5.0, 1.3, { s: 1.15 });
    this._bulb(17.9, 3.55, 1.3);
    P('painted_wooden_cabinet', 21.85, G, 1.6, { ry: -Math.PI / 2, ligne: 'Le buffet de famille, plein de bocaux et de souvenirs.' });
    P('potted_plant_04', 21.9, G + 2.36, 2.3, { s: 2 });
    P('pot_enamel_01', 21.95, G + 2.36, 0.9, { s: 2 });

    /* CHAMBRE : se blottir */
    this._toy(add(M.bed('#e6b9ad'), 15.85, F1, -0.75), 'Glissez le bandeau sur le ventre 20 minutes avant de dormir.', 'bandeau-cocon');
    this._window(15.85, F1 + 3.55, BACK + 0.02, 1.5, 1.5);
    P('painted_wooden_nightstand', 18.25, F1, -0.6);
    P('vintage_oil_lamp', 18.05, F1 + 1.24, -0.75, { s: 1.4 });
    this._bulb(18.05, F1 + 1.85, -0.75, 0.5);
    P('alarm_clock_01', 18.5, F1 + 1.24, -0.4, { ry: -0.4, ligne: 'Le réveil peut attendre : encore cinq minutes au chaud.' });
    add(M.frame(2, 1.1, 1.35), 20.7, F1 + 3.2, BACK + 0.06);
    P('wicker_basket_02', 19.7, F1, 0.4, { s: 2.2 });
    P('potted_plant_02', 22.0, F1, 0.6, { s: 1.7, ligne: plante });
    add(M.rug(3.2, 2.4, ['#f0d6cc', '#e6b9ad', '#fbf4ea']), 19.4, F1, 1.7);
    // garde-corps de la trémie
    S.add(box(4.8, 0.07, 0.07, 0.02, mats.wood('#8a5a36'), 20.1, F1 + 1.1, -1.2));
    for (let x = 17.9; x <= 22.4; x += 0.45) S.add(box(0.045, 1.1, 0.045, 0.01, mats.wood('#8a5a36'), x, F1 + 0.55, -1.2));
    this._prop('bandeau', '#bf6b47', 'bandeau-cocon', VUES.chambre, 15.9, F1 + 1.3, 0.55, { ry: -0.15, scale: 0.85, hotspotY: 0.45 });
    this._prop('chaussons', '#e6b9ad', 'chaussons-nuage', VUES.chambre, 18.0, F1 + 0.02, 1.25, { ry: -0.5, scale: 0.62, hotspotY: 0.55 });

    /* COIN LECTURE : un livre, la nuque au chaud */
    P('wooden_bookshelf_worn', 11.6, F1, BACK + 0.6, { ligne: 'Des livres, des plaids, et la nuque bien au chaud.', productId: 'nuque-douceur' });
    P('book_encyclopedia_set_01', 11.0, F1 + 4.12, BACK + 0.55, { s: 1.8 });
    this._window(7.6, F1 + 2.9, BACK + 0.02, 1.5, 2.1);
    P('ArmChair_01', 8.2, F1, -0.2, { ry: 0.35, ligne: 'Le fauteuil préféré pour lire jusqu\'à tard.', productId: 'nuque-douceur' });
    this._prop('nuque', '#7a5638', 'nuque-douceur', VUES.lecture, 8.25, F1 + 0.9, -0.05, { ry: 0.35, scale: 0.62, hotspotY: 0.45 });
    P('Ottoman_01', 9.0, F1, 1.5, { ry: 0.3 });
    this._prop('bandeau', '#bf6b47', 'bandeau-cocon', VUES.lecture, 9.0, F1 + 1.25, 1.5, { ry: -0.4, scale: 0.6, hotspotY: 0.45 });
    P('side_table_tall_01', 6.7, F1, -0.7);
    P('potted_plant_04', 6.7, F1 + 1.52, -0.7, { s: 2 });
    P('vintage_grandfather_clock_01', 13.0, F1, -1.2, { ry: -Math.PI / 2, ligne: 'L\'horloge sonne l\'heure du thé (et de la bouillotte).' });
    P('Rockingchair_01', 6.1, F1, 1.0, { ry: 0.9, ligne: 'Le fauteuil à bascule de mamie, tout doux sous un plaid.' });
    add(M.floorLamp('#fbefdc'), 9.75, F1, -2.5);
    add(M.rug(4.6, 3.2, ['#e8d1ba', '#a3ad8f', '#f4e8d8', '#c98b62']), 8.6, F1, 0.6);
    add(M.ladder(5.7), 5.6, F1, BACK + 0.45);

    /* SALLE DE BAIN (décor) */
    this._toy(add(M.bathtub(), -0.6, F1, -2.3), 'Un bain chaud, puis la bouillotte sur la nuque : le duo parfait.', 'nuque-douceur');
    add(M.mirror(), 2.6, F1 + 3.0, BACK + 0.08);
    add(M.towel('#e6b9ad'), -3.4, F1 + 0.2, BACK + 0.2);
    P('potted_plant_02', 3.4, F1, 1.6, { s: 1.6 });
    const c3 = M.candle(0.3);
    add(c3, 1.4, F1 + 1.1, -2.1);
    this.flickers.push({ glow: c3.userData.flicker });

    /* GRENIER : les cadeaux et les souvenirs */
    add(M.rug(5.6, 4, ['#f0d6cc', '#c48a5a', '#f4e8d8', '#e6b9ad']), 9, F2, 0.5);
    P('small_wooden_table_01', 9, F2, 0.4, { s: 2.4 });
    this._prop('coffret', '#efe2cf', 'coffret-soiree-cocon', VUES.grenier, 9, F2 + 1.27, 0.45, { ry: -0.15, scale: 0.7, hotspotY: 0.7 });
    P('vintage_suitcase', 3.8, F2, -1.5, { s: 1.25, ry: 0.25, ligne: 'La valise des vacances d\'hiver… direction le chalet.' });
    P('wooden_crate_01', 13.1, F2, -1.6);
    P('cardboard_box_01', 13.1, F2 + 0.7, -1.6, { ry: 0.3 });
    P('cardboard_box_01', 14.5, F2, -0.5, { ry: 0.9 });
    P('Lantern_01', 13.0, F2 + 1.38, -1.55, { s: 2.6 });
    this._bulb(13.0, F2 + 1.7, -1.55, 0.6);
    P('wicker_basket_02', 5.2, F2, 1.7, { s: 2.2 });
    P('fir_sapling_medium', 13.4, F2, 1.3, { hauteur: 2.8, ligne: 'Le petit sapin du grenier veille sur les cadeaux.' });
    const giftLine = 'Psst… le coffret « Soirée Cocon » fait toujours plaisir.';
    this._toy(add(M.giftBox(0.8, 0.6, 0.8, '#bf6b47'), 12.5, F2, 2.0, 0.3), giftLine, 'coffret-soiree-cocon');
    this._toy(add(M.giftBox(0.6, 0.45, 0.6, '#a3ad8f', '#bf6b47'), 14.3, F2, 2.1, -0.2), giftLine, 'coffret-soiree-cocon');
    this._toy(add(M.giftBox(0.7, 0.4, 0.5, '#e6b9ad'), 4.6, F2, 0.6, 0.6), giftLine, 'coffret-soiree-cocon');
    S.add(M.garland([
      new THREE.Vector3(2.4, F2 + 3.0, -1.5),
      new THREE.Vector3(5.5, F2 + 3.6, -1.0),
      new THREE.Vector3(9, F2 + 4.6, -1.2),
      new THREE.Vector3(12.5, F2 + 3.6, -1.0),
      new THREE.Vector3(15.6, F2 + 3.0, -1.5),
    ], 46));
  }

  // Ampoule allumée (lueur douce, captée par l'effet de halo)
  _bulb(x, y, z, size = 0.8) {
    const g = M.glowSprite('#ffc982', size * 2.4, 0.45);
    g.position.set(x, y, z);
    this.scene.add(g);
    const b = M.mesh(new THREE.SphereGeometry(0.06 * size, 10, 8), mats.glow('#ffe2b0', 4), { cast: false });
    b.position.set(x, y, z);
    this.scene.add(b);
  }

  /* ---------------------- Chemin de points 3D ---------------------- */
  _path() {
    const G = 0.07;
    const F1 = LEVEL[1] + 0.07;
    const F2 = LEVEL[2] + 0.07;
    const pts = [
      [0.8, -0.45, 15], [0.8, -0.45, 9], [0.8, -0.45, 5.2], [0.8, G, 3.4], [0.6, G, 1.6],
      [2.6, G, 1.9], [4.5, G, 2.1], [7.2, G, 2.0], [9.6, G, 2.4], [12, G, 2.2], [13.5, G, 2.3],
      [15.2, G, 2.8], [16.2, G, -0.5], [17.0, G, -1.9], [17.6, G + 0.2, -2.45],
      [19.9, 2.95, -2.45], [22.2, F1 + 0.25, -2.45], [22.3, F1, -0.4], [21.0, F1, 0.6],
      [19.2, F1, 2.2], [16.0, F1, 2.4], [13.5, F1, 2.4], [11.6, F1, 2.6], [9.2, F1, 2.3],
      [7.0, F1, 1.4], [6.2, F1, -0.8], [5.7, F1, -2.1],
      [5.7, 8.3, -2.2], [5.7, F2 + 0.3, -2.2], [6.3, F2, -1.4], [7.4, F2, 1.6], [9, F2, 2.3],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const curve = (this.pathCurve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.15));
    const len = curve.getLength();
    const n = Math.floor(len / (this.lite ? 0.42 : 0.3));
    this.pathN = n;
    this.pathU = new Float32Array(n);
    const geo = new THREE.SphereGeometry(0.075, 10, 8);
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
    const im = (this.dots = new THREE.InstancedMesh(geo, mat, n));
    const m4 = new THREE.Matrix4();
    const c = new THREE.Color('#fff3e0');
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      this.pathU[i] = u;
      const p = curve.getPointAt(u);
      m4.makeTranslation(p.x, p.y, p.z);
      im.setMatrixAt(i, m4);
      im.setColorAt(i, c);
    }
    this.scene.add(im);

    // flèches au sol, comme dans les grands magasins
    const arrowMat = new THREE.MeshBasicMaterial({ map: T.arrowTexture(), color: '#c27a45', transparent: true, depthWrite: false, toneMapped: false });
    const aGeo = new THREE.PlaneGeometry(0.75, 0.75);
    aGeo.rotateX(-Math.PI / 2);
    const steps = Math.floor(len / 2.2);
    for (let i = 1; i < steps; i++) {
      const u = i / steps;
      const p = curve.getPointAt(u);
      const t = curve.getTangentAt(u);
      if (Math.abs(t.y) > 0.25) continue;
      const a = M.mesh(aGeo, arrowMat, { cast: false, receive: false });
      a.position.set(p.x, p.y - 0.045, p.z);
      a.rotation.y = Math.atan2(-t.z, t.x);
      a.renderOrder = 2;
      this.scene.add(a);
    }

    // avancement du chemin pour chaque étape de la visite
    const samples = 500;
    const pts2 = [];
    for (let i = 0; i <= samples; i++) pts2.push(curve.getPointAt(i / samples));
    let prev = 0;
    this.viewU = ETAPES.map((e, k) => {
      if (k === 0) return 0;
      if (k === ETAPES.length - 1) return 1;
      const target = new THREE.Vector3(e.pos[0], e.pos[1] - 3.0, e.pos[2] - 0.8);
      let best = prev;
      let bd = Infinity;
      for (let i = 0; i <= samples; i++) {
        const d = pts2[i].distanceToSquared(target);
        if (d < bd) {
          bd = d;
          best = i / samples;
        }
      }
      prev = Math.max(prev, best);
      return prev;
    });
    this.dotPale = new THREE.Color('#fff4e4');
    this.dotWarm = new THREE.Color('#f08a3c');
    this.dotHot = new THREE.Color('#ffd27a');
  }

  /* ----------------------------- Particules ----------------------------- */
  _particles() {
    // neige douce à l'extérieur
    const nSnow = this.lite ? 350 : 800;
    const pos = new Float32Array(nSnow * 3);
    const seed = new Float32Array(nSnow);
    let k = 0;
    while (k < nSnow) {
      const x = -26 + Math.random() * 70;
      const z = -18 + Math.random() * 44;
      const inside = x > LEFT - 1.5 && x < RIGHT + 1.5 && z < FRONT + 1.2;
      if (inside) continue;
      pos[k * 3] = x;
      pos[k * 3 + 1] = Math.random() * 30;
      pos[k * 3 + 2] = z;
      seed[k] = Math.random();
      k++;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    this.snowMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { time: { value: 0 }, map: { value: T.glowTexture() }, color: { value: new THREE.Color('#ffffff') }, pr: { value: this.renderer.getPixelRatio() } },
      vertexShader: `
        attribute float seed; uniform float time; uniform float pr; varying float vA;
        void main(){
          vec3 p = position;
          p.y = mod(p.y - time * (0.6 + seed * 0.8), 30.0) - 1.0;
          p.x += sin(time * 0.7 + seed * 40.0) * 0.6;
          p.z += cos(time * 0.5 + seed * 30.0) * 0.4;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (2.0 + seed * 3.5) * pr * (40.0 / -mv.z);
          vA = 0.55 + seed * 0.45;
        }`,
      fragmentShader: `
        uniform sampler2D map; uniform vec3 color; varying float vA;
        void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(color, t.a * vA); }`,
    });
    this.scene.add(new THREE.Points(geo, this.snowMat));

    // poussières dorées à l'intérieur (les "points de chaleur")
    const nM = this.lite ? 90 : 220;
    const mp = new Float32Array(nM * 3);
    const ms = new Float32Array(nM);
    for (let i = 0; i < nM; i++) {
      mp[i * 3] = LEFT + Math.random() * 27;
      mp[i * 3 + 1] = Math.random() * 15;
      mp[i * 3 + 2] = BACK + Math.random() * 8;
      ms[i] = Math.random();
    }
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
    mg.setAttribute('seed', new THREE.BufferAttribute(ms, 1));
    this.moteMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { time: { value: 0 }, map: { value: T.glowTexture() }, pr: { value: this.renderer.getPixelRatio() } },
      vertexShader: `
        attribute float seed; uniform float time; uniform float pr; varying float vA;
        void main(){
          vec3 p = position;
          p.y += sin(time * 0.3 + seed * 20.0) * 0.5;
          p.x += sin(time * 0.2 + seed * 13.0) * 0.4;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (3.0 + seed * 5.0) * pr * (14.0 / -mv.z);
          vA = 0.25 + 0.35 * (0.5 + 0.5 * sin(time * 1.5 + seed * 50.0));
        }`,
      fragmentShader: `
        uniform sampler2D map; varying float vA;
        void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vec3(1.0, 0.72, 0.4) * t.a * vA, 1.0); }`,
    });
    this.scene.add(new THREE.Points(mg, this.moteMat));

    // fumée de cheminée
    this._steam(this.chimneyTop.x, this.chimneyTop.y, this.chimneyTop.z, { count: 9, size: 1.6, height: 5, color: '#ffffff', opacity: 0.55, spread: 0.6 });
  }

  /* ------------------------------ Logique ------------------------------ */
  _buildParcours() {
    const P = ETAPES.map((e) => new THREE.Vector3(...e.pos));
    const L = ETAPES.map((e) => new THREE.Vector3(...e.look));
    this.camCurve = new THREE.CatmullRomCurve3(P, false, 'centripetal');
    this.lookCurve = new THREE.CatmullRomCurve3(L, false, 'centripetal');
    this.lightPts = ETAPES.map((e) => new THREE.Vector3(...e.light));
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
    }
    this.camera.aspect = w / h;
    this.portrait = w / h < 0.9;
    this.camera.updateProjectionMatrix();
  }

  setPointer(x, y) {
    this.pointer.set(x, y);
  }

  update(s, dt) {
    const N = DERNIERE;
    s = clamp(s, 0, N);
    this.s = s;
    this.time += dt;
    const t = this.time;
    const i = Math.min(N - 1, Math.floor(s));
    const f = s - i;
    // on ralentit doucement à chaque étape, sans jamais s'arrêter
    const fe = this.reducedMotion ? f : f - (Math.sin(2 * Math.PI * f) / (2 * Math.PI)) * 0.55;
    const se = i + fe;
    const A = ETAPES[i];
    const B = ETAPES[i + 1];

    // caméra à hauteur d'yeux, le long du parcours
    const pos = this.camCurve.getPoint(se / N);
    const look = this.lookCurve.getPoint(se / N);
    const outside = clamp(Math.max(1 - se, se - (N - 1)), 0, 1);
    if (this.portrait && outside > 0) pos.sub(look).multiplyScalar(1 + 0.75 * outside).add(look);
    if (!this.reducedMotion) {
      this.pointerSmooth.lerp(this.pointer, Math.min(1, dt * 3));
      const d = pos.distanceTo(look);
      const right = new THREE.Vector3().subVectors(look, pos).cross(UP).normalize();
      look.addScaledVector(right, this.pointerSmooth.x * d * 0.09);
      look.y += this.pointerSmooth.y * d * 0.05;
      pos.y += Math.sin(t * 1.1) * 0.02 * (1 - outside);
    }
    if (this.intro > 0) {
      this.intro = Math.max(0, this.intro - dt * 0.45);
      const e = this.intro * this.intro;
      const dir = pos.clone().sub(look).multiplyScalar(1 + e * 0.35).applyAxisAngle(UP, e * -0.25);
      pos.copy(look).add(dir);
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(look);
    this.lookAt = look;

    // champ de vision et cadrage (le texte occupe une partie de l'écran)
    this.camera.fov = lerp(A.fov, B.fov, fe) + (this.portrait ? 14 : 0);
    const shift = lerp(A.shift, B.shift, fe);
    if (this.portrait) {
      this.camera.setViewOffset(this.width, this.height, 0, this.height * (0.17 * shift + 0.14 * outside), this.width, this.height);
    } else {
      const k = this.width > 1100 ? 0.17 : 0.13;
      this.camera.setViewOffset(this.width, this.height, -this.width * k * shift, 0, this.width, this.height);
    }

    // la porte s'ouvre quand on avance vers elle
    const doorOpen = smooth(VUES.porte + 0.1, VUES.porte + 0.85, s);
    this.door.rotation.y = -doorOpen * 1.6;
    this.doorGlow.material.opacity = 0.55 * Math.sin(Math.PI * clamp(doorOpen, 0, 1)) + 0.25 * doorOpen * (1 - smooth(2.2, 2.8, s));

    // à la fin, la façade s'ouvre pour montrer toute la maison
    const open = smooth(N - 0.85, N - 0.15, s);
    this.facade.forEach(({ pivot, side }) => {
      pivot.rotation.y = side < 0 ? -open * 2.0 : open * 2.0;
    });
    const fOp = clamp(1 - smooth(N - 0.55, N - 0.05, s), 0, 1);
    this.facadeMats.forEach((m) => {
      m.opacity = fOp * (m.userData?.base ?? 1);
    });
    this.facade.forEach(({ pivot }) => (pivot.visible = fOp > 0.01));

    // la maison se réchauffe au fil de la visite
    const warmth = clamp(se / N, 0, 1);
    const u = this.backdrop.material.uniforms;
    u.top.value.copy(this.skyCold.top).lerp(this.skyWarm.top, warmth);
    u.bottom.value.copy(this.skyCold.bottom).lerp(this.skyWarm.bottom, warmth);
    u.warmth.value = warmth;
    this.warmth = warmth;

    // lumière de la pièce où l'on se trouve
    this.roomLight.position.copy(this.lightPts[i]).lerp(this.lightPts[i + 1], fe);
    const fireNear = 1 - Math.min(1, Math.abs(se - VUES.salon));
    const flick = this.reducedMotion ? 0 : (Math.sin(t * 13) * 0.5 + Math.sin(t * 7.3) * 0.5) * 3 * fireNear;
    this.roomLight.intensity = lerp(9, 12, outside);
    // dehors, la neige renvoie la lumière du soir
    this.hemi.intensity = lerp(0.6, 1.5, outside);
    this.key.intensity = lerp(1.25, 2.2, outside);
    this.fireLight.intensity = 9 + flick * 1.5;
    this.lampLight.position.copy(LAMPES[i]).lerp(LAMPES[i + 1], fe);

    // petite lumière chaude qui suit le curseur
    if (!this.portrait && !this.reducedMotion) {
      const v = new THREE.Vector3(this.pointerSmooth.x, this.pointerSmooth.y, 0.5).unproject(this.camera);
      const d = v.sub(this.camera.position).normalize();
      this.cursorLight.position.copy(this.camera.position).addScaledVector(d, 4.5);
      this.cursorLight.intensity = outside < 0.5 ? 5 : 0;
    }

    // flammes et bougies
    this.flickers.forEach((fl, idx) => {
      if (fl.fire) {
        fl.fire.children.forEach((c) => {
          const ph = c.userData.phase;
          c.scale.y = 0.85 + 0.25 * Math.sin(t * 9 + ph) + 0.1 * Math.sin(t * 17 + ph * 2);
          c.scale.x = c.scale.z = 0.9 + 0.1 * Math.sin(t * 11 + ph);
        });
      }
      if (fl.glow) {
        const b = fl.glow.userData.baseOpacity;
        fl.glow.material.opacity = b * (0.8 + 0.2 * Math.sin(t * 10 + idx) + 0.1 * Math.sin(t * 23 + idx * 3));
      }
    });
    this.steams.forEach((st) => st.update(dt, t));
    this.snowMat.uniforms.time.value = t;
    this.moteMat.uniforms.time.value = t;

    // objets survolés ou touchés
    for (const c of this.clickables) {
      const target = c === this.hovered ? 1 : 0;
      c.hover += (target - c.hover) * Math.min(1, dt * 10);
      if (c.kind === 'product') {
        c.obj.position.y = c.baseY + c.hover * 0.12 * c.baseScale + Math.sin(t * 2 + c.center.x) * 0.015 * c.baseScale;
        c.obj.scale.setScalar(c.baseScale * (1 + c.hover * 0.07));
      } else if (c.kind === 'toy' && (c.hover > 0.001 || c.bounce > 0)) {
        c.bounce = Math.max(0, c.bounce - dt * 1.4);
        const w = Math.sin((1 - c.bounce) * Math.PI * 5) * c.bounce;
        const k = c.baseScale;
        c.obj.scale.set(k * (1 - w * 0.06 + c.hover * 0.02), k * (1 + w * 0.1 + c.hover * 0.02), k * (1 - w * 0.06 + c.hover * 0.02));
      }
    }

    // chemin : les points s'allument au fur et à mesure de la visite
    const VU = this.viewU;
    const pu = lerp(VU[i], VU[i + 1], fe);
    const col = new THREE.Color();
    for (let k = 0; k < this.pathN; k++) {
      const uk = this.pathU[k];
      if (uk <= pu) {
        const wave = 0.5 + 0.5 * Math.sin(uk * 90 - t * 5);
        col.copy(this.dotWarm).lerp(this.dotHot, wave * 0.8);
      } else {
        const near = 1 - smooth(0, 0.05, uk - pu);
        col.copy(this.dotPale).lerp(this.dotHot, near * (0.5 + 0.5 * Math.sin(t * 6)));
      }
      this.dots.setColorAt(k, col);
    }
    this.dots.instanceColor.needsUpdate = true;
    this.pathProgress = pu;
    this.eff = se;
  }

  // Position écran des points produits
  projectHotspots() {
    const out = [];
    const v = new THREE.Vector3();
    for (const h of this.hotspots) {
      const near = Math.abs(this.eff - h.view);
      v.copy(h.anchor).project(this.camera);
      const inFrame = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      const visible = near < 0.5 && inFrame;
      out.push({ h, x: (v.x * 0.5 + 0.5) * this.width, y: (-v.y * 0.5 + 0.5) * this.height, visible });
    }
    return out;
  }

  // Quel objet se trouve sous le doigt / la souris ? (coordonnées -1..1)
  pick(nx, ny) {
    this.ray.setFromCamera({ x: nx, y: ny }, this.camera);
    const cam = this.camera.position;
    const cands = this.clickables.filter((c) => c.obj.visible && c.center.distanceTo(cam) < 13);
    if (this.s < VUES.porte + 0.6 && this.door) cands.push(this.doorEntry || (this.doorEntry = { kind: 'door', obj: this.door, center: new THREE.Vector3(0.8, 1.6, 3.8) }));
    if (!cands.length) return null;
    const hits = this.ray.intersectObjects(cands.map((c) => c.obj), true);
    for (const hit of hits) {
      let o = hit.object;
      if (o.isSprite || o.isPoints) continue;
      while (o && !o.userData.clickable && o !== this.door) o = o.parent;
      if (o === this.door) return this.doorEntry;
      if (o) return o.userData.clickable;
    }
    return null;
  }

  hover(nx, ny) {
    this.hovered = nx === null ? null : this.pick(nx, ny);
    return this.hovered;
  }

  poke(entry) {
    if (entry && entry.kind === 'toy') entry.bounce = 1;
  }

  screenOf(v3) {
    const v = v3.clone().project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.width, y: (-v.y * 0.5 + 0.5) * this.height, visible: v.z < 1 };
  }

  render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}

/* Petites volutes de vapeur / chaleur qui s'élèvent */
class Steam {
  constructor(origin, { count = 6, size = 0.4, height = 1, color = '#fffaf2', opacity = 0.45, spread = 0.12, warm = false } = {}) {
    this.origin = origin;
    this.group = new THREE.Group();
    this.items = [];
    this.height = height;
    this.spread = spread;
    for (let i = 0; i < count; i++) {
      const m = new THREE.SpriteMaterial({
        map: T.glowTexture(),
        color,
        transparent: true,
        depthWrite: false,
        opacity: 0,
        blending: warm ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      const s = new THREE.Sprite(m);
      s.userData.phase = i / count;
      s.userData.size = size * (0.7 + Math.random() * 0.6);
      s.userData.seed = Math.random() * 10;
      this.items.push(s);
      this.group.add(s);
    }
    this.opacity = opacity;
  }
  update(dt, t) {
    for (const s of this.items) {
      const life = (t * 0.25 + s.userData.phase) % 1;
      const sd = s.userData.seed;
      s.position.set(
        this.origin.x + Math.sin(t * 1.3 + sd) * this.spread * life * 2,
        this.origin.y + life * this.height,
        this.origin.z + Math.cos(t + sd) * this.spread * life
      );
      const sz = s.userData.size * (0.5 + life * 1.2);
      s.scale.set(sz, sz, 1);
      s.material.opacity = this.opacity * Math.sin(Math.PI * life) * 0.9;
    }
  }
}
