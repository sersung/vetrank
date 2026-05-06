// Vercel serverless entry point — wraps the Express app
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { handleMPWebhook } from "../server/mpWebhook";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);
registerOAuthRoutes(app);

app.post("/api/mp/webhook", handleMPWebhook);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
});

app.use("/api/trpc", apiLimiter);

app.use(
  "/api/trpc",
  createExpressMiddleware({ router: appRouter, createContext }),
);

export default app;
