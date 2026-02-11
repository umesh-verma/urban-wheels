import { createClient } from "@supabase/supabase-js";

import { env } from "./env";

const supabaseUrl = env.SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_KEY;

export const supabase =
  supabaseUrl && supabaseServiceKey ?
    createClient(supabaseUrl, supabaseServiceKey)
  : null;

export const STORAGE_BUCKET = "urban-wheels";

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  path: string,
  file: File | Blob | Buffer,
  contentType?: string
) {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get a public URL for a file
 */
export function getPublicUrl(path: string) {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(path: string) {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);

  if (error) {
    throw error;
  }
}

/**
 * Check if Supabase storage is configured
 */
export function isStorageConfigured() {
  return !!supabase;
}
