/*
  Modul Kompilasi Marker (untuk peran guru/admin).

  Mengompilasi gambar QR seluruh organ menjadi satu file targets.mind
  (di browser, memakai MindAR), mengunggahnya ke Supabase Storage, dan
  menetapkan target_index tiap organ sesuai urutan kompilasi.
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

export function initMarkerCompiler(root) {
  root.innerHTML = "";
  const bar = el("div", { style: "height:12px;border-radius:999px;background:var(--c-ink-soft);overflow:hidden;margin-top:10px" }, [
    el("span", { style: "display:block;height:100%;width:0%;background:var(--grad-accent);transition:width 0.2s ease" }),
  ]);
  const fill = bar.querySelector("span");
  const statusText = el("p", { class: "muted mt-8", text: "Siap." });

  const btn = el("button", {
    class: "btn btn-primary",
    text: "Kompilasi semua QR menjadi marker AR",
    onClick: async () => {
      btn.disabled = true;
      fill.style.width = "0%";
      try {
        const Compiler = await loadCompiler();
        const organs = (await db.listOrgans()).filter((o) => o.marker_image_url);
        if (!organs.length) throw new Error("Belum ada organ ber-QR untuk dikompilasi.");

        statusText.textContent = "Memuat gambar QR...";
        const images = [];
        for (const o of organs) images.push(await loadImage(o.marker_image_url));

        statusText.textContent = "Mengompilasi...";
        const compiler = new Compiler();
        await compiler.compileImageTargets(images, (p) => {
          fill.style.width = `${Math.max(2, Math.round(p))}%`;
        });
        const buffer = await compiler.exportData();

        statusText.textContent = "Mengunggah targets.mind...";
        await uploadMind(new Blob([buffer]));

        statusText.textContent = "Menetapkan indeks...";
        for (let i = 0; i < organs.length; i++) {
          await db.updateOrgan(organs[i].id, { target_index: i });
        }

        fill.style.width = "100%";
        statusText.textContent = "Selesai. Mode AR Marker siap dipakai.";
        toast("Kompilasi marker selesai", "success");
      } catch (e) {
        statusText.textContent = "Gagal: " + e.message;
        toast(e.message, "error");
      } finally {
        btn.disabled = false;
      }
    },
  });

  root.append(
    el("div", { class: "card" }, [
      el("h3", { text: "Kompilasi Marker (Mode AR Marker)" }),
      el("p", {
        class: "muted",
        text: "Opsional. Hanya diperlukan jika ingin memakai mode AR Marker (MindAR). Untuk Scan QR dan AR Markerless, langkah ini tidak diperlukan.",
      }),
      bar,
      statusText,
      el("div", { class: "mt-16" }, [btn]),
    ])
  );
}
