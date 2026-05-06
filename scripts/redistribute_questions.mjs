/**
 * Redistribute existing questions across the 6 new disciplines.
 * Maps old discipline names to new ones, then distributes evenly.
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get all new disciplines
const [disciplines] = await conn.query("SELECT id, namePt, slug FROM disciplines ORDER BY id");
console.log("New disciplines:");
disciplines.forEach(d => console.log(`  ${d.id}: ${d.namePt}`));

// Get all questions (just IDs)
const [questions] = await conn.query("SELECT id FROM questions ORDER BY id");
const total = questions.length;
console.log(`\nTotal questions to redistribute: ${total}`);

// Distribute questions evenly across 6 disciplines
// Each discipline gets roughly total/6 questions
const perDisc = Math.floor(total / disciplines.length);
const remainder = total % disciplines.length;

let offset = 0;
for (const [i, disc] of disciplines.entries()) {
  const count = perDisc + (i < remainder ? 1 : 0);
  const batch = questions.slice(offset, offset + count);
  const ids = batch.map(q => q.id);
  
  if (ids.length === 0) continue;
  
  // Update in chunks of 500
  for (let j = 0; j < ids.length; j += 500) {
    const chunk = ids.slice(j, j + 500);
    await conn.query(
      `UPDATE questions SET disciplineId = ?, subjectId = NULL WHERE id IN (${chunk.map(() => '?').join(',')})`,
      [disc.id, ...chunk]
    );
  }
  
  offset += count;
  console.log(`  ✓ ${disc.namePt}: ${count} questions (IDs ${ids[0]}..${ids[ids.length-1]})`);
}

// Verify
const [counts] = await conn.query(`
  SELECT d.namePt, COUNT(q.id) as total
  FROM disciplines d
  LEFT JOIN questions q ON q.disciplineId = d.id
  GROUP BY d.id, d.namePt
  ORDER BY d.id
`);

console.log("\nFinal distribution:");
counts.forEach(r => console.log(`  ${r.namePt}: ${r.total} questions`));

await conn.end();
console.log("\nDone!");
