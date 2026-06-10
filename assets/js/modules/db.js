/*
  Modul akses data (Data Access Layer).
  Semua kueri ke tabel 'organs' dan 'profiles' lewat sini.
*/
import { supabase } from "../config/supabaseClient.js";

function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// ---------------------------- Organ ----------------------------
export async function listOrgans() {
  return unwrap(
    await supabase.from("organs").select("*").order("created_at", { ascending: true })
  );
}

export async function getOrgan(id) {
  return unwrap(await supabase.from("organs").select("*").eq("id", id).single());
}

export async function createOrgan(name) {
  const rows = unwrap(
    await supabase.from("organs").insert({ name }).select().single()
  );
  return rows;
}

export async function updateOrgan(id, fields) {
  return unwrap(
    await supabase.from("organs").update(fields).eq("id", id).select().single()
  );
}

export async function deleteOrgan(id) {
  return unwrap(await supabase.from("organs").delete().eq("id", id).select());
}

// Tambah/hapus item pada array deskripsi atau fungsi (field bertipe jsonb).
export async function addListItem(id, field, value) {
  const organ = await getOrgan(id);
  const items = Array.isArray(organ[field]) ? organ[field] : [];
  items.push(value);
  return updateOrgan(id, { [field]: items });
}

export async function deleteListItem(id, field, index) {
  const organ = await getOrgan(id);
  const items = Array.isArray(organ[field]) ? organ[field] : [];
  if (index >= 0 && index < items.length) items.splice(index, 1);
  return updateOrgan(id, { [field]: items });
}

// ---------------------------- Profil / pengguna ----------------------------
export async function listProfiles() {
  return unwrap(
    await supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .order("created_at", { ascending: true })
  );
}

export async function setProfileRole(id, role) {
  return unwrap(
    await supabase.from("profiles").update({ role }).eq("id", id).select().single()
  );
}
