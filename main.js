import './style.css'
import * as THREE from 'three';
import gsap from 'gsap';

const canvas = document.getElementById('canvas');

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  25,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.z = 9;
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
renderer.outputColorSpace = THREE.SRGBColorSpace;

// One-step rotation per planet; will be updated after configs load
let rotationStep = Math.PI / 2;
let orbitradius = 4.5;

// Texture loader
const textureLoader = new THREE.TextureLoader();

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.6);
directionalLight.position.set(2, 2, 5);
scene.add(directionalLight);


const starsTexture = textureLoader.load('/stars.jpg');
starsTexture.colorSpace = THREE.SRGBColorSpace;
scene.background = starsTexture;
// Make the background a bit brighter without affecting materials
scene.backgroundIntensity = 1.6;

// Group of spheres
const spheres = new THREE.Group();

// Improve color realism by enabling physically correct lighting and tone mapping
renderer.physicallyCorrectLights = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.2;

scene.add(spheres);

// Scroll: rotate spheres and switch headings (throttled)
let lastWheelTime = 0;
const throttleDelay = 2000; // ms
let currentTitleIndex = 0;
const titleViewport = document.getElementById('titleViewport');
const titleStack = document.getElementById('titleStack');
const paraViewport = document.getElementById('paraViewport');
const paraStack = document.getElementById('paraStack');

// Compute and lock viewport heights to MAX item heights to avoid bleed
function normalizeViewports() {
  if (titleViewport && titleStack && titleStack.children.length) {
    let maxH = 0;
    Array.from(titleStack.children).forEach((el) => {
      if (el instanceof HTMLElement) {
        maxH = Math.max(maxH, el.getBoundingClientRect().height);
      }
    });
    if (maxH > 0) {
      const lockedH = Math.ceil(maxH) + 8; // extra buffer
      titleViewport.style.height = `${lockedH}px`;
      // Make each heading occupy the same block height to avoid bleed
      Array.from(titleStack.children).forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.minHeight = `${lockedH}px`;
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
        }
      });
    }
  }
  if (paraViewport && paraStack && paraStack.children.length) {
    let maxP = 0;
    Array.from(paraStack.children).forEach((el) => {
      if (el instanceof HTMLElement) {
        maxP = Math.max(maxP, el.getBoundingClientRect().height);
      }
    });
    if (maxP > 0) {
      const lockedP = Math.ceil(maxP) + 8; // extra buffer
      paraViewport.style.height = `${lockedP}px`;
      // Equalize each paragraph block height and center content
      Array.from(paraStack.children).forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.minHeight = `${lockedP}px`;
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.textAlign = 'center';
        }
      });
    }
  }
}
const getMaxTitleIndex = () => (titleStack ? Math.max(0, titleStack.children.length - 1) : 0);

window.addEventListener('wheel', (e) => {
  const now = Date.now();
  if (now - lastWheelTime < throttleDelay) return;
  lastWheelTime = now;

  const direction = e.deltaY > 0 ? 1 : -1;
  // Smooth rotation by Math.PI per scroll step
  gsap.to(spheres.rotation, {
    duration: 1,
    y: `${direction > 0 ? '+=' : '-='}${rotationStep}`,
    ease: 'power2.inOut'
  });

  // Sync heading change with rotation (use locked viewport height)
  if (titleViewport && titleStack) {
    const stepHeight = titleViewport.getBoundingClientRect().height;
    const total = titleStack.children.length;
    currentTitleIndex = (currentTitleIndex + direction + total) % total;
    const offsetY = -currentTitleIndex * stepHeight;
    gsap.to(titleStack, { y: offsetY, duration: 1, ease: 'power2.inOut' });
  }

  // Sync paragraph stack (use locked viewport height)
  if (paraViewport && paraStack) {
    const paraStep = paraViewport.getBoundingClientRect().height;
    const paraOffsetY = -currentTitleIndex * paraStep;
    gsap.to(paraStack, { y: paraOffsetY, duration: 1, ease: 'power2.inOut' });
  }
}, { passive: true });

const radius = 1.3;
const segments = 64;
const planetConfigs = [
  { map: '/earth/map.jpg' },
  { map: '/venus/map.jpg' },
  { map: '/volcanic/color.png' },
  { map: '/csilla/color.png' }
];
// Update step to advance exactly one planet per scroll
rotationStep = (Math.PI * 2) / planetConfigs.length;
// Responsive orbit radius update
function updateOrbitRadius() {
  const width = window.innerWidth;
  if (width < 480) orbitradius = 3.2;
  else if (width < 768) orbitradius = 3.8;
  else if (width < 1024) orbitradius = 4.2;
  else orbitradius = 4.5;

  // reposition existing planets
  spheres.children.forEach((sphere, i) => {
    const angle = (i / spheres.children.length) * (Math.PI * 2);
    sphere.position.x = orbitradius * Math.cos(angle);
    sphere.position.z = orbitradius * Math.sin(angle);
  });
}

// Create multiple spheres in orbit
for (let i = 0; i < planetConfigs.length; i++) {
  const sphereGeometry = new THREE.SphereGeometry(radius, segments, segments);
  const planetTexture = textureLoader.load(planetConfigs[i].map);
  planetTexture.colorSpace = THREE.SRGBColorSpace;
  const sphereMaterial = new THREE.MeshStandardMaterial({
    map: planetTexture,
    metalness: 0.1,
    roughness: 0.6,
    envMapIntensity: 1.2
  });

  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  const angle = (i / planetConfigs.length) * (Math.PI * 2);
  sphere.position.x = orbitradius * Math.cos(angle);
  sphere.position.z = orbitradius * Math.sin(angle);

  spheres.add(sphere);
}

spheres.rotation.x = 0.1;
spheres.rotation.y = -Math.PI / 2; // Start with Earth at the front
spheres.position.y = -0.8;

// initial responsive orbit
updateOrbitRadius();
normalizeViewports();

// Ensure measurements after fonts/styles fully load
window.addEventListener('load', normalizeViewports);
document.fonts && document.fonts.ready && document.fonts.ready.then(normalizeViewports);


// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  updateOrbitRadius();
  normalizeViewports();
});

// Touch swipe support (mobile)
let touchStartY = null;
window.addEventListener('touchstart', (e) => {
  if (e.touches && e.touches.length) touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchend', (e) => {
  if (touchStartY == null) return;
  const touchEndY = e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientY : touchStartY;
  const deltaY = touchStartY - touchEndY;
  touchStartY = null;

  const now = Date.now();
  if (now - lastWheelTime < throttleDelay) return;
  lastWheelTime = now;

  const direction = deltaY > 0 ? 1 : -1;
  gsap.to(spheres.rotation, {
    duration: 1,
    y: `${direction > 0 ? '+=' : '-='}${rotationStep}`,
    ease: 'power2.inOut'
  });

  if (titleViewport && titleStack) {
    const stepHeight = titleViewport.getBoundingClientRect().height;
    const total = titleStack.children.length;
    currentTitleIndex = (currentTitleIndex + direction + total) % total;
    const offsetY = -currentTitleIndex * stepHeight;
    gsap.to(titleStack, { y: offsetY, duration: 1, ease: 'power2.inOut' });
  }

  if (paraViewport && paraStack) {
    const paraStep = paraViewport.getBoundingClientRect().height;
    const paraOffsetY = -currentTitleIndex * paraStep;
    gsap.to(paraStack, { y: paraOffsetY, duration: 1, ease: 'power2.inOut' });
  }
}, { passive: true });

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  // Subtle self-rotation for each planet
  spheres.children.forEach((planetMesh) => {
    planetMesh.rotation.y += 0.0025;
  });
  renderer.render(scene, camera);
}
animate();
