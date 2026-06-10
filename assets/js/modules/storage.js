/*
  Modul penyimpanan file ke Supabase Storage.
  Menangani unggahan model 3D, gambar marker/QR, dan file .mind.
*/
import { supabase } from "../config/supabaseClient.js";
import { BUCKET_MODELS, BUCKET_MARKERS } from "../config/config.js";

function rand() {
  return Math.random().toString(36).slice(2, 8);
}

async function upload(bucket, path, body, contentType) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { upsert: true, contentType });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadModel(file) {
  const ext = (file.name.split(".").pop() || "glb").toLowerCase();
  const path = `model_${Date.now()}_${rand()}.${ext}`;
  return upload(BUCKET_MODELS, path, file, file.type || "model/gltf-binary");
}

export async function uploadMarkerImage(blob, prefix = "marker") {
  const path = `${prefix}_${Date.now()}_${rand()}.png`;
  return upload(BUCKET_MARKERS, path, blob, "image/png");
}

export async function uploadMind(blob) {
  // Satu file gabungan untuk seluruh marker (mode MindAR).
  return upload(BUCKET_MARKERS, "targets.mind", blob, "application/octet-stream");
}

export async function getMindUrl() {
  const { data } = supabase.storage.from(BUCKET_MARKERS).getPublicUrl("targets.mind");
  return data.publicUrl;
}
