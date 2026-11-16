// "Studio photo" 3D : génère les vignettes produits et anime la vue 3D du produit
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeProduct } from './models.js';
import { shadowTexture } from './textures.js';

export class Studio {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'studio-canvas';

    const scene = (this.scene = new THREE.Scene());
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;

    scene.add(new THREE.HemisphereLight('#fff3e3', '#8a6a4a', 1.3));
    const key = new THREE.DirectionalLight('#ffe7c9', 2.4);
    key.position.set(2.5, 5, 3.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 6;
    key.shadow.camera.left = key.shadow.camera.bottom = -2;
    key.shadow.camera.right = key.shadow.camera.top = 2;
    scene.add(key);
    const rim = new THREE.DirectionalLight('#ffcfa0', 1.4);
    rim.position.set(-4, 3, -3);
    scene.add(rim);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.16 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    this.blob = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.55 })
    );
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.002;
    scene.add(this.blob);

    this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    this.pivot = new THREE.Group();
    scene.add(this.pivot);
    this.cache = new Map();
    this.current = null;
    this.rot = -0.5;
    this.targetRot = -0.5;
    this.dragging = false;
    this.mounted = null;
    this._loop = this._loop.bind(this);
  }

  setProduct(model, color) {
    const key = model + color;
    if (this.current === key) return;
    this.current = key;
    this.currentArgs = [model, color];
    this.pivot.clear();
    const obj = makeProduct(model, color);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = 1.7 / Math.max(size.x, size.z, size.y * 1.25);
    obj.scale.multiplyScalar(s);
    obj.position.set(-center.x * s, -box.min.y * s, -center.z * s);
    obj.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    this.pivot.add(obj);
    const h = size.y * s;
    const flat = size.y / Math.max(size.x, size.z) < 0.22;
    this.camera.position.set(0, flat ? 2.6 : 1.25 + h * 0.4, flat ? 3.6 : 4.6);
    this.camera.lookAt(0, h * 0.42, 0);
    this.blob.scale.setScalar(Math.max(size.x, size.z) * s * 0.75);
  }

  _setSize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  snapshot(model, color, size = 480) {
    const key = model + '|' + color;
    if (this.cache.has(key)) return this.cache.get(key);
    const prevArgs = this.currentArgs;
    const prevRot = this.pivot.rotation.y;
    this._setSize(size, size);
    this.setProduct(model, color);
    this.pivot.rotation.y = -0.55;
    this.renderer.render(this.scene, this.camera);
    const url = this.canvas.toDataURL('image/png');
    this.cache.set(key, url);
    if (this.mounted) {
      this.pivot.rotation.y = prevRot;
      this._resizeToMount();
      if (prevArgs) this.setProduct(...prevArgs);
    }
    return url;
  }

  _resizeToMount() {
    if (!this.mounted) return;
    const r = this.mounted.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this._setSize(Math.max(2, Math.round(r.width * dpr)), Math.max(2, Math.round(r.height * dpr)));
  }

  mount(container, model, color) {
    this.mounted = container;
    container.appendChild(this.canvas);
    this.current = null;
    this.setProduct(model, color);
    this.rot = this.targetRot = -0.5;
    this._resizeToMount();
    if (!this._bound) this._bindPointer();
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this._loop);
  }

  unmount() {
    this.running = false;
    this.mounted = null;
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  }

  _bindPointer() {
    this._bound = true;
    let lastX = 0;
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      lastX = e.clientX;
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.targetRot += (e.clientX - lastX) * 0.012;
      lastX = e.clientX;
    });
    const up = () => (this.dragging = false);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    window.addEventListener('resize', () => this._resizeToMount());
  }

  _loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.dragging) this.targetRot += dt * 0.45;
    this.rot += (this.targetRot - this.rot) * Math.min(1, dt * 8);
    this.pivot.rotation.y = this.rot;
    this.pivot.position.y = Math.sin(now / 900) * 0.025;
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this._loop);
  }
}
