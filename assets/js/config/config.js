/*
  Konfigurasi aplikasi.

  ISI DUA NILAI DI BAWAH dengan kredensial proyek Supabase Anda.
  Cara mendapatkan: dashboard Supabase > Project Settings > API.
  - Project URL  -> SUPABASE_URL
  - anon public  -> SUPABASE_ANON_KEY  (kunci 'anon', aman dipakai di frontend)
*/

export const SUPABASE_URL = "https://ytmfsxiyzpygydcahbmf.supabase.co";
export const SUPABASE_ANON_KEY =
  "sb_publishable_DUNEaxmOVp27XvLwJkhhHw_AoRiL_pA";

// Nama bucket penyimpanan (sesuai schema.sql).
export const BUCKET_MODELS = "models";
export const BUCKET_MARKERS = "markers";

// Daftar peran yang dikenal aplikasi.
export const ROLES = ["mahasiswa", "guru", "admin"];

// Peran yang boleh menyunting konten (editor).
export const EDITOR_ROLES = ["guru", "admin"];
