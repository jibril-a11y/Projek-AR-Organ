/*
  Klien Supabase tunggal yang dipakai seluruh modul.
  Mengimpor pustaka supabase-js langsung dari CDN (ESM).
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

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
