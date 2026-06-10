/*
  Halaman Admin (peran guru/admin).
  Tab: Organ, Kompilasi Marker, dan Pengguna (khusus admin).
*/
import { requireAuth } from "../modules/auth.js";
import { renderNav } from "../modules/nav.js";
import { initAdminOrgans } from "../modules/admin-organs.js";
import { initMarkerCompiler } from "../modules/marker-compiler.js";
import { initAdminUsers } from "../modules/admin-users.js";
import { toast } from "../modules/ui.js";

(async () => {
  // Hanya guru & admin yang boleh masuk.
  const profile = await requireAuth(["guru", "admin"]);
  if (!profile) return;
  renderNav(profile, "admin.html");

  const tabs = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");
  tabs.forEach((btn) => {
    // Sembunyikan tab Pengguna untuk non-admin.
    if (btn.dataset.target === "panel-users" && profile.role !== "admin") {
      btn.classList.add("hidden");
      return;
    }
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.target).classList.add("active");
    });
  });

  try {
    await initAdminOrgans(
      document.getElementById("organ-form"),
      document.getElementById("organ-list")
    );
    initMarkerCompiler(document.getElementById("compiler-root"));
    if (profile.role === "admin") {
      await initAdminUsers(document.getElementById("users-root"));
    }
  } catch (e) {
    toast(e.message, "error");
  }
})();
