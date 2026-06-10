/*
  Halaman Ruang Admin (khusus peran admin).
  Hanya untuk mengelola pengguna dan peran.
*/
import { requireAuth } from "../modules/auth.js";
import { renderNav } from "../modules/nav.js";
import { initAdminUsers } from "../modules/admin-users.js";
import { toast } from "../modules/ui.js";

(async () => {
  // Hanya admin yang boleh masuk. Selain admin diarahkan ke Ruang Guru.
  const profile = await requireAuth(["admin"], "guru.html");
  if (!profile) return;
  renderNav(profile, "admin.html");

  try {
    await initAdminUsers(document.getElementById("users-root"));
  } catch (e) {
    toast(e.message, "error");
  }
})();
