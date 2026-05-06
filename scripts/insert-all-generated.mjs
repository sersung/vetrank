/**
 * insert-all-generated.mjs
 * Reads both generated JSON files and inserts ALL questions, ignoring success flag.
 * Tries to extract JSON arrays from questions_json even if malformed.
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

function tryParseQuestions(jsonStr) {
  if (!jsonStr) return [];
  // Try direct parse
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.questions) return parsed.questions;
    return [];
  } catch (e) {
    // Try to extract array from string
    const match = jsonStr.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        // Try to find individual question objects
        const questions = [];
        const objMatches = jsonStr.matchAll(/\{[^{}]*"textPt"[^{}]*"correctOption"[^{}]*\}/g);
        for (const m of objMatches) {
          try {
            questions.push(JSON.parse(m[0]));
          } catch {}
        }
        return questions;
      }
    }
    return [];
  }
}

const files = [
  "/home/ubuntu/generate_vet_questions.json",
  "/home/ubuntu/generate_vet_questions_retry.json",
];

// Track which subjects already have new questions
const [existingNew] = await conn.query(
  "SELECT DISTINCT subjectId FROM questions WHERE active=1 AND id > 5661"
);
const alreadyInserted = new Set(existingNew.map((r) => r.subjectId));
console.log(`Subjects already with new questions: ${alreadyInserted.size}`);

let totalInserted = 0;
let totalSkipped = 0;
let totalErrors = 0;

for (const file of files) {
  const raw = readFileSync(file, "utf-8");
  const data = JSON.parse(raw);
  console.log(`\nProcessing ${file} (${data.results.length} batches)...`);

  for (const result of data.results) {
    const { subject_id, discipline_id, questions_json } = result.output;

    if (!subject_id || !discipline_id) continue;

    // Skip if already inserted for this subject
    if (alreadyInserted.has(subject_id)) {
      continue;
    }

    const questions = tryParseQuestions(questions_json);
    if (questions.length === 0) {
      console.log(`  Subject ${subject_id}: no parseable questions`);
      totalSkipped++;
      continue;
    }

    let inserted = 0;
    for (const q of questions) {
      try {
        const validOptions = ["A", "B", "C", "D", "E"];
        if (!validOptions.includes(q.correctOption)) {
          totalSkipped++;
          continue;
        }
        if (!q.options || q.options.length !== 5) {
          totalSkipped++;
          continue;
        }
        const validDifficulties = ["easy", "medium", "hard"];
        const difficulty = validDifficulties.includes(q.difficulty) ? q.difficulty : "medium";

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
            difficulty,
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
        totalErrors++;
      }
    }
    if (inserted > 0) {
      alreadyInserted.add(subject_id);
      console.log(`  Subject ${subject_id}: inserted ${inserted}/${questions.length}`);
    }
  }
}

console.log(`\n=== RESULTS ===`);
console.log(`Inserted:  ${totalInserted}`);
console.log(`Skipped:   ${totalSkipped}`);
console.log(`Errors:    ${totalErrors}`);

const [[{ total }]] = await conn.query("SELECT COUNT(*) as total FROM questions WHERE active=1");
console.log(`\nTotal active questions in DB: ${total}`);

// Distribution by discipline and subject count
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

// Subjects with no questions
const [noQ] = await conn.query(`
  SELECT s.id, s.namePt FROM subjects s
  LEFT JOIN questions q ON q.subjectId=s.id AND q.active=1
  WHERE q.id IS NULL
`);
if (noQ.length > 0) {
  console.log(`\nSubjects still with 0 questions (${noQ.length}):`);
  noQ.forEach((s) => console.log(`  [${s.id}] ${s.namePt}`));
}

await conn.end();
console.log("\n=== DONE ===");
