/*
  Klien Supabase tunggal yang dipakai seluruh modul.
  Mengimpor pustaka supabase-js langsung dari CDN (ESM).

  Penyimpanan sesi bersifat hibrida dan mengikuti pilihan "Ingat saya":
  - Ingat saya AKTIF  -> sesi disimpan di localStorage (tetap login walau
    browser ditutup).
  - Ingat saya NONAKTIF -> sesi disimpan di sessionStorage (hilang saat
    tab/jendela ditutup).
*/
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

if (
  !SUPABASE_URL ||
  SUPABASE_URL.startsWith("ISI_") ||
  !SUPABASE_ANON_KEY ||
  SUPABASE_ANON_KEY.startsWith("ISI_")
) {
  console.warn(
    "Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di assets/js/config/config.js"
  );
}

const REMEMBER_KEY = "organ_remember";

// Defaultnya mengingat (true) bila belum pernah dipilih.
function rememberOn() {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== "0";
  } catch (e) {
    return true;
  }
}

// Adapter penyimpanan hibrida: localStorage atau sessionStorage.
const hybridStorage = {
  getItem(key) {
    try {
      const ls = localStorage.getItem(key);
      if (ls !== null) return ls;
      return sessionStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem(key, value) {
    try {
      if (rememberOn()) {
        localStorage.setItem(key, value);
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
        localStorage.removeItem(key);
      }
    } catch (e) {}
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (e) {}
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: hybridStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
