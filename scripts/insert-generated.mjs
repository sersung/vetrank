/**
 * insert-generated.mjs
 * Reads the generated questions JSON from map tool output and inserts into DB.
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const raw = readFileSync("/home/ubuntu/generate_vet_questions.json", "utf-8");
const data = JSON.parse(raw);
const results = data.results;

console.log(`Processing ${results.length} subject batches...`);

let totalInserted = 0;
let totalSkipped = 0;
let totalErrors = 0;

for (const result of results) {
  const { subject_id, discipline_id, questions_json, success } = result.output;

  if (!success || !questions_json) {
    console.log(`  Skipping subject ${subject_id}: not successful`);
    totalSkipped++;
    continue;
  }

  let questions;
  try {
    const parsed = JSON.parse(questions_json);
    // Handle both {questions: [...]} and [...] formats
    questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
  } catch (e) {
    console.log(`  Error parsing JSON for subject ${subject_id}: ${e.message}`);
    totalErrors++;
    continue;
  }

  let inserted = 0;
  for (const q of questions) {
    try {
      // Validate
      const validOptions = ["A", "B", "C", "D", "E"];
      if (!validOptions.includes(q.correctOption)) {
        console.log(`    Skipping: invalid correctOption "${q.correctOption}"`);
        totalSkipped++;
        continue;
      }
      if (!q.options || q.options.length !== 5) {
        console.log(`    Skipping: expected 5 options, got ${q.options?.length}`);
        totalSkipped++;
        continue;
      }
      // Normalize options to ensure id field
      const normalizedOptions = q.options.map((o) => ({
        id: o.id ?? o.label ?? "?",
        textPt: o.textPt ?? o.text_pt ?? "",
        textEn: o.textEn ?? o.text_en ?? undefined,
      }));

      await conn.query(
        `INSERT INTO questions 
         (disciplineId, subjectId, difficulty, textPt, textEn, options, correctOption, explanationPt, explanationEn, active, isPremium, questionType, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'multiple_choice', 'approved', NOW(), NOW())`,
        [
          discipline_id,
          subject_id,
          q.difficulty || "medium",
          q.textPt,
          q.textEn || null,
          JSON.stringify(normalizedOptions),
          q.correctOption,
          q.explanationPt || null,
          q.explanationEn || null,
        ]
      );
      inserted++;
      totalInserted++;
    } catch (e) {
      console.log(`    DB error: ${e.message}`);
      totalErrors++;
    }
  }
  console.log(`  Subject ${subject_id}: inserted ${inserted}/${questions.length}`);
}

console.log(`\n=== RESULTS ===`);
console.log(`Inserted:  ${totalInserted}`);
console.log(`Skipped:   ${totalSkipped}`);
console.log(`Errors:    ${totalErrors}`);

// Final count
const [[{ total }]] = await conn.query("SELECT COUNT(*) as total FROM questions WHERE active=1");
console.log(`\nTotal active questions in DB: ${total}`);

// Distribution by discipline
const [dist] = await conn.query(`
  SELECT d.namePt, COUNT(q.id) as cnt 
  FROM questions q 
  JOIN disciplines d ON q.disciplineId=d.id 
  WHERE q.active=1 
  GROUP BY d.id, d.namePt 
  ORDER BY cnt DESC
`);
console.log("\nQuestions per discipline:");
dist.forEach((r) => console.log(`  ${r.namePt}: ${r.cnt}`));

await conn.end();
console.log("\n=== DONE ===");
