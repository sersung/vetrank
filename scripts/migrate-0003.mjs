import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const sql = readFileSync(join(__dirname, "../drizzle/0003_perfect_mantis.sql"), "utf-8");
const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);

const conn = await createConnection(process.env.DATABASE_URL);
console.log("Connected to database");

for (const stmt of statements) {
  if (!stmt) continue;
  console.log("Executing:", stmt.slice(0, 80) + "...");
  try {
    await conn.execute(stmt);
    console.log("  ✓ OK");
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME" || err.code === "ER_TABLE_EXISTS_ERROR" || err.message.includes("already exists") || err.message.includes("Duplicate column")) {
      console.log("  ⚠ Already exists, skipping");
    } else {
      console.error("  ✗ Error:", err.message);
    }
  }
}

await conn.end();
console.log("Migration complete");
