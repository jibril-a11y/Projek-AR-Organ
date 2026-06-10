/*
  Modul Admin Pengguna (hanya untuk peran admin).
  Menampilkan daftar pengguna dan mengubah peran mereka.
*/
import * as db from "./db.js";
import { el, toast } from "./ui.js";
import { ROLES } from "../config/config.js";

export async function initAdminUsers(root) {
  async function render() {
    root.innerHTML = "";
    let profiles;
    try {
      profiles = await db.listProfiles();
    } catch (e) {
      root.appendChild(el("p", { class: "muted", text: "Gagal memuat pengguna: " + e.message }));
      return;
    }
    if (!profiles.length) {
      root.appendChild(el("div", { class: "empty" }, [el("h3", { text: "Belum ada pengguna" })]));
      return;
    }
    const grid = el("div", { class: "card-grid" });
    profiles.forEach((p) => {
      const select = el(
        "select",
        {},
        ROLES.map((r) =>
          el("option", { value: r, text: r, ...(r === p.role ? { selected: "" } : {}) })
        )
      );
      grid.appendChild(
        el("div", { class: "card" }, [
          el("h3", { text: p.full_name || "(tanpa nama)", style: "margin:0 0 4px" }),
          el("p", { class: "muted", style: "font-size:0.8rem;word-break:break-all", text: p.id }),
          el("div", { class: "field mt-8" }, [el("label", { text: "Peran" }), select]),
          el("button", {
            class: "btn btn-primary btn-sm",
            text: "Simpan peran",
            onClick: async () => {
              try {
                await db.setProfileRole(p.id, select.value);
                toast("Peran diperbarui", "success");
              } catch (e) {
                toast(e.message, "error");
              }
            },
          }),
        ])
      );
    });
    root.appendChild(grid);
  }
  await render();
}
