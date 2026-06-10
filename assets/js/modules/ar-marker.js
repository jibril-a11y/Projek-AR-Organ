/*
  Modul AR Marker (MindAR image tracking).

  Memuat file targets.mind dari Supabase Storage dan menampilkan model 3D
  organ saat marker (QR yang dicetak) terdeteksi. Kamera diambil sendiri
  lebih dulu agar error jelas, lalu MindAR memakai ulang stream tersebut.
*/
import * as db from "./db.js";
import { getMindUrl } from "./storage.js";
import { el } from "./ui.js";

let originalGUM = null;

function describeCameraError(e) {
  switch (e && e.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Akses kamera ditolak. Izinkan kamera lalu coba lagi.";
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
    throw new Error("Browser tidak mengizinkan kamera. Buka via HTTPS/localhost.");
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

function buildEntity(organ) {
  const common = `position="${organ.position || "0 0 0"}" rotation="${
    organ.rotation || "0 0 0"
  }" scale="${organ.scale || "0.5 0.5 0.5"}"`;
  const spin =
    'animation="property: rotation; to: 0 360 0; loop: true; dur: 9000; easing: linear"';
  const inner = organ.model_url
    ? `<a-gltf-model src="${organ.model_url}" ${common} ${spin}></a-gltf-model>`
    : `<a-sphere color="${organ.color || "#32a3cd"}" radius="0.4" ${common} ${spin}></a-sphere>`;
  return `<a-entity class="ar-target" data-id="${organ.id}" mindar-image-target="targetIndex: ${organ.target_index}">${inner}</a-entity>`;
}

function showInfo(overlay, organ) {
  overlay.innerHTML = "";
  const card = el("div", { class: "ar-info-card" }, [el("h3", { text: organ.name })]);
  if ((organ.descriptions || []).length) {
    card.appendChild(el("div", { class: "section-label", text: "Deskripsi" }));
    const ul = el("ul");
    organ.descriptions.forEach((d) => ul.appendChild(el("li", { text: d })));
    card.appendChild(ul);
  }
  if ((organ.functions || []).length) {
    card.appendChild(el("div", { class: "section-label", text: "Fungsi" }));
    const ul = el("ul");
    organ.functions.forEach((f) => ul.appendChild(el("li", { text: f })));
    card.appendChild(ul);
  }
  overlay.appendChild(card);
}

export async function startAR({ container, overlay, status, deviceId }) {
  const organs = await db.listOrgans();
  const tracked = organs.filter((o) => o.target_index >= 0 && o.marker_image_url);
  if (!tracked.length) {
    throw new Error(
      "Belum ada marker terkompilasi. Buka Admin > Kompilasi Marker terlebih dulu."
    );
  }

  const mindUrl = getMindUrl();
  const maxTrack = tracked.length;
  const entities = tracked.map(buildEntity).join("\n");

  const sceneHtml = `
    <a-scene embedded style="width:100%;height:100%;"
      mindar-image="imageTargetSrc: ${mindUrl}; autoStart: false; maxTrack: ${maxTrack}; uiScanning: no; uiLoading: no; uiError: no"
      color-space="sRGB"
      renderer="colorManagement: true, physicallyCorrectLights, alpha: true"
      vr-mode-ui="enabled: false"
      device-orientation-permission-ui="enabled: false">
      <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
      <a-entity light="type: ambient; intensity: 1.1"></a-entity>
      <a-entity light="type: directional; intensity: 0.7" position="1 1 1"></a-entity>
      ${entities}
    </a-scene>`;
  container.innerHTML = sceneHtml;
  const scene = container.querySelector("a-scene");

  container.querySelectorAll(".ar-target").forEach((node) => {
    const organ = tracked.find((o) => o.id === node.getAttribute("data-id"));
    node.addEventListener("targetFound", () => {
      status.textContent = `Terdeteksi: ${organ.name}`;
      showInfo(overlay, organ);
    });
    node.addEventListener("targetLost", () => {
      status.innerHTML = '<span class="scan-hint"><span class="scan-dot"></span>Arahkan ke marker</span>';
      overlay.innerHTML = "";
    });
  });

  // Ambil stream dulu.
  status.textContent = "Menyiapkan kamera...";
  let stream;
  try {
    const video = deviceId ? { deviceId: { exact: deviceId } } : true;
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video });
  } catch (e) {
    throw new Error(describeCameraError(e));
  }
  const md = navigator.mediaDevices;
  originalGUM = md.getUserMedia.bind(md);
  md.getUserMedia = async () => stream;
  const restore = () => {
    if (originalGUM) md.getUserMedia = originalGUM;
    originalGUM = null;
  };
  const cleanup = () => {
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch (e) {}
  };

  await new Promise((r) => (scene.hasLoaded ? r() : scene.addEventListener("loaded", r, { once: true })));
  const system = scene.systems["mindar-image-system"];
  if (!system) {
    restore();
    cleanup();
    throw new Error("Komponen MindAR gagal dimuat. Periksa koneksi internet.");
  }

  await new Promise((resolve, reject) => {
    let settled = false;
    scene.addEventListener("arReady", () => !settled && ((settled = true), resolve()), { once: true });
    scene.addEventListener(
      "arError",
      (ev) => !settled && ((settled = true), reject(new Error("MindAR gagal memulai. Muat ulang halaman."))),
      { once: true }
    );
    try {
      system.start();
    } catch (e) {
      if (!settled) ((settled = true), reject(e));
    }
    setTimeout(() => !settled && ((settled = true), resolve()), 6000);
  }).catch((err) => {
    restore();
    cleanup();
    container.innerHTML = "";
    throw err;
  });

  status.innerHTML = '<span class="scan-hint"><span class="scan-dot"></span>Arahkan ke marker</span>';
  restore();

  return function stop() {
    try {
      system.stop();
    } catch (e) {}
    cleanup();
    container.innerHTML = "";
    overlay.innerHTML = "";
  };
}
