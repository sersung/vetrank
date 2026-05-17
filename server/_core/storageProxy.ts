import type { Express } from "express";
import { ENV } from "./env";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _s3: S3Client | null = null;
function getS3(): S3Client | null {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_REGION || !process.env.AWS_BUCKET_NAME) return null;
  if (!_s3) {
    _s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3;
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)["0"];
    if (!key) { res.status(400).send("Missing storage key"); return; }

    const isImage = /\.(webp|jpg|jpeg|png|gif|svg)$/i.test(key);
    const cacheHeader = isImage ? "public, max-age=31536000, immutable" : "no-store";

    // ── Backend 1: Manus Forge ───────────────────────────────────────────────
    if (ENV.forgeApiUrl && ENV.forgeApiKey) {
      try {
        const forgeUrl = new URL(
          "v1/storage/presign/get",
          ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
        );
        forgeUrl.searchParams.set("path", key);

        const forgeResp = await fetch(forgeUrl, {
          headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
        });

        if (!forgeResp.ok) {
          const body = await forgeResp.text().catch(() => "");
          console.error(`[StorageProxy/Forge] ${forgeResp.status} ${body}`);
          res.status(502).send("Storage backend error");
          return;
        }

        const { url } = (await forgeResp.json()) as { url: string };
        if (!url) { res.status(502).send("Empty signed URL from Forge"); return; }

        res.set("Cache-Control", cacheHeader);
        res.redirect(307, url);
        return;
      } catch (err) {
        console.error("[StorageProxy/Forge] failed:", err);
        res.status(502).send("Storage proxy error");
        return;
      }
    }

    // ── Backend 2: AWS S3 direto ─────────────────────────────────────────────
    const s3 = getS3();
    if (s3) {
      try {
        const url = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME!, Key: key }),
          { expiresIn: isImage ? 31536000 : 3600 },
        );
        res.set("Cache-Control", cacheHeader);
        res.redirect(307, url);
        return;
      } catch (err) {
        console.error("[StorageProxy/S3] failed:", err);
        res.status(502).send("Storage S3 error");
        return;
      }
    }

    res.status(500).send(
      "Storage não configurado. Defina BUILT_IN_FORGE_API_URL (Manus) " +
      "ou AWS_ACCESS_KEY_ID + AWS_BUCKET_NAME (VPS)."
    );
  });
}
