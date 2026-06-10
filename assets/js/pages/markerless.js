/*
  Halaman AR Markerless.
  Pilih organ + kamera, lalu tampilkan model 3D di atas kamera tanpa marker.
*/
import { requireAuth } from "../modules/auth.js";
import { renderNav } from "../modules/nav.js";
import * as db from "../modules/db.js";
import { listCameras, startMarkerless } from "../modules/ar-markerless.js";
import { el, toast } from "../modules/ui.js";

(async () => {
  const profile = await requireAuth();
  if (!profile) return;
  renderNav(profile, "ar-markerless.html");

  const container = document.getElementById("ar-container");
  const setup = document.getElementById("ar-setup");
  const controls = document.getElementById("ar-controls");
  const status = document.getElementById("ar-status");
  let stopFn = null;

  const organs = await db.listOrgans().catch(() => []);

  function showSetup() {
    setup.classList.remove("hidden");
    controls.classList.add("hidden");
    status.classList.add("hidden");
    if (stopFn) {
      stopFn();
      stopFn = null;
    }
  }

  // Tombol berhenti (selalu ada, kini bisa diklik karena z-index diperbaiki).
  controls.appendChild(
    el("button", { class: "btn btn-danger btn-sm", text: "Berhenti", onClick: showSetup })
  );

  const organSelect = el(
    "select",
    {},
    organs.length
      ? organs.map((o) => el("option", { value: o.id, text: o.name }))
      : [el("option", { text: "Belum ada organ" })]
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
    text: "Mulai",
    onClick: async () => {
      if (!organs.length) return toast("Belum ada organ", "error");
      startBtn.disabled = true;
      startBtn.textContent = "Memuat...";
      try {
        const organ = organs.find((o) => o.id === organSelect.value);
        setup.classList.add("hidden");
        controls.classList.remove("hidden");
        status.classList.remove("hidden");
        status.textContent = "Memuat model...";
        stopFn = await startMarkerless({
          container,
          organ,
          deviceId: camSelect.value && !camSelect.value.startsWith("Tekan") ? camSelect.value : null,
        });
        status.innerHTML = '<span class="scan-hint"><span class="scan-dot"></span>Geser untuk memutar model</span>';
      } catch (e) {
        toast(e.message, "error");
        showSetup();
      } finally {
        startBtn.disabled = false;
        startBtn.textContent = "Mulai";
      }
    },
  });

  setup.appendChild(
    el("div", { class: "card" }, [
      el("h2", { text: "AR Markerless" }),
      el("p", { class: "muted", text: "Tidak perlu marker. Pilih organ dan kamera lalu mulai." }),
      el("div", { class: "field mt-16" }, [el("label", { text: "Organ" }), organSelect]),
      el("div", { class: "field" }, [el("label", { text: "Kamera" }), camSelect]),
      el("div", { class: "flex gap-8" }, [detectBtn, startBtn]),
    ])
  );
})();
