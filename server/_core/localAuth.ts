import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const DEV_USERS: Record<string, string> = {
  admin: "local-admin-001",
  user:  "local-user-001",
};

export function registerLocalAuthRoutes(app: Express) {
  // GET /api/dev/login?user=admin  OR  ?user=user
  // Returns a small HTML page with links so the tester can pick an account.
  app.get("/api/dev/login", async (req: Request, res: Response) => {
    const userParam = typeof req.query.user === "string" ? req.query.user : null;

    if (!userParam) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(`
        <!doctype html><html lang="pt-BR">
        <head><meta charset="utf-8"><title>Login Local — VetRank Dev</title>
        <style>
          body{font-family:system-ui,sans-serif;background:#0d1a14;color:#d1fae5;
               display:flex;flex-direction:column;align-items:center;justify-content:center;
               min-height:100vh;gap:1rem;margin:0}
          h1{color:#4ade80;margin-bottom:0.5rem}
          p{color:#6b7280;font-size:.875rem;margin:0}
          a{display:inline-block;padding:12px 28px;border-radius:8px;
            font-weight:600;font-size:1rem;text-decoration:none;color:#fff;
            background:#16a34a;margin:6px;transition:opacity .15s}
          a:hover{opacity:.85}
          .tag{font-size:.75rem;background:#14532d;color:#4ade80;
               padding:2px 8px;border-radius:99px;margin-left:6px}
        </style></head>
        <body>
          <h1>⚡ VetRank — Login Local</h1>
          <p>Ambiente de desenvolvimento. Escolha o perfil:</p>
          <div>
            <a href="/api/dev/login?user=admin">
              Entrar como Admin <span class="tag">premium</span>
            </a>
            <a href="/api/dev/login?user=user" style="background:#0e7490">
              Entrar como Usuário <span class="tag">trial</span>
            </a>
          </div>
        </body></html>
      `);
      return;
    }

    const openId = DEV_USERS[userParam];
    if (!openId) {
      res.status(400).json({ error: `Unknown dev user "${userParam}". Use: admin, user` });
      return;
    }

    const dbUser = await db.getUserByOpenId(openId);
    if (!dbUser) {
      res.status(404).json({
        error: `User "${openId}" not found in database. Run the seed insert again.`,
      });
      return;
    }

    const sessionToken = await sdk.createSessionToken(openId, {
      name: dbUser.name ?? userParam,
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    res.redirect(302, "/");
  });
}
