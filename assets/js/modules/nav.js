/*
  Modul navigasi.
  Menampilkan bilah atas ringkas dengan tombol toggle (ikon panel), dan
  sebuah drawer (panel geser dari kiri) berisi tautan sesuai peran,
  identitas pengguna, dan tombol keluar. Mirip panel pop-up.
*/
import { el } from "./ui.js";
import { signOut, isEditor } from "./auth.js";

const LINKS = [
  { href: "index.html", label: "Beranda" },
  { href: "ar-markerless.html", label: "AR Markerless" },
  { href: "scan.html", label: "Scan QR" },
  { href: "ar-marker.html", label: "AR Marker" },
  { href: "demo.html", label: "Demo 3D" },
  { href: "guru.html", label: "Ruang Guru", editorOnly: true },
  { href: "admin.html", label: "Ruang Admin", adminOnly: true },
];

// Ikon panel (kotak dengan garis pemisah), mirip tombol sidebar.
function panelIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "22");
  svg.setAttribute("height", "22");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.innerHTML =
    '<rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="9" y1="4" x2="9" y2="20"></line>';
  return svg;
}

function brandNode() {
  return el("a", { class: "brand", href: "index.html" }, [
    el("span", { class: "brand-mark" }),
    el("span", { text: "Organ AR" }),
  ]);
}

export function renderNav(profile, activeHref) {
  const host = document.getElementById("navbar");
  if (!host) return;

  // Bersihkan drawer lama bila ada (mis. render ulang).
  document.querySelectorAll(".drawer, .drawer-backdrop").forEach((n) => n.remove());

  // --- Bilah atas ---
  const toggle = el("button", {
    class: "nav-toggle",
    "aria-label": "Buka menu",
    title: "Menu",
  });
  toggle.appendChild(panelIcon());

  host.className = "topbar";
  host.innerHTML = "";
  host.append(toggle, brandNode());

  // --- Drawer ---
  const linksWrap = el("nav", { class: "drawer-links" });
  LINKS.forEach((link) => {
    if (link.editorOnly && !isEditor(profile)) return;
    if (link.adminOnly && profile.role !== "admin") return;
    linksWrap.appendChild(
      el("a", {
        href: link.href,
        text: link.label,
        class: link.href === activeHref ? "active" : "",
      })
    );
  });

  const name = (profile && profile.full_name) || "Pengguna";
  const roleLabel = profile ? profile.role : "";

  const drawer = el("aside", { class: "drawer" }, [
    el("div", { class: "drawer-head" }, [
      brandNode(),
      el("button", { class: "nav-toggle", "aria-label": "Tutup menu", title: "Tutup" }, [panelIcon()]),
    ]),
    linksWrap,
    el("div", { class: "drawer-user" }, [
      el("span", { class: "chip sky", text: `${name} (${roleLabel})` }),
      el("button", {
        class: "btn btn-ghost btn-block",
        text: "Keluar",
        onClick: async () => {
          await signOut();
          window.location.replace("login.html");
        },
      }),
    ]),
  ]);

  const backdrop = el("div", { class: "drawer-backdrop" });
  document.body.append(backdrop, drawer);

  const open = () => {
    drawer.classList.add("open");
    backdrop.classList.add("open");
  };
  const close = () => {
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
  };
  toggle.addEventListener("click", () =>
    drawer.classList.contains("open") ? close() : open()
  );
  backdrop.addEventListener("click", close);
  // Tombol tutup di dalam drawer.
  drawer.querySelector(".drawer-head .nav-toggle").addEventListener("click", close);
  // Tutup saat memilih tautan.
  linksWrap.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
  // Tutup dengan tombol Escape.
  document.addEventListener("keydown", (e) => e.key === "Escape" && close());
}
