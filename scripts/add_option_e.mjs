/**
 * Add option E to all existing questions that only have A-D.
 * Uses Gemini to generate a plausible 5th option based on the question text.
 * For speed, generates option E as a distractor without calling AI (rule-based).
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get all questions
const [questions] = await conn.query("SELECT id, textPt, options, correctOption FROM questions LIMIT 999999");
console.log(`Total questions: ${questions.length}`);

let updated = 0;
let skipped = 0;
const BATCH = 500;

// Common veterinary distractor phrases for option E
const distractorsPt = [
  "Nenhuma das alternativas anteriores está correta",
  "Todas as alternativas anteriores estão corretas",
  "As alternativas A e B estão corretas",
  "As alternativas B e C estão corretas",
  "As alternativas A e D estão corretas",
  "Apenas as alternativas A e C estão corretas",
  "Apenas as alternativas B e D estão corretas",
  "Não é possível determinar com as informações fornecidas",
  "As alternativas A, B e C estão corretas",
  "As alternativas B, C e D estão corretas",
];

const distractorsEn = [
  "None of the above alternatives are correct",
  "All of the above alternatives are correct",
  "Alternatives A and B are correct",
  "Alternatives B and C are correct",
  "Alternatives A and D are correct",
  "Only alternatives A and C are correct",
  "Only alternatives B and D are correct",
  "Cannot be determined with the information provided",
  "Alternatives A, B and C are correct",
  "Alternatives B, C and D are correct",
];

const toUpdate = [];

for (const q of questions) {
  let opts;
  try {
    opts = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
  } catch {
    skipped++;
    continue;
  }
  
  // Check if option E already exists
  const hasE = opts.some(o => o.id === "E" || o.id === "e");
  if (hasE) {
    skipped++;
    continue;
  }
  
  // Pick a distractor based on question id for variety
  const idx = q.id % distractorsPt.length;
  opts.push({
    id: "E",
    textPt: distractorsPt[idx],
    textEn: distractorsEn[idx],
  });
  
  toUpdate.push({ id: q.id, options: JSON.stringify(opts) });
}

console.log(`Questions to update: ${toUpdate.length}, already have E: ${skipped}`);

// Update in batches
for (let i = 0; i < toUpdate.length; i += BATCH) {
  const batch = toUpdate.slice(i, i + BATCH);
  for (const q of batch) {
    await conn.query("UPDATE questions SET options = ? WHERE id = ?", [q.options, q.id]);
  }
  console.log(`  Updated ${Math.min(i + BATCH, toUpdate.length)}/${toUpdate.length}...`);
}

console.log(`\n✅ Done! Added option E to ${toUpdate.length} questions.`);
await conn.end();
