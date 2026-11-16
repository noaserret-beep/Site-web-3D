// Matières et objets réalistes (textures Poly Haven, licence CC0)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const TEX = 'assets/textures/';
const MOD = 'assets/models/';

export const manager = new THREE.LoadingManager();
const texLoader = new THREE.TextureLoader(manager);
const gltfLoader = new GLTFLoader(manager);
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

const images = new Map();
const ready = new Map();
function base(name, kind) {
  const key = name + kind;
  if (!images.has(key)) {
    let done;
    ready.set(key, new Promise((r) => (done = r)));
    const t = texLoader.load(`${TEX}${name}_${kind}.webp`, () => done(), undefined, () => done());
    if (kind === 'diff') t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    images.set(key, t);
  }
  return images.get(key);
}

// Texture répétée (chaque matière a sa propre échelle, l'image est partagée)
export function tex(name, kind, repeat = [1, 1], rotation = 0) {
  const t = base(name, kind).clone();
  t.repeat.set(repeat[0], repeat[1]);
  if (rotation) {
    t.center.set(0.5, 0.5);
    t.rotation = rotation;
  }
  return t;
}

/**
 * Matière PBR : bois, plâtre, carrelage…
 * diffuse=false : on garde seulement le relief et la rugosité (la couleur vient de `color`)
 */
export function pbr(name, { repeat = [1, 1], color = '#ffffff', diffuse = true, normal = 1, rough = 1, rotation = 0, ...rest } = {}) {
  const m = new THREE.MeshStandardMaterial({
    color,
    map: diffuse ? tex(name, 'diff', repeat, rotation) : null,
    normalMap: tex(name, 'nor', repeat, rotation),
    roughnessMap: tex(name, 'rough', repeat, rotation),
    roughness: rough,
    metalness: 0,
    ...rest,
  });
  m.normalScale.set(normal, normal);
  return m;
}

// Tissu doux : relief du tissu + reflet velouté (sheen)
export function tissu(name, color, { repeat = [3, 3], diffuse = false, normal = 1, sheen = 0.8 } = {}) {
  const c = new THREE.Color(color);
  const m = new THREE.MeshPhysicalMaterial({
    color: c,
    map: diffuse ? tex(name, 'diff', repeat) : null,
    normalMap: tex(name, 'nor', repeat),
    roughnessMap: tex(name, 'rough', repeat),
    roughness: 1,
    sheen,
    sheenRoughness: 0.55,
    sheenColor: c.clone().lerp(new THREE.Color('#fff4e6'), 0.35),
  });
  m.normalScale.set(normal, normal);
  return m;
}

// Les textures de tissus des produits sont prêtes (pour les vignettes)
export function tissusPrets() {
  const names = ['knitted_fleece', 'faux_fur_geometric', 'polar_fleece', 'wool_boucle', 'velour_velvet'];
  names.forEach((n) => ['nor', 'rough'].forEach((k) => base(n, k)));
  const all = names.flatMap((n) => ['nor', 'rough'].map((k) => ready.get(n + k)));
  return Promise.race([Promise.all(all), new Promise((r) => setTimeout(r, 5000))]);
}

/* ---------------------------- Modèles 3D ---------------------------- */
const models = new Map();
export function modele(name) {
  if (!models.has(name)) {
    models.set(
      name,
      new Promise((resolve) => {
        gltfLoader.load(
          `${MOD}${name}.glb`,
          (g) => {
            g.scene.traverse((o) => {
              if (o.isMesh) {
                o.castShadow = true;
                o.receiveShadow = true;
              }
            });
            resolve(g.scene);
          },
          undefined,
          () => resolve(null)
        );
      })
    );
  }
  return models.get(name).then((s) => (s ? s.clone() : null));
}
