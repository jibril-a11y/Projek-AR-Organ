/*
  Modul AR Markerless.

  Tidak memerlukan marker. Kamera ditampilkan sebagai latar belakang, lalu
  model 3D organ ditampilkan di depannya. Pengguna bisa:
    - Memindahkan model ke mana saja (geser satu jari / dua jari, atau mouse).
    - Memperbesar/memperkecil (cubit dua jari, scroll, atau tombol +/-).
    - Memutar model (mode Putar).
    - Reset posisi/ukuran.

  Memakai Three.js + GLTFLoader dari CDN.
*/
import * as THREE from "https://esm.sh/three@0.160.0";
import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

// Terjemahkan error kamera agar mudah dipahami.
function describeCameraError(e) {
  switch (e && e.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Akses kamera ditolak. Izinkan kamera di browser lalu coba lagi.";
    case "NotReadableError":
    case "TrackStartError":
      return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu coba lagi.";
    case "NotFoundError":
      return "Kamera tidak ditemukan.";
    case "OverconstrainedError":
      return "Kamera yang dipilih tidak tersedia. Pilih ulang kamera.";
    default:
      return "Gagal mengakses kamera: " + (e && e.message ? e.message : "");
  }
}

export async function listCameras() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
      "Browser tidak mengizinkan kamera. Buka lewat HTTPS atau localhost."
    );
  }
  let s;
  try {
    s = await navigator.mediaDevices.getUserMedia({ video: true });
  } catch (e) {
    throw new Error(describeCameraError(e));
  } finally {
    if (s) s.getTracks().forEach((t) => t.stop());
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((d) => d.kind === "videoinput")
    .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Kamera ${i + 1}` }));
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 6;
const CAM_Z = 4;
const FOV = 50;

export async function startMarkerless({ container, organ, deviceId }) {
  // 1. Ambil stream kamera.
  let stream;
  try {
    const video = deviceId ? { deviceId: { exact: deviceId } } : true;
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video });
  } catch (e) {
    throw new Error(describeCameraError(e));
  }

  const videoEl = document.createElement("video");
  videoEl.setAttribute("playsinline", "");
  videoEl.muted = true;
  videoEl.srcObject = stream;
  await videoEl.play();

  // 2. Siapkan Three.js.
  const width = container.clientWidth;
  const height = container.clientHeight;

  const scene = new THREE.Scene();
  const videoTexture = new THREE.VideoTexture(videoEl);
  videoTexture.colorSpace = THREE.SRGBColorSpace;
  scene.background = videoTexture;

  const camera = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 100);
  camera.position.set(0, 0, CAM_Z);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // Pencahayaan.
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(2, 3, 4);
  scene.add(dir);

  // 3. Muat model organ (atau bola berwarna sebagai pengganti).
  const group = new THREE.Group();
  scene.add(group);

  function addFallback() {
    const color = new THREE.Color(organ.color || "#32a3cd");
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 48),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 })
    );
    group.add(mesh);
  }

  if (organ.model_url) {
    try {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(organ.model_url);
      const model = gltf.scene;
      // Pusatkan dan skalakan agar pas di layar.
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      model.scale.setScalar(2 / maxDim);
      group.add(model);
    } catch (e) {
      addFallback();
    }
  } else {
    addFallback();
  }

  // ---------- 4. Interaksi ----------
  let mode = "move"; // "move" (geser) atau "rotate" (putar)
  let userScale = 1;
  let autoRotate = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  // Dua jari (cubit + geser).
  let pinchActive = false;
  let lastPinchDist = 0;
  let lastMidX = 0;
  let lastMidY = 0;

  // Berapa satuan dunia per piksel pada bidang model (untuk geser 1:1).
  function worldPerPixel() {
    const h = container.clientHeight || height;
    const dist = camera.position.z - group.position.z;
    return (2 * dist * Math.tan((FOV / 2) * (Math.PI / 180))) / h;
  }

  function applyScale() {
    userScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, userScale));
    group.scale.setScalar(userScale);
  }

  function moveByPixels(dx, dy) {
    const k = worldPerPixel();
    group.position.x += dx * k;
    group.position.y -= dy * k; // sumbu Y layar terbalik
  }

  function rotateByPixels(dx, dy) {
    group.rotation.y += dx * 0.01;
    group.rotation.x += dy * 0.01;
  }

  function applyDrag(dx, dy) {
    if (mode === "rotate") rotateByPixels(dx, dy);
    else moveByPixels(dx, dy);
  }

  const dom = renderer.domElement;
  dom.style.touchAction = "none"; // cegah browser scroll saat menyentuh model

  // -- Mouse (desktop) --
  const onMouseDown = (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    applyDrag(e.clientX - lastX, e.clientY - lastY);
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const onMouseUp = () => (dragging = false);
  dom.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);

  const onWheel = (e) => {
    e.preventDefault();
    userScale *= e.deltaY < 0 ? 1.08 : 0.92;
    applyScale();
  };
  dom.addEventListener("wheel", onWheel, { passive: false });

  // -- Sentuh (HP) --
  function touchDist(t) {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.hypot(dx, dy);
  }
  function touchMid(t) {
    return {
      x: (t[0].clientX + t[1].clientX) / 2,
      y: (t[0].clientY + t[1].clientY) / 2,
    };
  }

  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      dragging = true;
      pinchActive = false;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      dragging = false;
      pinchActive = true;
      lastPinchDist = touchDist(e.touches);
      const m = touchMid(e.touches);
      lastMidX = m.x;
      lastMidY = m.y;
    }
  };
  const onTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchActive) {
      // Cubit untuk skala.
      const d = touchDist(e.touches);
      if (lastPinchDist > 0) {
        userScale *= d / lastPinchDist;
        applyScale();
      }
      lastPinchDist = d;
      // Geser titik tengah dua jari untuk memindahkan model.
      const m = touchMid(e.touches);
      moveByPixels(m.x - lastMidX, m.y - lastMidY);
      lastMidX = m.x;
      lastMidY = m.y;
    } else if (e.touches.length === 1 && dragging) {
      // Satu jari: geser atau putar sesuai mode.
      applyDrag(e.touches[0].clientX - lastX, e.touches[0].clientY - lastY);
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }
  };
  const onTouchEnd = (e) => {
    if (e.touches.length === 0) {
      dragging = false;
      pinchActive = false;
    } else if (e.touches.length === 1) {
      // Dari dua jari turun ke satu jari: lanjut sebagai geser/putar.
      pinchActive = false;
      dragging = true;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }
  };
  dom.addEventListener("touchstart", onTouchStart, { passive: false });
  dom.addEventListener("touchmove", onTouchMove, { passive: false });
  dom.addEventListener("touchend", onTouchEnd);
  dom.addEventListener("touchcancel", onTouchEnd);

  // ---------- 5. Loop animasi ----------
  let running = true;
  function loop() {
    if (!running) return;
    if (autoRotate && !dragging && !pinchActive) group.rotation.y += 0.005;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();

  // ---------- 6. Tanggap ukuran layar ----------
  const onResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener("resize", onResize);

  // ---------- Controller yang dikembalikan ----------
  return {
    setMode(m) {
      mode = m === "rotate" ? "rotate" : "move";
      return mode;
    },
    getMode() {
      return mode;
    },
    toggleAutoRotate() {
      autoRotate = !autoRotate;
      return autoRotate;
    },
    zoomBy(factor) {
      userScale *= factor;
      applyScale();
    },
    reset() {
      group.position.set(0, 0, 0);
      group.rotation.set(0, 0, 0);
      userScale = 1;
      applyScale();
    },
    stop() {
      running = false;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      try {
        stream.getTracks().forEach((t) => t.stop());
      } catch (e) {}
      renderer.dispose();
      container.innerHTML = "";
    },
  };
}
