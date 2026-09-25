// Interactive preview of one reconstructed environment:
// full-resolution Gaussian-splat background (static/envs/<scene>/scene.sog,
// SH degree 1) + object meshes (objects.glb) at their physically settled
// poses. The meshes are baked in the robot frame (z-up, metres); the splat
// stays in its reconstruction frame and is placed with meta.splat
// (world = scale * R * p + pos), so its view-dependent colour stays correct.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";

const params = new URLSearchParams(location.search);
const sceneName = (params.get("scene") || "droid2").replace(/[^a-z0-9_]/gi, "");
const base = `../envs/${sceneName}/`;
const status = document.getElementById("status");

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
scene.add(new SparkRenderer({ renderer }));

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.02, 100);
camera.up.set(0, 0, 1);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.15;
controls.maxDistance = 3.0;
controls.maxPolarAngle = Math.PI * 0.49; // stay above the table plane

scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(0.3, -0.4, 1.5);
scene.add(sun);

let home = null;
function resetView() {
  if (!home) return;
  camera.position.copy(home.position);
  controls.target.copy(home.target);
  camera.fov = home.fov;
  camera.updateProjectionMatrix();
  controls.update();
  wake();
}
document.getElementById("reset").addEventListener("click", resetView);

async function load() {
  const meta = await (await fetch(base + "meta.json")).json();

  const pose = meta.splat;
  const splat = new SplatMesh({ url: base + pose.file });
  const [qw, qx, qy, qz] = pose.quat_wxyz;
  splat.quaternion.set(qx, qy, qz, qw);
  splat.position.fromArray(pose.pos);
  splat.scale.setScalar(pose.scale);
  scene.add(splat);

  const gltf = await new GLTFLoader().loadAsync(base + "objects.glb");
  scene.add(gltf.scene);

  // Start from the original DROID exterior camera (OpenCV world->camera).
  const E = meta.extrinsics_w2c;
  const R = new THREE.Matrix3().set(
    E[0][0], E[0][1], E[0][2],
    E[1][0], E[1][1], E[1][2],
    E[2][0], E[2][1], E[2][2]);
  const Rt = R.clone().transpose();
  const t = new THREE.Vector3(E[0][3], E[1][3], E[2][3]);
  const position = t.clone().applyMatrix3(Rt).negate();
  const forward = new THREE.Vector3(0, 0, 1).applyMatrix3(Rt).normalize();

  const box = new THREE.Box3().setFromObject(gltf.scene);
  const center = box.getCenter(new THREE.Vector3());
  // Orbit around the point on the view ray closest to the objects.
  const depth = Math.max(0.2, center.clone().sub(position).dot(forward));
  const target = position.clone().addScaledVector(forward, depth);

  const K = meta.intrinsics;
  const fov = THREE.MathUtils.radToDeg(2 * Math.atan(K[1][2] / K[1][1]));
  home = { position, target, fov: Math.min(Math.max(fov, 35), 75) };
  resetView();

  await splat.initialized;
  status.remove();
  wake(120);
}

load().catch((err) => {
  console.error(err);
  status.textContent = "Could not load this scene.";
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  wake();
});

// Render on demand: keep drawing while the view is changing (and for a short
// while after, so Spark can finish re-sorting splats), then go idle.
let framesLeft = 0;
const wake = (n = 90) => { framesLeft = Math.max(framesLeft, n); };
controls.addEventListener("change", () => wake());
controls.addEventListener("start", () => wake(1e9));
controls.addEventListener("end", () => { framesLeft = 90; });

renderer.setAnimationLoop(() => {
  if (document.hidden || framesLeft <= 0) return;
  framesLeft--;
  controls.update();
  renderer.render(scene, camera);
  if (framesLeft === 0) document.body.dataset.idle = "1";
});
