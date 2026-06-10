/*
  Konfigurasi aplikasi.

  ISI DUA NILAI DI BAWAH dengan kredensial proyek Supabase Anda.
  Cara mendapatkan: dashboard Supabase > Project Settings > API.
  - Project URL  -> SUPABASE_URL
  - anon public  -> SUPABASE_ANON_KEY  (kunci 'anon', aman dipakai di frontend)
*/

export const SUPABASE_URL = "https://ytmfsxiyzpygydcahbmf.supabase.co/rest/v1/";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0bWZzeGl5enB5Z3lkY2FoYm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjQyNDQsImV4cCI6MjA5NjY0MDI0NH0.0k8FGvOBrg5OrTDIUT9q4SelGrgXtxEccxaYmn9XIWY";

// Nama bucket penyimpanan (sesuai schema.sql).
export const BUCKET_MODELS = "models";
export const BUCKET_MARKERS = "markers";

// Daftar peran yang dikenal aplikasi.
export const ROLES = ["mahasiswa", "guru", "admin"];

// Peran yang boleh menyunting konten (editor).
export const EDITOR_ROLES = ["guru", "admin"];
