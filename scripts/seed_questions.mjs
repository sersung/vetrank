/**
 * VetRank — Database Seeder (raw mysql2)
 * Reads generated JSON files and inserts disciplines, subjects, and questions into MySQL
 */

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../data");

const DISCIPLINE_ICONS = {
  pharmacology: "Pill",
  clinics: "Stethoscope",
  herpetology: "Leaf",
  ornithology: "Bird",
  anesthesiology: "Activity",
  "small-mammals": "Heart",
};

const DISCIPLINE_COLORS = {
  pharmacology: "#10b981",
  clinics: "#3b82f6",
  herpetology: "#84cc16",
  ornithology: "#f59e0b",
  anesthesiology: "#8b5cf6",
  "small-mammals": "#ec4899",
};

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("🌱 VetRank Database Seeder (raw mysql2)");
  console.log("=".repeat(50));

  // Load all questions
  const allFile = path.join(DATA_DIR, "questions_all.json");
  if (!fs.existsSync(allFile)) {
    console.error("questions_all.json not found!");
    process.exit(1);
  }
  const allQuestions = JSON.parse(fs.readFileSync(allFile, "utf8"));
  console.log(`📦 Loaded ${allQuestions.length} questions from JSON\n`);

  const disciplineMap = new Map(); // slug -> id
  const subjectMap = new Map();   // `disciplineSlug/subjectSlug` -> id

  // ── Step 1: Disciplines ──────────────────────────────────────────────────
  console.log("📚 Seeding disciplines...");
  const uniqueDisciplines = [];
  const seen = new Set();
  for (const q of allQuestions) {
    if (!seen.has(q.disciplineSlug)) {
      seen.add(q.disciplineSlug);
      uniqueDisciplines.push({ slug: q.disciplineSlug, namePt: q.disciplineNamePt, nameEn: q.disciplineNameEn });
    }
  }

  for (const d of uniqueDisciplines) {
    await conn.execute(
      `INSERT INTO disciplines (slug, namePt, nameEn, icon, color) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE namePt = VALUES(namePt), nameEn = VALUES(nameEn)`,
      [d.slug, d.namePt, d.nameEn, DISCIPLINE_ICONS[d.slug] || "BookOpen", DISCIPLINE_COLORS[d.slug] || "#10b981"]
    );
    const [rows] = await conn.execute("SELECT id FROM disciplines WHERE slug = ?", [d.slug]);
    disciplineMap.set(d.slug, rows[0].id);
    console.log(`  ✓ ${d.namePt} (id: ${rows[0].id})`);
  }

  // ── Step 2: Subjects ─────────────────────────────────────────────────────
  console.log("\n📖 Seeding subjects...");
  const seenSubjects = new Set();
  const uniqueSubjects = [];
  for (const q of allQuestions) {
    const key = `${q.disciplineSlug}/${q.subjectSlug}`;
    if (!seenSubjects.has(key)) {
      seenSubjects.add(key);
      uniqueSubjects.push({ disciplineSlug: q.disciplineSlug, slug: q.subjectSlug, namePt: q.subjectNamePt, nameEn: q.subjectNameEn });
    }
  }

  for (const s of uniqueSubjects) {
    const disciplineId = disciplineMap.get(s.disciplineSlug);
    if (!disciplineId) continue;
    await conn.execute(
      `INSERT INTO subjects (disciplineId, slug, namePt, nameEn) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE namePt = VALUES(namePt), nameEn = VALUES(nameEn)`,
      [disciplineId, s.slug, s.namePt, s.nameEn]
    );
    const [rows] = await conn.execute(
      "SELECT id FROM subjects WHERE disciplineId = ? AND slug = ?",
      [disciplineId, s.slug]
    );
    if (rows[0]) subjectMap.set(`${s.disciplineSlug}/${s.slug}`, rows[0].id);
  }
  console.log(`  ✓ ${subjectMap.size} subjects seeded`);

  // ── Step 3: Questions ────────────────────────────────────────────────────
  console.log("\n❓ Seeding questions...");

  // Check existing count to avoid duplicates
  const [existingRows] = await conn.execute("SELECT COUNT(*) as cnt FROM questions");
  const existingCount = existingRows[0].cnt;
  console.log(`  Existing questions in DB: ${existingCount}`);

  if (existingCount > 0) {
    console.log("  Database already has questions. Skipping to avoid duplicates.");
    console.log("  (To re-seed, truncate the questions table first)");
  } else {
    let inserted = 0;
    let skipped = 0;

    for (const q of allQuestions) {
      const disciplineId = disciplineMap.get(q.disciplineSlug);
      if (!disciplineId) { skipped++; continue; }
      if (!q.textPt || !q.options || !q.correctOption) { skipped++; continue; }

      const subjectId = subjectMap.get(`${q.disciplineSlug}/${q.subjectSlug}`) || null;
      const optionsJson = JSON.stringify(q.options);

      try {
        await conn.execute(
          `INSERT INTO questions (disciplineId, subjectId, difficulty, year, textPt, textEn, options, correctOption, explanationPt, explanationEn, isPremium, active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            disciplineId,
            subjectId,
            q.difficulty,
            q.year || 2024,
            q.textPt,
            q.textEn || null,
            optionsJson,
            q.correctOption,
            q.explanationPt || null,
            q.explanationEn || null,
            q.isPremium ? 1 : 0,
          ]
        );
        inserted++;
      } catch (e) {
        skipped++;
      }

      if ((inserted + skipped) % 100 === 0) {
        process.stdout.write(`  Progress: ${inserted + skipped}/${allQuestions.length} (inserted: ${inserted})\n`);
      }
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`  Inserted: ${inserted} questions`);
    console.log(`  Skipped: ${skipped} questions`);
  }

  // Final summary
  const [qCount] = await conn.execute("SELECT COUNT(*) as cnt FROM questions");
  const [dCount] = await conn.execute("SELECT COUNT(*) as cnt FROM disciplines");
  const [sCount] = await conn.execute("SELECT COUNT(*) as cnt FROM subjects");
  console.log(`\n📊 Database summary:`);
  console.log(`  Disciplines: ${dCount[0].cnt}`);
  console.log(`  Subjects: ${sCount[0].cnt}`);
  console.log(`  Questions: ${qCount[0].cnt}`);

  await conn.end();
  process.exit(0);
}

main().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
