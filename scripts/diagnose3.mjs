import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check a sample of questions with correctOption D to see if they have option D
const [dSamples] = await conn.query(
  "SELECT id, options, correctOption FROM questions WHERE active=1 AND correctOption='D' LIMIT 3"
);
console.log("Sample questions with correctOption D:");
dSamples.forEach((r) => {
  const opts = r.options;
  const labels = Array.isArray(opts) ? opts.map((o) => o.label) : [];
  console.log(`  id=${r.id} labels=[${labels.join(",")}] correct=${r.correctOption} hasD=${labels.includes("D")}`);
});

// Check a sample of questions with correctOption A to see their options
const [aSamples] = await conn.query(
  "SELECT id, options, correctOption FROM questions WHERE active=1 AND correctOption='A' LIMIT 3"
);
console.log("\nSample questions with correctOption A:");
aSamples.forEach((r) => {
  const opts = r.options;
  const labels = Array.isArray(opts) ? opts.map((o) => o.label) : [];
  console.log(`  id=${r.id} labels=[${labels.join(",")}] correct=${r.correctOption} hasA=${labels.includes("A")}`);
  if (opts && opts.length > 0) {
    console.log("    First option:", JSON.stringify(opts[0]));
  }
});

// Check the disciplines table structure
const [disciplines] = await conn.query("SELECT id, namePt, nameEn FROM disciplines ORDER BY id");
console.log("\nAll disciplines:");
disciplines.forEach((d) => console.log(`  [${d.id}] ${d.namePt}`));

// Check subjects
const [subjects] = await conn.query("SELECT id, disciplineId, namePt FROM subjects ORDER BY disciplineId, id LIMIT 30");
console.log("\nFirst 30 subjects:");
subjects.forEach((s) => console.log(`  [${s.id}] disciplineId=${s.disciplineId} ${s.namePt}`));

// Check total subjects
const [[{ totalSubj }]] = await conn.query("SELECT COUNT(*) as totalSubj FROM subjects");
console.log("\nTotal subjects:", totalSubj);

// Check if there are questions with subjects that don't exist
const [orphanSubj] = await conn.query(`
  SELECT COUNT(*) as cnt FROM questions q
  LEFT JOIN subjects s ON q.subjectId = s.id
  WHERE q.active=1 AND q.subjectId IS NOT NULL AND s.id IS NULL
`);
console.log("Questions with orphan subjectId:", orphanSubj[0].cnt);

// Check the QuestionRenderer to understand what it expects
// Check how options are passed from getQuestionById
const [[sampleQ]] = await conn.query("SELECT * FROM questions WHERE active=1 LIMIT 1");
console.log("\nSample question raw from DB:");
console.log("  id:", sampleQ.id);
console.log("  correctOption:", sampleQ.correctOption);
console.log("  options type:", typeof sampleQ.options);
console.log("  options (first 2):", JSON.stringify(sampleQ.options?.slice(0,2)));

await conn.end();
console.log("\n=== DONE ===");
