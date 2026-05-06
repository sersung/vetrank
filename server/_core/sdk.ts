import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { supabaseAdmin } from "./supabase";

export type SessionPayload = {
  sub: string;    // Supabase user id
  email?: string;
};

class SDKServer {
  private extractToken(req: Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }
    // Fallback: read from cookie (sent by Supabase SSR helpers or custom cookie)
    const cookies = parseCookieHeader(req.headers.cookie ?? "");
    return cookies["sb-access-token"];
  }

  async authenticateRequest(req: Request): Promise<User> {
    const token = this.extractToken(req);
    if (!token) throw ForbiddenError("Missing auth token");

    const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !supabaseUser) throw ForbiddenError("Invalid auth token");

    const openId = supabaseUser.id;
    let user = await db.getUserByOpenId(openId);

    if (!user) {
      const meta = supabaseUser.user_metadata ?? {};
      await db.upsertUser({
        openId,
        name: (meta.full_name ?? meta.name ?? null) as string | null,
        email: supabaseUser.email ?? null,
        loginMethod: (supabaseUser.app_metadata?.provider ?? null) as string | null,
        lastSignedIn: new Date(),
        // Grant admin role to owner
        ...(supabaseUser.email === ENV.ownerEmail ? { role: "admin" as const } : {}),
      });
      user = await db.getUserByOpenId(openId);
    }

    if (!user) throw ForbiddenError("User not found");

    await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
    return user;
  }
}

export const sdk = new SDKServer();
