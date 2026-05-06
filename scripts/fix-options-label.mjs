/**
 * fix-options-label.mjs
 * Migrates all questions where options use "label" key to use "id" key instead.
 * DB stores: [{label:"A", textPt:"...", textEn:"..."}]
 * Schema expects: [{id:"A", textPt:"...", textEn:"..."}]
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log("=== Fixing options label → id ===\n");

// Fetch all active questions
const [rows] = await conn.query("SELECT id, options FROM questions WHERE active = 1");
console.log(`Total questions to check: ${rows.length}`);

let fixed = 0;
let alreadyOk = 0;
let errors = 0;

for (const row of rows) {
  try {
    const opts = row.options; // Already parsed as array by mysql2
    if (!Array.isArray(opts) || opts.length === 0) {
      errors++;
      continue;
    }

    // Check if first option uses "label" key
    const firstOpt = opts[0];
    if (firstOpt.label !== undefined && firstOpt.id === undefined) {
      // Need to rename label → id
      const newOpts = opts.map((o) => ({
        id: o.label,
        textPt: o.textPt || o.text_pt || "",
        textEn: o.textEn || o.text_en || undefined,
        imageUrl: o.imageUrl || undefined,
      }));
      // Remove undefined keys
      const cleanOpts = newOpts.map((o) => {
        const clean = { id: o.id, textPt: o.textPt };
        if (o.textEn) clean.textEn = o.textEn;
        if (o.imageUrl) clean.imageUrl = o.imageUrl;
        return clean;
      });
      await conn.query("UPDATE questions SET options = ? WHERE id = ?", [
        JSON.stringify(cleanOpts),
        row.id,
      ]);
      fixed++;
    } else if (firstOpt.id !== undefined) {
      alreadyOk++;
    } else {
      console.log(`  Unexpected format for question id=${row.id}:`, JSON.stringify(firstOpt));
      errors++;
    }
  } catch (e) {
    console.error(`  Error processing question id=${row.id}:`, e.message);
    errors++;
  }
}

console.log(`\nResults:`);
console.log(`  Fixed (label→id): ${fixed}`);
console.log(`  Already OK (id):  ${alreadyOk}`);
console.log(`  Errors:           ${errors}`);

// Verify a sample
const [[sample]] = await conn.query("SELECT id, options FROM questions WHERE active=1 LIMIT 1");
console.log("\nSample after fix:");
console.log("  id:", sample.id);
console.log("  options[0]:", JSON.stringify(sample.options[0]));

await conn.end();
console.log("\n=== DONE ===");
