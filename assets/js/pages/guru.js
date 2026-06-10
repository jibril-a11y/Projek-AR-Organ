/*
  Halaman Ruang Guru (peran guru & admin).
  Tab: Organ dan Kompilasi Marker. Tidak mengelola pengguna.
*/
import { requireAuth } from "../modules/auth.js";
import { renderNav } from "../modules/nav.js";
import { initAdminOrgans } from "../modules/admin-organs.js";
import { initMarkerCompiler } from "../modules/marker-compiler.js";
import { toast } from "../modules/ui.js";

(async () => {
  // Guru & admin boleh masuk.
  const profile = await requireAuth(["guru", "admin"]);
  if (!profile) return;
  renderNav(profile, "guru.html");

  const tabs = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");
  tabs.forEach((btn) => {
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
  } catch (e) {
    toast(e.message, "error");
  }
})();
