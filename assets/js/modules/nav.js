/*
  Modul navigasi.
  Bilah atas ringkas + tombol hamburger yang membuka drawer (panel geser).
  Drawer berisi: kotak pencarian menu, judul seksi, dan daftar menu ber-ikon
  sesuai peran, ditambah identitas pengguna dan tombol keluar.
  Di layar lebar, membuka drawer menggeser konten (konten tetap bisa dipakai).
*/
import { el } from "./ui.js";
import { signOut, isEditor } from "./auth.js";

const LINKS = [
  { href: "index.html", label: "Beranda", icon: "grid" },
  { href: "ar-markerless.html", label: "AR Markerless", icon: "cube" },
  { href: "scan.html", label: "Scan QR", icon: "qr" },
  { href: "ar-marker.html", label: "AR Marker", icon: "camera" },
  { href: "demo.html", label: "Demo 3D", icon: "layers" },
  { href: "guru.html", label: "Ruang Guru", icon: "edit", editorOnly: true },
  { href: "admin.html", label: "Ruang Admin", icon: "users", adminOnly: true },
];

// Kumpulan ikon (gaya garis).
const ICONS = {
  grid:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  cube:
    '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
  qr:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3"/><path d="M21 17v4"/><path d="M17 21h1"/>',
  camera:
    '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/>',
  layers:
    '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  edit:
    '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  hamburger:
    '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  search:
    '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
};

function svgIcon(name, size = 20) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.innerHTML = ICONS[name] || "";
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

  document.querySelectorAll(".drawer, .drawer-backdrop").forEach((n) => n.remove());

  // --- Bilah atas: hamburger + brand ---
  const toggle = el("button", { class: "nav-toggle", "aria-label": "Menu", title: "Menu" });
  toggle.appendChild(svgIcon("hamburger", 22));

  host.className = "topbar";
  host.innerHTML = "";
  host.append(toggle, brandNode());

  // --- Daftar menu (sesuai peran) ---
  const visible = LINKS.filter((link) => {
    if (link.editorOnly && !isEditor(profile)) return false;
    if (link.adminOnly && profile.role !== "admin") return false;
    return true;
  });

  const linksWrap = el("nav", { class: "drawer-links" });
  const anchors = visible.map((link) => {
    const a = el("a", {
      href: link.href,
      class: link.href === activeHref ? "active" : "",
    });
    a.append(svgIcon(link.icon), el("span", { text: link.label }));
    a.dataset.label = link.label.toLowerCase();
    linksWrap.appendChild(a);
    return a;
  });
  const emptyMsg = el("div", { class: "drawer-empty hidden", text: "Menu tidak ditemukan." });
  linksWrap.appendChild(emptyMsg);

  // --- Pencarian menu ---
  const searchInput = el("input", { type: "text", placeholder: "Cari menu atau layanan..." });
  const searchBox = el("div", { class: "drawer-search" }, [
    svgIcon("search", 18),
    searchInput,
  ]);
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    let shown = 0;
    anchors.forEach((a) => {
      const match = a.dataset.label.includes(q);
      a.classList.toggle("hidden", !match);
      if (match) shown++;
    });
    emptyMsg.classList.toggle("hidden", shown > 0);
  });

  const name = (profile && profile.full_name) || "Pengguna";
  const roleLabel = profile ? profile.role : "";

  // --- Drawer ---
  const drawer = el("aside", { class: "drawer" }, [
    el("div", { class: "drawer-head" }, [
      brandNode(),
      el("button", { class: "nav-toggle", "aria-label": "Tutup", title: "Tutup" }, [svgIcon("hamburger", 22)]),
    ]),
    searchBox,
    el("div", { class: "drawer-section", text: "Menu" }),
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
    document.body.classList.add("drawer-open");
    setTimeout(() => window.dispatchEvent(new Event("resize")), 260);
  };
  const close = () => {
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
    document.body.classList.remove("drawer-open");
    setTimeout(() => window.dispatchEvent(new Event("resize")), 260);
  };
  toggle.addEventListener("click", () =>
    drawer.classList.contains("open") ? close() : open()
  );
  backdrop.addEventListener("click", close);
  drawer.querySelector(".drawer-head .nav-toggle").addEventListener("click", close);
  // Di layar kecil, menutup setelah memilih menu agar konten terlihat.
  anchors.forEach((a) =>
    a.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 899px)").matches) close();
    })
  );
  document.addEventListener("keydown", (e) => e.key === "Escape" && close());
}
