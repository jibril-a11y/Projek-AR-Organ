/*
  Modul Kompilasi Marker (untuk peran guru/admin).

  Dua cara menyiapkan file targets.mind untuk mode AR Marker:
  1) Otomatis: mengompilasi gambar marker di browser lalu mengunggahnya.
     Praktis, tetapi bisa gagal pada sebagian perangkat/jaringan.
  2) Manual (lebih andal): unduh semua gambar marker secara berurutan,
     kompilasi di alat resmi MindAR (https://hiukim.github.io/mind-ar-js-doc/tools/compile),
     lalu unggah file targets.mind di sini. Indeks ditetapkan sesuai urutan.
*/
import * as db from "./db.js";
import { uploadMind } from "./storage.js";
import { el, toast } from "./ui.js";

const MINDAR_MODULE_URL =
  "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js";
let _Compiler = null;

async function loadCompiler() {
  if (_Compiler) return _Compiler;
  const mod = await import(MINDAR_MODULE_URL);
  _Compiler = mod.Compiler || (window.MINDAR && window.MINDAR.IMAGE && window.MINDAR.IMAGE.Compiler);
  if (!_Compiler) throw new Error("Compiler MindAR tidak ditemukan.");
  return _Compiler;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar: " + url));
    img.src = url;
  });
}

// Tetapkan target_index tiap organ sesuai urutan daftar (0,1,2,...).
async function assignIndices(organs) {
  for (let i = 0; i < organs.length; i++) {
    await db.updateOrgan(organs[i].id, { target_index: i });
  }
}

async function downloadUrlAs(url, filename) {
  const res = await fetch(url);
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = el("a", { href: objUrl, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objUrl), 4000);
}

export function initMarkerCompiler(root) {
  root.innerHTML = "";

  // ---------- Daftar urutan marker ----------
  const orderRoot = el("div", { class: "card" }, [el("h3", { text: "Urutan Marker" })]);
  const orderList = el("ol", { style: "padding-left:20px;margin:8px 0" });
  orderRoot.append(
    el("p", { class: "muted", text: "Indeks target mengikuti urutan ini (mulai dari 0). Pakai urutan yang sama saat mengompilasi di alat MindAR." }),
    orderList,
    el("button", {
      class: "btn btn-ghost btn-sm",
      text: "Unduh semua gambar marker (berurutan)",
      onClick: async () => {
        const organs = (await db.listOrgans()).filter((o) => o.marker_image_url);
        if (!organs.length) return toast("Belum ada marker.", "error");
        for (let i = 0; i < organs.length; i++) {
          await downloadUrlAs(organs[i].marker_image_url, `${i}_${organs[i].name}.png`);
          await new Promise((r) => setTimeout(r, 400));
        }
        toast("Mengunduh gambar marker...", "success");
      },
    })
  );

  async function refreshOrder() {
    const organs = (await db.listOrgans()).filter((o) => o.marker_image_url);
    orderList.innerHTML = "";
    if (!organs.length) {
      orderList.appendChild(el("li", { class: "muted", text: "Belum ada marker." }));
    } else {
      organs.forEach((o, i) =>
        orderList.appendChild(el("li", { text: `${o.name}  (indeks ${i})` }))
      );
    }
    return organs;
  }
  refreshOrder();

  // ---------- Cara 1: kompilasi otomatis ----------
  const bar = el("div", { style: "height:12px;border-radius:999px;background:var(--c-ink-soft);overflow:hidden;margin-top:10px" }, [
    el("span", { style: "display:block;height:100%;width:0%;background:var(--grad-accent);transition:width 0.2s ease" }),
  ]);
  const fill = bar.querySelector("span");
  const autoStatus = el("p", { class: "muted mt-8", text: "Siap." });
  const autoBtn = el("button", {
    class: "btn btn-primary",
    text: "Kompilasi otomatis & unggah",
    onClick: async () => {
      autoBtn.disabled = true;
      fill.style.width = "0%";
      try {
        const Compiler = await loadCompiler();
        const organs = (await db.listOrgans()).filter((o) => o.marker_image_url);
        if (!organs.length) throw new Error("Belum ada marker untuk dikompilasi.");
        autoStatus.textContent = "Memuat gambar marker...";
        const images = [];
        for (const o of organs) images.push(await loadImage(o.marker_image_url));
        autoStatus.textContent = "Mengompilasi...";
        const compiler = new Compiler();
        await compiler.compileImageTargets(images, (p) => {
          fill.style.width = `${Math.max(2, Math.round(p))}%`;
        });
        const buffer = await compiler.exportData();
        autoStatus.textContent = "Mengunggah targets.mind...";
        await uploadMind(new Blob([buffer]));
        await assignIndices(organs);
        fill.style.width = "100%";
        autoStatus.textContent = "Selesai. Mode AR Marker siap.";
        toast("Kompilasi otomatis selesai", "success");
        refreshOrder();
      } catch (e) {
        autoStatus.textContent = "Gagal: " + e.message;
        toast(e.message, "error");
      } finally {
        autoBtn.disabled = false;
      }
    },
  });
  const autoCard = el("div", { class: "card mt-24" }, [
    el("h3", { text: "Cara 1: Kompilasi Otomatis" }),
    el("p", { class: "muted", text: "Praktis. Bila gagal di perangkat Anda, gunakan Cara 2." }),
    bar,
    autoStatus,
    el("div", { class: "mt-16" }, [autoBtn]),
  ]);

  // ---------- Cara 2: unggah targets.mind manual ----------
  const fileInput = el("input", { type: "file", accept: ".mind" });
  const manualStatus = el("p", { class: "muted mt-8", text: "Siap." });
  const manualBtn = el("button", {
    class: "btn btn-primary",
    text: "Unggah targets.mind & tetapkan indeks",
    onClick: async () => {
      if (!fileInput.files.length) return toast("Pilih file targets.mind", "error");
      manualBtn.disabled = true;
      try {
        manualStatus.textContent = "Mengunggah...";
        await uploadMind(fileInput.files[0]);
        const organs = (await db.listOrgans()).filter((o) => o.marker_image_url);
        await assignIndices(organs);
        manualStatus.textContent = "Selesai. Mode AR Marker siap.";
        toast("targets.mind diunggah", "success");
        refreshOrder();
      } catch (e) {
        manualStatus.textContent = "Gagal: " + e.message;
        toast(e.message, "error");
      } finally {
        manualBtn.disabled = false;
      }
    },
  });
  const manualCard = el("div", { class: "card mt-24" }, [
    el("h3", { text: "Cara 2: Unggah targets.mind (Manual, Andal)" }),
    el("p", { class: "muted", text: "1. Tekan \u201CUnduh semua gambar marker\u201D di atas. 2. Buka alat resmi MindAR Image Compiler, unggah semua gambar dengan URUTAN yang sama, lalu unduh targets.mind. 3. Unggah file itu di sini." }),
    el("a", {
      class: "btn btn-ghost btn-sm",
      href: "https://hiukim.github.io/mind-ar-js-doc/tools/compile",
      target: "_blank",
      text: "Buka MindAR Image Compiler",
    }),
    el("div", { class: "field mt-16" }, [el("label", { text: "File targets.mind" }), fileInput]),
    manualBtn,
    manualStatus,
  ]);

  root.append(orderRoot, autoCard, manualCard);
}
