const cookieSecret = process.env.JWT_SECRET ?? "";
if (process.env.NODE_ENV === "production" && cookieSecret.length < 32) {
  throw new Error("JWT_SECRET must be set and at least 32 characters in production");
} else if (!cookieSecret) {
  console.warn("[Config] JWT_SECRET is not set — sessions will be insecure (dev only)");
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret,
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
