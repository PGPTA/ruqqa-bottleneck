import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { Simulation } from './simulation.js';
import { World } from './world.js';
import { Editor } from './editor.js';
import { initUI } from './ui.js';

// ---- renderer ----
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// label renderer (for floating equipment labels)
const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.left = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.getElementById('app').appendChild(labelRenderer.domElement);

// ---- scene + camera ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222d3c);
// fog pushed well out so the full gym layout stays clear at any zoom
scene.fog = new THREE.Fog(0x222d3c, 110, 230);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 34, 40);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 12;
controls.maxDistance = 90;
controls.target.set(0, 0, 0);

// ---- lights ----
scene.add(new THREE.HemisphereLight(0xc4d4e6, 0x35404f, 0.85));
scene.add(new THREE.AmbientLight(0x6f7d90, 0.35));
const sun = new THREE.DirectionalLight(0xffe6c2, 1.15);
sun.position.set(20, 40, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
sun.shadow.camera.far = 120;
scene.add(sun);

// ---- build world + sim ----
const sim = new Simulation(scene);
const world = new World(scene, sim);
world.init();
const ui = initUI(sim);
const editor = new Editor({ scene, camera, renderer, controls, world, sim, ui });

// ---- resize ----
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
}
window.addEventListener('resize', onResize);
onResize();

// ---- loop ----
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const realDt = Math.min(clock.getDelta(), 0.05); // clamp to avoid jumps on tab switch
  const t = clock.elapsedTime;
  const simDt = realDt * ui.getSpeed();

  sim.update(simDt, t);
  controls.update();
  ui.tick(performance.now());

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();
