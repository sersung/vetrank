import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const sql = readFileSync("/home/ubuntu/vetrank/drizzle/0005_bouncy_tarot.sql", "utf-8");

// Split on Drizzle's statement-breakpoint marker
const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);

let ok = 0, skip = 0;
for (const stmt of statements) {
  try {
    await conn.query(stmt);
    ok++;
  } catch (e) {
    if (e.code === "ER_TABLE_EXISTS_ERROR" || e.code === "ER_DUP_FIELDNAME" || e.code === "ER_DUP_KEYNAME" || e.message.includes("already exists") || e.message.includes("Duplicate")) {
      skip++;
    } else {
      console.error("ERROR:", e.message, "\nSQL:", stmt.slice(0, 120));
    }
  }
}

console.log(`Migration complete: ${ok} executed, ${skip} skipped (already exist)`);
await conn.end();
