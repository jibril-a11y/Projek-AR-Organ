/*
  Modul Admin Pengguna (khusus admin).
  - Mengubah peran pengguna.
  - Menghapus pengguna satu per satu atau secara batch (dengan konfirmasi).
  Akun admin yang sedang login tidak bisa dipilih/dihapus (lindungi diri sendiri).
*/
import * as db from "./db.js";
import { el, toast, confirmDialog } from "./ui.js";
import { ROLES } from "../config/config.js";

export async function initAdminUsers(root, currentUserId) {
  const selected = new Set();

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

    // Hapus dari pilihan id yang sudah tidak ada.
    [...selected].forEach((id) => {
      if (!profiles.find((p) => p.id === id)) selected.delete(id);
    });

    // --- Bilah aksi batch ---
    const batchBtn = el("button", {
      class: "btn btn-danger",
      text: "Hapus terpilih",
      onClick: () => batchDelete(profiles),
    });
    const updateBatchBtn = () => {
      batchBtn.textContent = `Hapus terpilih (${selected.size})`;
      batchBtn.disabled = selected.size === 0;
    };

    // Pilih semua (kecuali diri sendiri).
    const selectableIds = profiles.filter((p) => p.id !== currentUserId).map((p) => p.id);
    const selectAll = el("input", { type: "checkbox" });
    selectAll.checked = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
    selectAll.addEventListener("change", () => {
      if (selectAll.checked) selectableIds.forEach((id) => selected.add(id));
      else selectableIds.forEach((id) => selected.delete(id));
      render();
    });

    const bar = el("div", { class: "card flex between center", style: "flex-wrap:wrap;gap:12px" }, [
      el("label", { class: "flex center gap-8", style: "margin:0;font-weight:700" }, [
        selectAll,
        el("span", { text: "Pilih semua" }),
      ]),
      batchBtn,
    ]);
    root.appendChild(bar);
    updateBatchBtn();

    // --- Daftar kartu pengguna ---
    const grid = el("div", { class: "card-grid mt-24" });
    profiles.forEach((p) => {
      const isSelf = p.id === currentUserId;

      const roleSelect = el(
        "select",
        {},
        ROLES.map((r) =>
          el("option", { value: r, text: r, ...(r === p.role ? { selected: "" } : {}) })
        )
      );

      const check = el("input", { type: "checkbox" });
      check.checked = selected.has(p.id);
      check.disabled = isSelf;
      check.addEventListener("change", () => {
        if (check.checked) selected.add(p.id);
        else selected.delete(p.id);
        updateBatchBtn();
        // Sinkronkan "pilih semua".
        selectAll.checked = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
      });

      const head = el("div", { class: "flex center gap-8" }, [
        isSelf ? el("span", { class: "chip mint", text: "Anda" }) : check,
        el("h3", { text: p.full_name || "(tanpa nama)", style: "margin:0;flex:1" }),
      ]);

      const actions = el("div", { class: "flex gap-8 mt-16" }, [
        el("button", {
          class: "btn btn-primary btn-sm",
          text: "Simpan peran",
          onClick: async () => {
            try {
              await db.setProfileRole(p.id, roleSelect.value);
              toast("Peran diperbarui", "success");
            } catch (e) {
              toast(e.message, "error");
            }
          },
        }),
      ]);
      if (!isSelf) {
        actions.appendChild(
          el("button", {
            class: "btn btn-danger btn-sm",
            text: "Hapus",
            onClick: () => singleDelete(p),
          })
        );
      }

      grid.appendChild(
        el("div", { class: "card" }, [
          head,
          el("p", { class: "muted", style: "font-size:0.78rem;word-break:break-all;margin:8px 0", text: p.id }),
          el("div", { class: "field" }, [el("label", { text: "Peran" }), roleSelect]),
          actions,
        ])
      );
    });
    root.appendChild(grid);
  }

  async function singleDelete(p) {
    const ok = await confirmDialog(
      `Hapus pengguna "${p.full_name || p.id}"? Tindakan ini permanen dan tidak bisa dibatalkan.`
    );
    if (!ok) return;
    try {
      await db.deleteUser(p.id);
      selected.delete(p.id);
      toast("Pengguna dihapus", "success");
      render();
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function batchDelete(profiles) {
    const ids = [...selected].filter((id) => id !== currentUserId);
    if (!ids.length) return;
    const ok = await confirmDialog(
      `Hapus ${ids.length} pengguna terpilih? Tindakan ini permanen dan tidak bisa dibatalkan.`
    );
    if (!ok) return;

    let success = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await db.deleteUser(id);
        selected.delete(id);
        success++;
      } catch (e) {
        failed++;
      }
    }
    if (success) toast(`${success} pengguna dihapus`, "success");
    if (failed) toast(`${failed} pengguna gagal dihapus`, "error");
    render();
  }

  await render();
}
