// Supabase Storage helpers (replaces Manus Forge/S3 integration)
import { supabaseAdmin } from "./_core/supabase";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "vetrank-uploads";

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const body = typeof data === "string" ? Buffer.from(data) : data;

  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(key, body, {
    contentType,
    upsert: false,
  });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(key);
  return { key, url: publicUrlData.publicUrl };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(key);
  return { key, url: data.publicUrl };
}

export async function storageGetSignedUrl(relKey: string, expiresInSeconds = 3600): Promise<string> {
  const key = normalizeKey(relKey);
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(key, expiresInSeconds);
  if (error || !data?.signedUrl) throw new Error(`Failed to create signed URL: ${error?.message}`);
  return data.signedUrl;
}
