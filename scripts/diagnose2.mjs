import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Options count distribution
const [optCounts] = await conn.query(
  "SELECT JSON_LENGTH(options) as optCount, COUNT(*) as cnt FROM questions WHERE active=1 GROUP BY optCount ORDER BY optCount"
);
console.log("Options count distribution:");
optCounts.forEach((r) => console.log(`  ${r.optCount} options: ${r.cnt} questions`));

// 2. Questions with fewer than 5 options
const [fewOpts] = await conn.query(
  "SELECT id, JSON_LENGTH(options) as optCount, correctOption, LEFT(textPt,80) as preview FROM questions WHERE active=1 AND JSON_LENGTH(options) < 5 LIMIT 20"
);
console.log("\nSample questions with < 5 options:");
fewOpts.forEach((r) =>
  console.log(`  id=${r.id} opts=${r.optCount} correct=${r.correctOption} | ${r.preview}`)
);

// 3. correctOption E count
const [[{ eCount }]] = await conn.query(
  "SELECT COUNT(*) as eCount FROM questions WHERE active=1 AND correctOption = 'E'"
);
console.log("\nQuestions with correctOption E:", eCount);

// 4. correctOption D count
const [[{ dCount }]] = await conn.query(
  "SELECT COUNT(*) as dCount FROM questions WHERE active=1 AND correctOption = 'D'"
);
console.log("Questions with correctOption D:", dCount);

// 5. Check a question with only 4 options to see what's missing
if (fewOpts.length > 0) {
  const sampleId = fewOpts[0].id;
  const [[sample]] = await conn.query(
    "SELECT id, options, correctOption, textPt FROM questions WHERE id = ?",
    [sampleId]
  );
  console.log("\nFull sample of question with few options:");
  console.log("  id:", sample.id);
  console.log("  correctOption:", sample.correctOption);
  console.log("  options:", JSON.stringify(sample.options, null, 2));
  console.log("  textPt:", sample.textPt?.substring(0, 200));
}

// 6. Check disciplines distribution
const [discDist] = await conn.query(`
  SELECT d.namePt, COUNT(q.id) as cnt
  FROM questions q
  JOIN disciplines d ON q.disciplineId = d.id
  WHERE q.active = 1
  GROUP BY d.id, d.namePt
  ORDER BY cnt DESC
  LIMIT 20
`);
console.log("\nTop 20 disciplines by question count:");
discDist.forEach((r) => console.log(`  ${r.namePt}: ${r.cnt}`));

// 7. Disciplines with 0 questions
const [emptyDisc] = await conn.query(`
  SELECT d.id, d.namePt
  FROM disciplines d
  LEFT JOIN questions q ON q.disciplineId = d.id AND q.active = 1
  WHERE q.id IS NULL
  ORDER BY d.namePt
`);
console.log(`\nDisciplines with 0 questions (${emptyDisc.length} total):`);
emptyDisc.forEach((r) => console.log(`  [${r.id}] ${r.namePt}`));

// 8. Total disciplines
const [[{ totalDisc }]] = await conn.query("SELECT COUNT(*) as totalDisc FROM disciplines");
console.log("\nTotal disciplines:", totalDisc);

await conn.end();
console.log("\n=== DONE ===");
