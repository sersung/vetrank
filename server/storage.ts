/**
 * storage.ts — camada de armazenamento de arquivos.
 *
 * Suporta dois backends de forma transparente:
 *
 *  1. Manus Forge (padrão no Manus hosted):
 *     Usa BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY para obter
 *     presigned URLs do S3 gerenciado pelo Manus.
 *
 *  2. AWS S3 direto (VPS auto-hospedado):
 *     Usa AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_REGION + AWS_BUCKET_NAME
 *     para fazer upload direto com o SDK @aws-sdk/client-s3.
 *     Downloads são servidos via proxy /manus-storage/* que gera presigned GET URLs.
 *
 * A URL de retorno (/manus-storage/{key}) é idêntica em ambos os modos,
 * garantindo que links gravados no banco funcionem independentemente do backend.
 */

import { ENV } from "./_core/env";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function hasForge(): boolean {
  return !!(ENV.forgeApiUrl && ENV.forgeApiKey);
}

function hasS3(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION &&
    process.env.AWS_BUCKET_NAME
  );
}

let _s3Client: S3Client | null = null;
function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3Client;
}

// ─── storagePut ───────────────────────────────────────────────────────────────

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));

  // ── Backend 1: Manus Forge ─────────────────────────────────────────────────
  if (hasForge()) {
    const forgeUrl = ENV.forgeApiUrl!.replace(/\/+$/, "");
    const forgeKey = ENV.forgeApiKey!;

    const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
    presignUrl.searchParams.set("path", key);

    const presignResp = await fetch(presignUrl, {
      headers: { Authorization: `Bearer ${forgeKey}` },
    });

    if (!presignResp.ok) {
      const msg = await presignResp.text().catch(() => presignResp.statusText);
      throw new Error(`[Storage/Forge] Presign failed (${presignResp.status}): ${msg}`);
    }

    const { url: s3Url } = (await presignResp.json()) as { url: string };
    if (!s3Url) throw new Error("[Storage/Forge] Empty presign URL");

    const blob =
      typeof data === "string"
        ? new Blob([data], { type: contentType })
        : new Blob([data as any], { type: contentType });

    const uploadResp = await fetch(s3Url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: blob,
    });

    if (!uploadResp.ok) {
      throw new Error(`[Storage/Forge] Upload failed (${uploadResp.status})`);
    }

    return { key, url: `/manus-storage/${key}` };
  }

  // ── Backend 2: AWS S3 direto ───────────────────────────────────────────────
  if (hasS3()) {
    const bucket = process.env.AWS_BUCKET_NAME!;
    const body = typeof data === "string" ? Buffer.from(data) : data;

    await getS3Client().send(new PutObjectCommand({
      Bucket:      bucket,
      Key:         key,
      Body:        body,
      ContentType: contentType,
    }));

    return { key, url: `/manus-storage/${key}` };
  }

  throw new Error(
    "[Storage] Nenhum backend configurado. " +
    "Defina BUILT_IN_FORGE_API_URL+BUILT_IN_FORGE_API_KEY (Manus) " +
    "ou AWS_ACCESS_KEY_ID+AWS_SECRET_ACCESS_KEY+AWS_REGION+AWS_BUCKET_NAME (VPS)."
  );
}

// ─── storageGet (apenas retorna a URL do proxy) ───────────────────────────────

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

// ─── storageGetSignedUrl (para downloads diretos) ─────────────────────────────

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);

  if (hasForge()) {
    const forgeUrl = ENV.forgeApiUrl!.replace(/\/+$/, "");
    const forgeKey = ENV.forgeApiKey!;

    const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
    getUrl.searchParams.set("path", key);

    const resp = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${forgeKey}` },
    });

    if (!resp.ok) {
      const msg = await resp.text().catch(() => resp.statusText);
      throw new Error(`[Storage/Forge] Signed URL failed (${resp.status}): ${msg}`);
    }

    const { url } = (await resp.json()) as { url: string };
    return url;
  }

  if (hasS3()) {
    // Para S3 direto, gera presigned GET URL
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    return getSignedUrl(getS3Client(), new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key:    key,
    }), { expiresIn: 3600 });
  }

  throw new Error("[Storage] Nenhum backend configurado para storageGetSignedUrl.");
}
