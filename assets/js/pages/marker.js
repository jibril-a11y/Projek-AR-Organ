/*
  Halaman AR Marker (MindAR). Pilih kamera lalu lacak marker QR yang dicetak.
*/
import { requireAuth } from "../modules/auth.js";
import { renderNav } from "../modules/nav.js";
import { listCameras, startAR } from "../modules/ar-marker.js";
import { el, toast } from "../modules/ui.js";

(async () => {
  const profile = await requireAuth();
  if (!profile) return;
  renderNav(profile, "ar-marker.html");

  const container = document.getElementById("ar-container");
  const setup = document.getElementById("ar-setup");
  const controls = document.getElementById("ar-controls");
  const status = document.getElementById("ar-status");
  const overlay = document.getElementById("ar-overlay");
  let stopFn = null;

  function showSetup() {
    setup.classList.remove("hidden");
    controls.classList.add("hidden");
    status.classList.add("hidden");
    overlay.innerHTML = "";
    if (stopFn) {
      stopFn();
      stopFn = null;
    }
  }

  controls.appendChild(
    el("button", { class: "btn btn-danger btn-sm", text: "Berhenti", onClick: showSetup })
  );

  const camSelect = el("select", {}, [el("option", { text: "Tekan Deteksi kamera" })]);
  const detectBtn = el("button", {
    class: "btn btn-ghost mt-8",
    text: "Deteksi kamera",
    onClick: async () => {
      try {
        const cams = await listCameras();
        camSelect.innerHTML = "";
        cams.forEach((c) => camSelect.appendChild(el("option", { value: c.deviceId, text: c.label })));
        toast(`${cams.length} kamera ditemukan`, "success");
      } catch (e) {
        toast(e.message, "error");
      }
    },
  });

  const startBtn = el("button", {
    class: "btn btn-primary mt-8",
    text: "Mulai AR",
    onClick: async () => {
      const deviceId = camSelect.value && !camSelect.value.startsWith("Tekan") ? camSelect.value : null;
      if (!deviceId) return toast("Deteksi dan pilih kamera dulu", "error");
      startBtn.disabled = true;
      startBtn.textContent = "Memuat...";
      try {
        setup.classList.add("hidden");
        controls.classList.remove("hidden");
        status.classList.remove("hidden");
        stopFn = await startAR({ container, overlay, status, deviceId });
      } catch (e) {
        toast(e.message, "error");
        showSetup();
      } finally {
        startBtn.disabled = false;
        startBtn.textContent = "Mulai AR";
      }
    },
  });

  setup.appendChild(
    el("div", { class: "card" }, [
      el("h2", { text: "Mode AR Marker" }),
      el("p", { class: "muted", text: "Cetak QR organ dari panel Admin, lalu arahkan kamera ke QR tersebut. Marker harus sudah dikompilasi (Admin > Kompilasi Marker)." }),
      el("div", { class: "field mt-16" }, [el("label", { text: "Kamera" }), camSelect]),
      el("div", { class: "flex gap-8" }, [detectBtn, startBtn]),
    ])
  );
})();
