import type { Express } from "express";

// Supabase Storage URLs are served directly — no proxy needed.
// This file is kept for compatibility; it registers nothing.
export function registerStorageProxy(_app: Express) {}
