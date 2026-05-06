import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";

// Server-side admin client (bypasses RLS — only use server-side)
export const supabaseAdmin = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
