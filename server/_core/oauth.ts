import type { Express, Request, Response } from "express";

// Auth is handled client-side by @supabase/supabase-js.
// This file only provides a health-check endpoint for the auth flow.
export function registerOAuthRoutes(app: Express) {
  // Kept for backwards-compat: old deep-links to /api/oauth/callback redirect to home
  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    res.redirect(302, "/");
  });
}
