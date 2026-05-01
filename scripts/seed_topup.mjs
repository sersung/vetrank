/**
 * VetRank — Top-up Seeder
 * Inserts only NEW questions from questions_all.json that aren't already in the DB
 * Safe to run multiple times — skips duplicates by checking textPt
 */

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../data");

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("🔄 VetRank Top-up Seeder");
  console.log("=".repeat(50));

  const allFile = path.join(DATA_DIR, "questions_all.json");
  if (!fs.existsSync(allFile)) {
    console.error("questions_all.json not found!");
    process.exit(1);
  }

  const allQuestions = JSON.parse(fs.readFileSync(allFile, "utf8"));
  console.log(`📦 Loaded ${allQuestions.length} questions from JSON`);

  // Get current DB count and existing textPt set (first 200 chars as key)
  const [countRows] = await conn.execute("SELECT COUNT(*) as cnt FROM questions");
  const existingCount = countRows[0].cnt;
  console.log(`📊 Current DB count: ${existingCount}`);

  // Load existing textPt keys from DB to avoid duplicates
  const [existingRows] = await conn.execute("SELECT LEFT(textPt, 100) as qkey FROM questions");
  const existingKeys = new Set(existingRows.map(r => r.qkey));
  console.log(`🔑 Loaded ${existingKeys.size} existing question keys\n`);

  // Build discipline and subject maps
  const [disciplines] = await conn.execute("SELECT id, slug FROM disciplines");
  const disciplineMap = new Map(disciplines.map(d => [d.slug, d.id]));

  const [subjects] = await conn.execute("SELECT id, disciplineId, slug FROM subjects");
  const subjectMap = new Map();
  for (const s of subjects) {
    const dSlug = [...disciplineMap.entries()].find(([, id]) => id === s.disciplineId)?.[0];
    if (dSlug) subjectMap.set(`${dSlug}/${s.slug}`, s.id);
  }

  // Filter to only new questions
  const newQuestions = allQuestions.filter(q => {
    const key = (q.textPt || "").slice(0, 100);
    return !existingKeys.has(key);
  });

  console.log(`📝 New questions to insert: ${newQuestions.length}`);

  if (newQuestions.length === 0) {
    console.log("✅ Nothing to insert — all questions already in DB");
    await conn.end();
    return;
  }

  let inserted = 0;
  let skipped = 0;

  for (const q of newQuestions) {
    const disciplineId = disciplineMap.get(q.disciplineSlug);
    if (!disciplineId || !q.textPt || !q.options || !q.correctOption) { skipped++; continue; }

    const subjectId = subjectMap.get(`${q.disciplineSlug}/${q.subjectSlug}`) || null;

    try {
      await conn.execute(
        `INSERT INTO questions (disciplineId, subjectId, difficulty, year, textPt, textEn, options, correctOption, explanationPt, explanationEn, isPremium, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          disciplineId, subjectId, q.difficulty, q.year || 2024,
          q.textPt, q.textEn || null, JSON.stringify(q.options), q.correctOption,
          q.explanationPt || null, q.explanationEn || null, q.isPremium ? 1 : 0,
        ]
      );
      inserted++;
    } catch (e) {
      skipped++;
    }

    if ((inserted + skipped) % 200 === 0) {
      process.stdout.write(`  Progress: ${inserted + skipped}/${newQuestions.length} (inserted: ${inserted})\n`);
    }
  }

  const [finalCount] = await conn.execute("SELECT COUNT(*) as cnt FROM questions");
  console.log(`\n✅ Top-up complete!`);
  console.log(`  Newly inserted: ${inserted}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total in DB: ${finalCount[0].cnt}`);

  await conn.end();
  process.exit(0);
}

main().catch(e => { console.error("Top-up failed:", e.message); process.exit(1); });
