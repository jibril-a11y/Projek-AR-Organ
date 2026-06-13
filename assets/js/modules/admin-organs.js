/*
  Modul Admin Organ (untuk peran guru/admin).
  Mengelola organ, deskripsi, fungsi, model 3D, dan QR marker otomatis.
*/
import * as db from "./db.js";
import * as storage from "./storage.js";
import { organQrPayload, makeMarkerImageBlob, makePlainQrDataUrl } from "./qr.js";
import { el, toast, confirmDialog, openModal } from "./ui.js";

let listRoot = null;

// Buat gambar marker MindAR (kaya fitur, tanpa QR) lalu simpan URL-nya.
// QR untuk mode Scan dibuat terpisah saat diunduh.
async function generateMarkerFor(organ) {
  const blob = await makeMarkerImageBlob(organ.name);
  const url = await storage.uploadMarkerImage(blob, "marker");
  return db.updateOrgan(organ.id, {
    marker_image_url: url,
    qr_data: organQrPayload(organ.id),
  });
}

function organCard(organ) {
  const card = el("div", { class: "card" }, [
    el("div", { class: "flex center gap-16" }, [
      el("div", {
        style: `width:42px;height:42px;border-radius:12px;flex-shrink:0;background:${
          organ.color || "#32a3cd"
        }`,
      }),
      el("h3", { text: organ.name, style: "margin:0;flex:1" }),
    ]),
    el("div", { class: "flex gap-8 mt-8", style: "flex-wrap:wrap" }, [
      el("span", { class: "chip sky", text: `${(organ.descriptions || []).length} deskripsi` }),
      el("span", { class: "chip mint", text: `${(organ.functions || []).length} fungsi` }),
      el("span", { class: "chip", text: organ.model_url ? "Ada model" : "Tanpa model" }),
      el("span", { class: "chip", text: organ.marker_image_url ? "Marker siap" : "Tanpa marker" }),
    ]),
    el("div", { class: "flex gap-8 mt-16" }, [
      el("button", { class: "btn btn-primary btn-sm", text: "Kelola", onClick: () => openEditor(organ.id) }),
      el("button", { class: "btn btn-danger btn-sm", text: "Hapus", onClick: () => removeOrgan(organ) }),
    ]),
  ]);
  return card;
}

async function removeOrgan(organ) {
  if (!(await confirmDialog(`Hapus organ "${organ.name}"?`))) return;
  try {
    await db.deleteOrgan(organ.id);
    toast("Organ dihapus", "success");
    render();
  } catch (e) {
    toast(e.message, "error");
  }
}

async function openEditor(id) {
  const organ = await db.getOrgan(id);
  const content = el("div");

  // --- Identitas ---
  const nameInput = el("input", { type: "text", value: organ.name });
  const colorInput = el("input", { type: "text", value: organ.color || "#32a3cd" });
  const scaleInput = el("input", { type: "text", value: organ.scale || "0.5 0.5 0.5" });
  content.append(
    el("div", { class: "field" }, [el("label", { text: "Nama organ" }), nameInput]),
    el("div", { class: "row" }, [
      el("div", { class: "field" }, [el("label", { text: "Warna fallback" }), colorInput]),
      el("div", { class: "field" }, [el("label", { text: "Skala (x y z)" }), scaleInput]),
    ]),
    el("button", {
      class: "btn btn-primary btn-sm",
      text: "Simpan",
      onClick: async () => {
        try {
          await db.updateOrgan(id, {
            name: nameInput.value.trim(),
            color: colorInput.value.trim(),
            scale: scaleInput.value.trim(),
          });
          toast("Tersimpan", "success");
          render();
        } catch (e) {
          toast(e.message, "error");
        }
      },
    })
  );

  // --- List deskripsi / fungsi ---
  function listSection(title, field, variant) {
    const section = el("div", { class: "editor-section" }, [el("h4", { text: title })]);
    const list = el("ul", { class: "item-list" });
    function refresh(items) {
      list.innerHTML = "";
      if (!items.length) list.appendChild(el("li", { class: "muted", text: "Belum ada." }));
      items.forEach((txt, idx) =>
        list.appendChild(
          el("li", { class: `item-row ${variant}` }, [
            el("span", { text: txt }),
            el("button", {
              class: "icon-btn",
              text: "Hapus",
              onClick: async () => {
                const u = await db.deleteListItem(id, field, idx);
                refresh(u[field]);
                render();
              },
            }),
          ])
        )
      );
    }
    const input = el("input", { type: "text", placeholder: `Tambah ${title.toLowerCase()}...` });
    section.append(
      list,
      el("div", { class: "inline-form" }, [
        input,
        el("button", {
          class: "btn btn-accent btn-sm",
          text: "Tambah",
          onClick: async () => {
            const v = input.value.trim();
            if (!v) return;
            const u = await db.addListItem(id, field, v);
            input.value = "";
            refresh(u[field]);
            render();
          },
        }),
      ])
    );
    refresh(organ[field] || []);
    return section;
  }
  content.append(listSection("Deskripsi", "descriptions", ""), listSection("Fungsi", "functions", "mint"));

  // --- Model 3D ---
  const modelSection = el("div", { class: "editor-section" }, [el("h4", { text: "Model 3D" })]);
  const fileInput = el("input", { type: "file", accept: ".glb,.gltf" });
  const urlInput = el("input", { type: "url", placeholder: "https://contoh.com/model.glb" });
  modelSection.append(
    el("p", { class: "muted", text: organ.model_url ? "Model aktif." : "Belum ada model." }),
    el("div", { class: "field" }, [
      el("label", { text: "Unggah model (.glb/.gltf)" }),
      fileInput,
      el("button", {
        class: "btn btn-primary btn-sm mt-8",
        text: "Unggah",
        onClick: async () => {
          if (!fileInput.files.length) return toast("Pilih file", "error");
          try {
            const url = await storage.uploadModel(fileInput.files[0]);
            await db.updateOrgan(id, { model_url: url, model_source: "upload" });
            toast("Model diunggah", "success");
            modal.close();
            render();
          } catch (e) {
            toast(e.message, "error");
          }
        },
      }),
    ]),
    el("div", { class: "field" }, [
      el("label", { text: "Atau URL model luar" }),
      urlInput,
      el("button", {
        class: "btn btn-accent btn-sm mt-8",
        text: "Gunakan URL",
        onClick: async () => {
          const v = urlInput.value.trim();
          if (!v) return toast("Isi URL", "error");
          await db.updateOrgan(id, { model_url: v, model_source: "external" });
          toast("Tersimpan", "success");
          modal.close();
          render();
        },
      }),
    ])
  );
  if (organ.model_url) {
    modelSection.appendChild(
      el("button", {
        class: "btn btn-danger btn-sm",
        text: "Hapus model",
        onClick: async () => {
          await db.updateOrgan(id, { model_url: "", model_source: "" });
          toast("Model dihapus", "success");
          modal.close();
          render();
        },
      })
    );
  }
  content.appendChild(modelSection);

  // --- Marker AR (MindAR) & QR (Scan) ---
  const qrSection = el("div", { class: "editor-section" }, [el("h4", { text: "Marker AR & QR" })]);
  if (organ.marker_image_url) {
    qrSection.append(
      el("p", { class: "muted", text: "Gambar marker untuk mode AR Marker (MindAR):" }),
      el("img", { class: "marker-thumb", src: organ.marker_image_url, style: "max-width:240px" }),
      el("div", { class: "flex gap-8 mt-8" }, [
        el("a", { class: "btn btn-ghost btn-sm", href: organ.marker_image_url, download: "", target: "_blank", text: "Unduh Marker AR" }),
        el("button", {
          class: "btn btn-ghost btn-sm",
          text: "Unduh QR (Scan)",
          onClick: async () => {
            try {
              const dataUrl = await makePlainQrDataUrl(organQrPayload(organ.id));
              const a = el("a", { href: dataUrl, download: `qr-${organ.name}.png` });
              document.body.appendChild(a);
              a.click();
              a.remove();
            } catch (e) {
              toast(e.message, "error");
            }
          },
        }),
      ])
    );
  } else {
    qrSection.appendChild(el("p", { class: "muted", text: "Marker belum dibuat." }));
  }
  qrSection.appendChild(
    el("button", {
      class: "btn btn-accent btn-sm mt-8",
      text: "Buat ulang marker",
      onClick: async () => {
        try {
          await generateMarkerFor(organ);
          toast("Marker dibuat. Jangan lupa kompilasi/unggah ulang targets.mind.", "success");
          modal.close();
          render();
        } catch (e) {
          toast(e.message, "error");
        }
      },
    })
  );
  content.appendChild(qrSection);

  const modal = openModal(`Kelola: ${organ.name}`, content);
}

async function render() {
  const organs = await db.listOrgans();
  listRoot.innerHTML = "";
  if (!organs.length) {
    listRoot.appendChild(el("div", { class: "empty" }, [el("h3", { text: "Belum ada organ" })]));
    return;
  }
  const grid = el("div", { class: "card-grid" });
  organs.forEach((o) => grid.appendChild(organCard(o)));
  listRoot.appendChild(grid);
}

export async function initAdminOrgans(formRoot, listContainer) {
  listRoot = listContainer;
  const nameInput = el("input", { type: "text", placeholder: "Nama organ, mis. Jantung" });
  formRoot.appendChild(
    el("div", { class: "card" }, [
      el("h3", { text: "Tambah Organ" }),
      el("p", { class: "muted", text: "Marker AR otomatis dibuat untuk setiap organ baru." }),
      el("div", { class: "inline-form" }, [
        nameInput,
        el("button", {
          class: "btn btn-primary",
          text: "Tambah",
          onClick: async () => {
            const v = nameInput.value.trim();
            if (!v) return toast("Isi nama organ", "error");
            try {
              const organ = await db.createOrgan(v);
              await generateMarkerFor(organ); // marker MindAR otomatis
              nameInput.value = "";
              toast("Organ + marker dibuat", "success");
              render();
            } catch (e) {
              toast(e.message, "error");
            }
          },
        }),
      ]),
    ])
  );
  await render();
}
