import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const raw = readFileSync("/home/ubuntu/generate_vet_questions_final6.json", "utf-8");
const data = JSON.parse(raw);

let totalInserted = 0;

for (const result of data.results) {
  const { subject_id, discipline_id, questions_json } = result.output;
  if (!questions_json) { console.log(`Subject ${subject_id}: no JSON`); continue; }

  let questions = [];
  try {
    const parsed = JSON.parse(questions_json);
    questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
  } catch (e) {
    const match = questions_json.match(/\[[\s\S]*\]/);
    if (match) { try { questions = JSON.parse(match[0]); } catch {} }
  }

  let inserted = 0;
  for (const q of questions) {
    const validOpts = ["A","B","C","D","E"];
    if (!validOpts.includes(q.correctOption) || !q.options || q.options.length !== 5) continue;
    const diff = ["easy","medium","hard"].includes(q.difficulty) ? q.difficulty : "medium";
    const opts = q.options.map(o => ({ id: o.id ?? o.label, textPt: o.textPt ?? "", textEn: o.textEn }));
    try {
      await conn.query(
        `INSERT INTO questions (disciplineId,subjectId,difficulty,textPt,textEn,options,correctOption,explanationPt,explanationEn,active,isPremium,questionType,status,createdAt,updatedAt)
         VALUES (?,?,?,?,?,?,?,?,?,1,0,'multiple_choice','approved',NOW(),NOW())`,
        [discipline_id, subject_id, diff, q.textPt, q.textEn||null, JSON.stringify(opts), q.correctOption, q.explanationPt||null, q.explanationEn||null]
      );
      inserted++; totalInserted++;
    } catch (e) { console.log(`  DB error: ${e.message}`); }
  }
  console.log(`Subject ${subject_id}: inserted ${inserted}/${questions.length}`);
}

const [[{total}]] = await conn.query("SELECT COUNT(*) as total FROM questions WHERE active=1");
console.log(`\nTotal active questions: ${total}`);

const [noQ] = await conn.query(`
  SELECT s.id, s.namePt FROM subjects s
  LEFT JOIN questions q ON q.subjectId=s.id AND q.active=1
  WHERE q.id IS NULL
`);
if (noQ.length === 0) console.log("All subjects now have questions!");
else { console.log(`Subjects still with 0 questions:`); noQ.forEach(s => console.log(`  [${s.id}] ${s.namePt}`)); }

await conn.end();
console.log("=== DONE ===");
