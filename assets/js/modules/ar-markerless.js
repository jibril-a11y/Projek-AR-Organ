/*
  Modul AR Markerless.

  Tidak memerlukan marker. Kamera ditampilkan sebagai latar belakang, lalu
  model 3D organ ditampilkan melayang di depannya. Pengguna bisa memutar
  model dengan menggeser jari/mouse dan mengubah ukuran dengan scroll/cubit.

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

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  camera.position.set(0, 0, 4);

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
      const scale = 2 / maxDim;
      model.scale.setScalar(scale);
      group.add(model);
    } catch (e) {
      addFallback();
    }
  } else {
    addFallback();
  }

  // 4. Interaksi: geser untuk memutar, scroll/cubit untuk skala.
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let userScale = 1;

  const onDown = (x, y) => {
    dragging = true;
    lastX = x;
    lastY = y;
  };
  const onMove = (x, y) => {
    if (!dragging) return;
    group.rotation.y += (x - lastX) * 0.01;
    group.rotation.x += (y - lastY) * 0.01;
    lastX = x;
    lastY = y;
  };
  const onUp = () => (dragging = false);

  const dom = renderer.domElement;
  dom.addEventListener("mousedown", (e) => onDown(e.clientX, e.clientY));
  window.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
  window.addEventListener("mouseup", onUp);
  dom.addEventListener("touchstart", (e) =>
    onDown(e.touches[0].clientX, e.touches[0].clientY)
  );
  dom.addEventListener("touchmove", (e) => {
    onMove(e.touches[0].clientX, e.touches[0].clientY);
  });
  dom.addEventListener("touchend", onUp);
  dom.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      userScale *= e.deltaY < 0 ? 1.08 : 0.92;
      userScale = Math.min(4, Math.max(0.3, userScale));
      group.scale.setScalar(userScale);
    },
    { passive: false }
  );

  // 5. Loop animasi.
  let running = true;
  function loop() {
    if (!running) return;
    if (!dragging) group.rotation.y += 0.005; // putar pelan otomatis
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();

  // 6. Tanggap ukuran layar.
  const onResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener("resize", onResize);

  // Fungsi penghentian.
  return function stop() {
    running = false;
    window.removeEventListener("resize", onResize);
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch (e) {
      /* abaikan */
    }
    renderer.dispose();
    container.innerHTML = "";
  };
}
