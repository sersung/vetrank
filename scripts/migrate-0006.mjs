import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, "../drizzle/0006_mean_titanium_man.sql"), "utf8");

const conn = await createConnection(process.env.DATABASE_URL);

// Split on statement-breakpoint and run each statement
const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);

for (const stmt of statements) {
  console.log("Running:", stmt.slice(0, 80) + "...");
  try {
    await conn.execute(stmt);
    console.log("  ✓ OK");
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME" || err.code === "ER_TABLE_EXISTS_ERROR") {
      console.log("  ⚠ Already exists, skipping");
    } else {
      console.error("  ✗ Error:", err.message);
    }
  }
}

await conn.end();
console.log("\nMigration 0006 complete.");
