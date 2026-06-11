/*
  Halaman Demo 3D. Menampilkan semua organ dengan model-viewer.
*/
import { requireAuth } from "../modules/auth.js";
import { renderNav } from "../modules/nav.js";
import * as db from "../modules/db.js";
import { el, toast } from "../modules/ui.js";

(async () => {
  const profile = await requireAuth();
  if (!profile) return;
  renderNav(profile, "demo.html");

  const root = document.getElementById("page-root");
  root.append(
    el("h1", { class: "page-title", text: "Demo Model 3D" }),
    el("p", { class: "muted", text: "Geser untuk memutar, scroll untuk memperbesar." })
  );

  let organs;
  try {
    organs = await db.listOrgans();
  } catch (e) {
    return toast(e.message, "error");
  }
  if (!organs.length) {
    root.appendChild(el("div", { class: "empty" }, [el("h3", { text: "Belum ada organ" })]));
    return;
  }

  const grid = el("div", { class: "card-grid mt-24" });
  organs.forEach((organ) => {
    const card = el("div", { class: "card" }, [
      el("div", { class: "flex center gap-16" }, [
        el("div", { style: `width:36px;height:36px;border-radius:10px;background:${organ.color || "#32a3cd"}` }),
        el("h3", { text: organ.name, style: "margin:0" }),
      ]),
    ]);
    if (organ.model_url) {
      card.appendChild(
        el("model-viewer", {
          src: organ.model_url,
          "camera-controls": "",
          "auto-rotate": "",
          ar: "",
          "shadow-intensity": "1",
          style: "width:100%;height:300px;margin-top:14px;border-radius:14px;background:linear-gradient(180deg,#f2f9fd,#e7f1fb)",
        })
      );
    } else {
      card.appendChild(el("p", { class: "muted mt-16", text: "Model 3D belum ada." }));
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
    grid.appendChild(card);
  });
  root.appendChild(grid);
})();
