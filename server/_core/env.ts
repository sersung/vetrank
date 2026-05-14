export const ENV = {
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerEmails: (process.env.OWNER_EMAIL ?? "").split(",").map(e => e.trim()).filter(Boolean),
  isProduction: process.env.NODE_ENV === "production",
  // LLM (OpenAI-compatible)
  llmApiKey: process.env.OPENAI_API_KEY ?? "",
  llmApiUrl: process.env.LLM_API_URL ?? "https://api.openai.com",
};
