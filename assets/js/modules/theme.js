/*
  Modul tema gelap/terang.
  Menyimpan pilihan di localStorage dan menerapkannya pada elemen <html>.
*/
const KEY = "organ_theme";

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
