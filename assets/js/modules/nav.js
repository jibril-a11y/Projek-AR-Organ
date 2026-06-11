/*
  Modul navigasi: bilah atas + sidebar.

  Desktop:
    - Default tampil sebagai rail sempit (hanya ikon).
    - Melebar saat kursor diarahkan (hover) sebagai overlay.
    - Terkunci melebar dan mendorong konten saat tombol hamburger diklik.
      Status terkunci diingat antar-halaman.
  HP:
    - Sidebar tersembunyi; hamburger membukanya sebagai drawer penuh.

  Menu dikelompokkan per seksi, tiap menu ber-ikon, dengan pencarian menu.
*/
import { el } from "./ui.js";
import { signOut, isEditor } from "./auth.js";

const GROUPS = [
  {
    title: "Menu",
    items: [
      { href: "index.html", label: "Beranda", icon: "grid" },
      { href: "ar-markerless.html", label: "AR Markerless", icon: "cube" },
      { href: "scan.html", label: "Scan QR", icon: "qr" },
      { href: "ar-marker.html", label: "AR Marker", icon: "camera" },
      { href: "demo.html", label: "Demo 3D", icon: "layers" },
    ],
  },
  {
    title: "Pengajaran",
    items: [{ href: "guru.html", label: "Ruang Guru", icon: "edit", editorOnly: true }],
  },
  {
    title: "Administrasi",
    items: [{ href: "admin.html", label: "Ruang Admin", icon: "users", adminOnly: true }],
  },
];

const ICONS = {
  grid:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  cube: '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
  qr:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3"/><path d="M21 17v4"/><path d="M17 21h1"/>',
  camera:
    '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/>',
  layers: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  hamburger:
    '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
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

const PIN_KEY = "organ_nav_pinned";
const getPinned = () => {
  try {
    return localStorage.getItem(PIN_KEY) === "1";
  } catch (e) {
    return false;
  }
};
const setPinned = (v) => {
  try {
    localStorage.setItem(PIN_KEY, v ? "1" : "0");
  } catch (e) {}
};
const isMobile = () => window.matchMedia("(max-width: 899px)").matches;

export function renderNav(profile, activeHref) {
  const host = document.getElementById("navbar");
  if (!host) return;

  document.querySelectorAll(".sidebar, .drawer-backdrop").forEach((n) => n.remove());

  // --- Bilah atas ---
  const toggle = el("button", { class: "nav-toggle", "aria-label": "Menu", title: "Menu" });
  toggle.appendChild(svgIcon("hamburger", 22));
  host.className = "topbar";
  host.innerHTML = "";
  host.append(toggle, brandNode());

  // --- Pencarian ---
  const searchInput = el("input", { type: "text", placeholder: "Cari menu atau layanan..." });
  const searchBox = el("div", { class: "drawer-search" }, [svgIcon("search", 18), searchInput]);

  // --- Grup menu sesuai peran ---
  const groupsWrap = el("div", { class: "drawer-groups" });
  const allAnchors = [];
  const groupEls = [];
  GROUPS.forEach((g) => {
    const items = g.items.filter((it) => {
      if (it.editorOnly && !isEditor(profile)) return false;
      if (it.adminOnly && profile.role !== "admin") return false;
      return true;
    });
    if (!items.length) return;
    const header = el("div", { class: "drawer-section", text: g.title });
    const list = el("nav", { class: "drawer-links" });
    const anchors = items.map((it) => {
      const a = el("a", { href: it.href, class: it.href === activeHref ? "active" : "" });
      a.append(svgIcon(it.icon), el("span", { class: "nav-label", text: it.label }));
      a.dataset.label = it.label.toLowerCase();
      list.appendChild(a);
      allAnchors.push(a);
      return a;
    });
    groupsWrap.append(header, list);
    groupEls.push({ header, anchors });
  });
  const emptyMsg = el("div", { class: "drawer-empty hidden", text: "Menu tidak ditemukan." });
  groupsWrap.appendChild(emptyMsg);

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    let shown = 0;
    groupEls.forEach((grp) => {
      let g = 0;
      grp.anchors.forEach((a) => {
        const m = a.dataset.label.includes(q);
        a.classList.toggle("hidden", !m);
        if (m) {
          g++;
          shown++;
        }
      });
      grp.header.classList.toggle("hidden", g === 0);
    });
    emptyMsg.classList.toggle("hidden", shown > 0);
  });

  const name = (profile && profile.full_name) || "Pengguna";
  const roleLabel = profile ? profile.role : "";

  // --- Sidebar ---
  const closeBtn = el("button", { class: "nav-toggle", "aria-label": "Tutup", title: "Tutup" }, [
    svgIcon("hamburger", 22),
  ]);
  const sidebar = el("aside", { class: "sidebar" }, [
    el("div", { class: "sidebar-head" }, [brandNode(), closeBtn]),
    searchBox,
    groupsWrap,
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
  document.body.append(backdrop, sidebar);

  // Pulihkan status terkunci (hanya desktop).
  if (!isMobile() && getPinned()) document.body.classList.add("nav-pinned");

  const fireResize = () => setTimeout(() => window.dispatchEvent(new Event("resize")), 240);
  const openMobile = () => {
    document.body.classList.add("drawer-open");
    backdrop.classList.add("open");
  };
  const closeMobile = () => {
    document.body.classList.remove("drawer-open");
    backdrop.classList.remove("open");
  };

  toggle.addEventListener("click", () => {
    if (isMobile()) {
      document.body.classList.contains("drawer-open") ? closeMobile() : openMobile();
    } else {
      const pinned = document.body.classList.toggle("nav-pinned");
      setPinned(pinned);
      fireResize();
    }
  });
  closeBtn.addEventListener("click", () => {
    if (isMobile()) closeMobile();
    else {
      document.body.classList.remove("nav-pinned");
      setPinned(false);
      fireResize();
    }
  });
  backdrop.addEventListener("click", closeMobile);
  allAnchors.forEach((a) =>
    a.addEventListener("click", () => {
      if (isMobile()) closeMobile();
    })
  );
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeMobile());
}
