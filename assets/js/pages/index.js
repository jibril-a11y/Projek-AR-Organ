/*
  Halaman Beranda (dashboard). Menampilkan pintasan fitur sesuai peran.
*/
import { requireAuth, isEditor } from "../modules/auth.js";
import { renderNav } from "../modules/nav.js";
import { el } from "../modules/ui.js";

(async () => {
  const profile = await requireAuth();
  if (!profile) return;
  renderNav(profile, "index.html");

  const root = document.getElementById("page-root");
  const cards = [
    { href: "ar-markerless.html", title: "AR Markerless", desc: "Lihat organ 3D di atas kamera tanpa marker." },
    { href: "scan.html", title: "Scan QR", desc: "Pindai QR organ untuk menampilkannya langsung." },
    { href: "ar-marker.html", title: "AR Marker", desc: "Mode pelacakan gambar dengan MindAR." },
    { href: "demo.html", title: "Demo 3D", desc: "Jelajahi semua model organ." },
  ];
  if (isEditor(profile)) {
    cards.push({ href: "guru.html", title: "Ruang Guru", desc: "Kelola organ, deskripsi, fungsi, model, dan QR." });
  }
  if (profile.role === "admin") {
    cards.push({ href: "admin.html", title: "Ruang Admin", desc: "Kelola pengguna dan peran." });
  }

  const grid = el("div", { class: "card-grid mt-24" });
  cards.forEach((c) =>
    grid.appendChild(
      el("a", { href: c.href, class: "card", style: "color:inherit" }, [
        el("h3", { text: c.title, style: "color:var(--c-ink-deep)" }),
        el("p", { class: "muted", text: c.desc }),
      ])
    )
  );

  root.append(
    el("h1", { class: "page-title", text: `Halo, ${profile.full_name || "Pengguna"}` }),
    el("p", { class: "muted", text: `Anda masuk sebagai ${profile.role}.` }),
    grid
  );
})();
