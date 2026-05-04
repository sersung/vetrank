import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) { console.error("No DATABASE_URL"); process.exit(1); }

const conn = await mysql.createConnection(url);

console.log("=== QUESTION DIAGNOSTICS ===\n");

// 1. Total questions
const [[{ total }]] = await conn.query("SELECT COUNT(*) as total FROM questions WHERE active = 1");
console.log(`Total active questions: ${total}`);

// 2. Questions with no options at all (all option columns NULL or empty)
const [[{ noOpts }]] = await conn.query(`
  SELECT COUNT(*) as noOpts FROM questions 
  WHERE active = 1
  AND (option_a_pt IS NULL OR option_a_pt = '')
  AND (option_a_en IS NULL OR option_a_en = '')
`);
console.log(`Questions with no option A (PT or EN): ${noOpts}`);

// 3. Questions with NULL or empty correctOption
const [[{ noCorrect }]] = await conn.query(`
  SELECT COUNT(*) as noCorrect FROM questions 
  WHERE active = 1
  AND (correct_option IS NULL OR correct_option = '')
`);
console.log(`Questions with NULL/empty correctOption: ${noCorrect}`);

// 4. Distinct correctOption values
const [correctVals] = await conn.query(`
  SELECT correct_option, COUNT(*) as cnt 
  FROM questions WHERE active = 1
  GROUP BY correct_option 
  ORDER BY cnt DESC
  LIMIT 20
`);
console.log("\nDistinct correctOption values:");
correctVals.forEach(r => console.log(`  "${r.correct_option}": ${r.cnt}`));

// 5. Questions where correctOption is not a valid option letter
const [[{ badCorrect }]] = await conn.query(`
  SELECT COUNT(*) as badCorrect FROM questions 
  WHERE active = 1
  AND correct_option NOT IN ('A','B','C','D','E','1','2','3','4','5')
  AND correct_option IS NOT NULL
  AND correct_option != ''
`);
console.log(`\nQuestions with non-standard correctOption: ${badCorrect}`);

// 6. Sample of non-standard correctOption values
const [samples] = await conn.query(`
  SELECT id, correct_option, question_type, 
    LEFT(text_pt, 60) as preview
  FROM questions 
  WHERE active = 1
  AND correct_option NOT IN ('A','B','C','D','E','1','2','3','4','5')
  AND correct_option IS NOT NULL
  AND correct_option != ''
  LIMIT 10
`);
if (samples.length > 0) {
  console.log("\nSample non-standard correctOption questions:");
  samples.forEach(r => console.log(`  id=${r.id} type=${r.question_type} correct="${r.correct_option}" | ${r.preview}`));
}

// 7. Questions with no option_a_pt AND no option_a_en (truly missing options)
const [missingOpts] = await conn.query(`
  SELECT id, question_type, correct_option,
    LEFT(text_pt, 80) as preview
  FROM questions 
  WHERE active = 1
  AND (option_a_pt IS NULL OR option_a_pt = '')
  AND (option_a_en IS NULL OR option_a_en = '')
  LIMIT 20
`);
console.log(`\nSample questions missing option A:`);
missingOpts.forEach(r => console.log(`  id=${r.id} type=${r.question_type} correct="${r.correct_option}" | ${r.preview}`));

// 8. Check option columns structure
const [cols] = await conn.query(`
  SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'questions'
  AND COLUMN_NAME LIKE 'option%'
  ORDER BY COLUMN_NAME
`);
console.log("\nOption columns in questions table:");
cols.forEach(c => console.log(`  ${c.COLUMN_NAME}`));

// 9. Check if question_options table exists (separate table approach)
const [tables] = await conn.query(`
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE '%option%'
`);
console.log("\nTables with 'option' in name:");
tables.forEach(t => console.log(`  ${t.TABLE_NAME}`));

await conn.end();
console.log("\n=== DONE ===");
