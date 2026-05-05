const jwtSecret = process.env.JWT_SECRET ?? "";
if (!jwtSecret) {
  console.error(
    "[Security] CRITICAL: JWT_SECRET is not set. Session tokens will be signed with an empty key — set JWT_SECRET in your environment."
  );
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: jwtSecret,
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
