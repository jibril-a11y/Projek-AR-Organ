/*
  Modul autentikasi.

  Membungkus Supabase Auth: daftar, masuk, keluar, ambil sesi & profil,
  serta penjaga halaman (guard) berdasarkan peran.
*/
import { supabase } from "../config/supabaseClient.js";
import { EDITOR_ROLES } from "../config/config.js";

// Daftar akun baru. role hanya boleh 'mahasiswa' atau 'guru' dari sisi klien.
export async function signUp({ email, password, fullName, role }) {
  const safeRole = role === "guru" ? "guru" : "mahasiswa";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role: safeRole } },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Ambil profil (nama + peran) milik user yang sedang login.
export async function getProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", session.user.id)
    .single();
  if (error) return { id: session.user.id, full_name: null, role: "mahasiswa" };
  return data;
}

export function isEditor(profile) {
  return profile && EDITOR_ROLES.includes(profile.role);
}

// Penjaga halaman: arahkan ke login bila belum masuk.
// Bila allowedRoles diberikan, arahkan ke beranda bila peran tidak cocok.
export async function requireAuth(allowedRoles = null) {
  const session = await getSession();
  if (!session) {
    window.location.replace("login.html");
    return null;
  }
  const profile = await getProfile();
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    window.location.replace("index.html");
    return null;
  }
  return profile;
}
