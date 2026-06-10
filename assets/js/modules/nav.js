/*
  Modul navigasi.
  Membangun navbar yang sama di semua halaman, menampilkan tautan sesuai
  peran pengguna, nama pengguna, dan tombol keluar.
*/
import { el } from "./ui.js";
import { signOut, isEditor } from "./auth.js";

const LINKS = [
  { href: "index.html", label: "Beranda" },
  { href: "ar-markerless.html", label: "AR Markerless" },
  { href: "scan.html", label: "Scan QR" },
  { href: "ar-marker.html", label: "AR Marker" },
  { href: "demo.html", label: "Demo 3D" },
  { href: "admin.html", label: "Admin", editorOnly: true },
];

export function renderNav(profile, activeHref) {
  const host = document.getElementById("navbar");
  if (!host) return;

  const links = el("div", { class: "nav-links" });
  LINKS.forEach((link) => {
    if (link.editorOnly && !isEditor(profile)) return;
    links.appendChild(
      el("a", {
        href: link.href,
        text: link.label,
        class: link.href === activeHref ? "active" : "",
      })
    );
  });

  const roleLabel = profile ? profile.role : "";
  const name = (profile && profile.full_name) || "Pengguna";

  host.innerHTML = "";
  host.className = "navbar";
  host.append(
    el("a", { class: "brand", href: "index.html" }, [
      el("span", { class: "brand-mark" }),
      el("span", { text: "Organ AR" }),
    ]),
    links,
    el("div", { class: "nav-user" }, [
      el("span", { class: "chip sky", text: `${name} (${roleLabel})` }),
      el("button", {
        class: "btn btn-ghost btn-sm",
        text: "Keluar",
        onClick: async () => {
          await signOut();
          window.location.replace("login.html");
        },
      }),
    ])
  );
}
