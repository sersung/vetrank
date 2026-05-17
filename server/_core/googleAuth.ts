/**
 * Google OAuth 2.0 — rota de autenticação alternativa ao Manus.
 * Ativa quando GOOGLE_CLIENT_ID está definido no ambiente.
 *
 * Fluxo:
 *   /api/auth/google           → redireciona para Google consent screen
 *   /api/auth/google/callback  → troca code por token, upserta usuário, seta cookie
 */
import type { Express, Request, Response } from "express";
import axios from "axios";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const GOOGLE_SCOPES = "openid email profile";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function getRedirectUri(req: Request): string {
  // Usa X-Forwarded-Proto para funcionar atrás de Nginx/Caddy em produção
  const proto = req.headers["x-forwarded-proto"] ?? req.protocol;
  const host  = req.headers["x-forwarded-host"]  ?? req.get("host");
  return `${proto}://${host}/api/auth/google/callback`;
}

export function registerGoogleAuthRoutes(app: Express) {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId) {
    // Silencioso — Google Auth não está configurado neste ambiente
    return;
  }

  // ── Inicia o fluxo OAuth ──────────────────────────────────────────────────
  app.get("/api/auth/google", (req: Request, res: Response) => {
    const params = new URLSearchParams({
      client_id:     clientId,
      redirect_uri:  getRedirectUri(req),
      response_type: "code",
      scope:         GOOGLE_SCOPES,
      access_type:   "offline",
      prompt:        "select_account",
    });
    res.redirect(`${GOOGLE_AUTH_URL}?${params}`);
  });

  // ── Callback do Google ────────────────────────────────────────────────────
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code  = req.query.code  as string | undefined;
    const error = req.query.error as string | undefined;

    if (error || !code) {
      console.error("[Google Auth] Error from Google:", error);
      res.redirect("/?auth_error=" + (error ?? "no_code"));
      return;
    }

    try {
      // 1. Troca código por tokens
      const tokenRes = await axios.post<{
        access_token: string;
        id_token: string;
      }>(GOOGLE_TOKEN_URL, {
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  getRedirectUri(req),
        grant_type:    "authorization_code",
        code,
      });

      const { access_token } = tokenRes.data;

      // 2. Busca informações do usuário
      const userRes = await axios.get<{
        sub: string;
        email: string;
        name: string;
        picture?: string;
        email_verified: boolean;
      }>(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const googleUser = userRes.data;

      if (!googleUser.email_verified) {
        res.status(400).json({ error: "Google account email not verified." });
        return;
      }

      // 3. Upserta usuário no banco local
      // openId prefixado com "google_" para não colidir com openIds do Manus
      const openId = `google_${googleUser.sub}`;
      await db.upsertUser({
        openId,
        name:         googleUser.name  || null,
        email:        googleUser.email || null,
        loginMethod:  "google",
        lastSignedIn: new Date(),
      });

      // 4. Cria JWT de sessão (mesmo mecanismo do Manus OAuth)
      const sessionToken = await sdk.createSessionToken(openId, {
        name:        googleUser.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (err: any) {
      console.error("[Google Auth] Callback failed:", err?.response?.data ?? err.message);
      res.status(500).send("Autenticação com Google falhou. Tente novamente.");
    }
  });
}
