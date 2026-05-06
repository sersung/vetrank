import { createConnection } from 'mysql2/promise';
const conn = await createConnection(process.env.DATABASE_URL);

// Step 1: Fix any invalid questionType values before altering the enum
const [result] = await conn.execute(
  `UPDATE questions SET questionType = 'multiple_choice' WHERE questionType NOT IN ('multiple_choice','assertion_reason','discursive')`
);
console.log(`Fixed ${result.affectedRows} rows with invalid questionType values`);

// Step 2: Alter the enum to include all 10 new types
await conn.execute(`ALTER TABLE \`questions\` MODIFY COLUMN \`questionType\` enum('multiple_choice','assertion_reason','complex_multiple_choice','matching','true_false','ordering','cloze','clinical_case','image_analysis','interpretation','discursive') NOT NULL DEFAULT 'multiple_choice'`);
console.log('Altered questionType enum');

// Step 3: Add formatData column (skip if already exists)
try {
  await conn.execute(`ALTER TABLE \`questions\` ADD \`formatData\` json`);
  console.log('Added formatData column');
} catch (err) {
  if (err.code === 'ER_DUP_FIELDNAME') {
    console.log('formatData column already exists, skipping');
  } else {
    throw err;
  }
}

console.log('Migration 0004 applied successfully');
await conn.end();
