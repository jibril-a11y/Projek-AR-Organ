/*
  Halaman Scan QR.
  Memindai QR organ lewat kamera, lalu LANGSUNG menampilkan model 3D organ
  sebagai AR di atas kamera (dunia nyata), bukan sekadar penampil 3D di web.
  Di mode AR, model bisa digeser, diperbesar/diperkecil, dan diputar.
*/
import { requireAuth } from "../modules/auth.js";
import { renderNav } from "../modules/nav.js";
import * as db from "../modules/db.js";
import { QrScanner, parseOrganPayload } from "../modules/qr.js";
import { startMarkerless } from "../modules/ar-markerless.js";
import { el, toast } from "../modules/ui.js";

(async () => {
  const profile = await requireAuth();
  if (!profile) return;
  renderNav(profile, "scan.html");

  const pageRoot = document.getElementById("page-root");
  const stage = document.getElementById("ar-stage");
  const container = document.getElementById("ar-container");
  const status = document.getElementById("ar-status");
  const controls = document.getElementById("ar-controls");
  const overlay = document.getElementById("ar-overlay");

  let scanner = null;
  let controller = null;
  let modelBar = null;
  let busy = false;
  let lastCamId = null;

  // ---------- Tampilan pemindai ----------
  const reader = el("div", { id: "qr-reader" });
  const camSelect = el("select", { style: "max-width:340px" }, [el("option", { text: "Deteksi kamera dulu" })]);

  const detectBtn = el("button", {
    class: "btn btn-ghost",
    text: "Deteksi kamera",
    onClick: async () => {
      try {
        const cams = await QrScanner.listCameras();
        camSelect.innerHTML = "";
        cams.forEach((c) => camSelect.appendChild(el("option", { value: c.id, text: c.label })));
        toast(`${cams.length} kamera ditemukan`, "success");
      } catch (e) {
        toast("Tidak bisa membaca daftar kamera. Pastikan izin kamera aktif.", "error");
      }
    },
  });

  const startBtn = el("button", {
    class: "btn btn-primary",
    text: "Mulai pindai",
    onClick: startScanning,
  });
  const stopBtn = el("button", {
    class: "btn btn-danger hidden",
    text: "Berhenti",
    onClick: stopScanning,
  });

  pageRoot.append(
    el("h1", { class: "page-title", text: "Scan QR Organ" }),
    el("p", { class: "muted", text: "Arahkan kamera ke QR organ. Setelah terbaca, organ langsung tampil sebagai AR di atas kamera." }),
    el("div", { class: "field mt-16", style: "max-width:340px" }, [el("label", { text: "Kamera" }), camSelect]),
    el("div", { class: "flex gap-8" }, [detectBtn, startBtn, stopBtn]),
    el("div", { class: "mt-24" }, [reader])
  );

  function currentCamId() {
    const v = camSelect.value;
    return v && !v.startsWith("Deteksi") ? v : null;
  }

  async function startScanning() {
    try {
      busy = false;
      scanner = new QrScanner("qr-reader");
      lastCamId = currentCamId();
      await scanner.start(lastCamId, onDecoded);
      startBtn.classList.add("hidden");
      stopBtn.classList.remove("hidden");
    } catch (e) {
      toast(e.message || "Gagal memulai kamera", "error");
    }
  }

  async function stopScanning() {
    if (scanner) {
      await scanner.stop();
      scanner = null;
    }
    stopBtn.classList.add("hidden");
    startBtn.classList.remove("hidden");
  }

  async function onDecoded(text) {
    if (busy) return;
    const id = parseOrganPayload(text);
    if (!id) return; // bukan QR organ
    busy = true;
    try {
      const organ = await db.getOrgan(id);
      // Hentikan pemindai (lepas kamera) lalu masuk AR.
      if (scanner) {
        await scanner.stop();
        scanner = null;
      }
      await enterAR(organ);
    } catch (e) {
      toast("QR tidak cocok dengan organ mana pun", "error");
      busy = false;
    }
  }

  // ---------- Mode AR ----------
  function showInfo(organ) {
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

  function buildControls() {
    controls.innerHTML = "";
    // Tombol kembali memindai (di kanan atas).
    controls.appendChild(
      el("button", { class: "btn btn-danger btn-sm", text: "Pindai lagi", onClick: backToScan })
    );
    // Bilah kontrol model (bawah tengah).
    if (modelBar) modelBar.remove();
    const modeBtn = el("button", {
      class: "btn btn-primary btn-sm",
      text: "Mode: Geser",
      onClick: () => {
        const m = controller.getMode() === "move" ? "rotate" : "move";
        controller.setMode(m);
        modeBtn.textContent = m === "move" ? "Mode: Geser" : "Mode: Putar";
      },
    });
    modelBar = el("div", { class: "ar-model-controls" }, [
      modeBtn,
      el("button", { class: "btn btn-ghost btn-sm", text: "-", title: "Perkecil", onClick: () => controller.zoomBy(0.85) }),
      el("button", { class: "btn btn-ghost btn-sm", text: "+", title: "Perbesar", onClick: () => controller.zoomBy(1.15) }),
      el("button", { class: "btn btn-accent btn-sm", text: "Reset", onClick: () => controller.reset() }),
    ]);
    stage.appendChild(modelBar);
  }

  async function enterAR(organ) {
    pageRoot.classList.add("hidden");
    stage.classList.remove("hidden");
    status.textContent = "Memuat model...";
    try {
      controller = await startMarkerless({ container, organ, deviceId: lastCamId });
      buildControls();
      showInfo(organ);
      status.innerHTML = '<span class="scan-hint"><span class="scan-dot"></span>Geser untuk pindah, cubit untuk ukuran</span>';
    } catch (e) {
      toast(e.message, "error");
      backToScan();
    }
  }

  async function backToScan() {
    if (controller) {
      controller.stop();
      controller = null;
    }
    if (modelBar) {
      modelBar.remove();
      modelBar = null;
    }
    overlay.innerHTML = "";
    controls.innerHTML = "";
    stage.classList.add("hidden");
    pageRoot.classList.remove("hidden");
    busy = false;
    // Mulai pindai lagi otomatis.
    startScanning();
  }
})();
