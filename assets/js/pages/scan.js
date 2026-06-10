/*
  Halaman Scan QR.
  Memindai QR organ lewat kamera, lalu menampilkan model + info organ.
*/
import { requireAuth } from "../modules/auth.js";
import { renderNav } from "../modules/nav.js";
import * as db from "../modules/db.js";
import { QrScanner, parseOrganPayload } from "../modules/qr.js";
import { el, toast } from "../modules/ui.js";

(async () => {
  const profile = await requireAuth();
  if (!profile) return;
  renderNav(profile, "scan.html");

  const root = document.getElementById("page-root");
  const reader = el("div", { id: "qr-reader" });
  const result = el("div", { class: "mt-24" });

  const camSelect = el("select", { style: "max-width:340px" }, [el("option", { text: "Deteksi kamera dulu" })]);
  let scanner = null;
  let busy = false;

  async function onDecoded(text) {
    if (busy) return;
    const id = parseOrganPayload(text);
    if (!id) return; // bukan QR organ
    busy = true;
    try {
      const organ = await db.getOrgan(id);
      showOrgan(organ);
      toast(`Organ dikenali: ${organ.name}`, "success");
    } catch (e) {
      toast("QR tidak cocok dengan organ mana pun", "error");
      busy = false;
    }
  }

  function showOrgan(organ) {
    result.innerHTML = "";
    const card = el("div", { class: "card" }, [
      el("h2", { text: organ.name }),
    ]);
    if (organ.model_url) {
      card.appendChild(
        el("model-viewer", {
          src: organ.model_url,
          "camera-controls": "",
          "auto-rotate": "",
          ar: "",
          style: "width:100%;height:320px;border-radius:14px;background:linear-gradient(180deg,#f2f9fd,#e7f1fb)",
        })
      );
    }
    const addList = (label, items, variant) => {
      if (!items || !items.length) return;
      card.appendChild(el("div", { class: "editor-section" }, [el("h4", { text: label })]));
      const ul = el("ul", { class: "item-list" });
      items.forEach((t) => ul.appendChild(el("li", { class: `item-row ${variant}` }, [el("span", { text: t })])));
      card.appendChild(ul);
    };
    addList("Deskripsi", organ.descriptions, "");
    addList("Fungsi", organ.functions, "mint");
    card.appendChild(
      el("button", {
        class: "btn btn-ghost btn-sm mt-16",
        text: "Pindai lagi",
        onClick: () => {
          result.innerHTML = "";
          busy = false;
        },
      })
    );
    result.appendChild(card);
  }

  const startBtn = el("button", {
    class: "btn btn-primary",
    text: "Mulai pindai",
    onClick: async () => {
      try {
        scanner = new QrScanner("qr-reader");
        const camId = camSelect.value && !camSelect.value.startsWith("Deteksi") ? camSelect.value : null;
        await scanner.start(camId, onDecoded);
        startBtn.classList.add("hidden");
        stopBtn.classList.remove("hidden");
      } catch (e) {
        toast(e.message || "Gagal memulai kamera", "error");
      }
    },
  });

  const stopBtn = el("button", {
    class: "btn btn-danger hidden",
    text: "Berhenti",
    onClick: async () => {
      if (scanner) await scanner.stop();
      stopBtn.classList.add("hidden");
      startBtn.classList.remove("hidden");
    },
  });

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

  root.append(
    el("h1", { class: "page-title", text: "Scan QR Organ" }),
    el("p", { class: "muted", text: "Arahkan kamera ke QR organ untuk menampilkannya. DroidCam juga muncul di daftar kamera." }),
    el("div", { class: "field mt-16", style: "max-width:340px" }, [el("label", { text: "Kamera" }), camSelect]),
    el("div", { class: "flex gap-8" }, [detectBtn, startBtn, stopBtn]),
    el("div", { class: "mt-24" }, [reader]),
    result
  );
})();
