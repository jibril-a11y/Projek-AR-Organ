/*
  Memasang tombol mode gelap/terang pada halaman login dan register.
  Sengaja dibuat terpisah dari modul autentikasi agar tombol tetap muncul
  walau modul lain (mis. pustaka Supabase) gagal/lambat dimuat.
*/
import { mountFloatingThemeToggle } from "../modules/theme.js";

mountFloatingThemeToggle();
