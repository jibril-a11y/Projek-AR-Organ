/*
  Modul tema gelap/terang.
  Menyimpan pilihan di localStorage dan menerapkannya pada elemen <html>.
*/
import { el } from "./ui.js";

const KEY = "organ_theme";

const ICONS = {
  sun:
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>',
};

function icon(name, size = 18) {
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

export function getTheme() {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch (e) {
    return "light";
  }
}

export function applyTheme(theme) {
  document.documentElement.setAttribute(
    "data-theme",
    theme === "dark" ? "dark" : "light"
  );
}

export function setTheme(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch (e) {}
  applyTheme(theme);
}

export function toggleTheme() {
  const next = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

// Terapkan tema tersimpan saat modul dimuat.
applyTheme(getTheme());

// Membuat tombol ganti tema yang memperbarui ikon & labelnya sendiri.
export function themeToggleButton(showLabel = true) {
  const btn = el("button", { class: "btn btn-ghost btn-sm", type: "button", "aria-label": "Ganti tema" });
  const refresh = () => {
    const dark = getTheme() === "dark";
    btn.innerHTML = "";
    btn.append(icon(dark ? "sun" : "moon"));
    if (showLabel) btn.append(el("span", { text: dark ? "Mode Terang" : "Mode Gelap" }));
  };
  refresh();
  btn.addEventListener("click", () => {
    toggleTheme();
    refresh();
  });
  return btn;
}

// Pasang tombol tema mengambang (mis. untuk halaman login/register).
export function mountFloatingThemeToggle() {
  if (document.querySelector(".auth-theme-toggle")) return; // hindari duplikat
  const wrap = el("div", { class: "auth-theme-toggle" }, [themeToggleButton(true)]);
  document.body.appendChild(wrap);
  return wrap;
}
