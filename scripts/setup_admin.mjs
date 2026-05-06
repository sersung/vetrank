/**
 * Set up admin account for ascalefi@gmail.com.
 * Creates or updates the user record with role=admin.
 * Since the platform uses Manus OAuth, we store the email and mark as admin.
 * The user will log in via OAuth and be recognized as admin by email match.
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const ADMIN_EMAIL = "ascalefi@gmail.com";
const ADMIN_NAME = "Administrador VetRank";

// Check if user already exists
const [existing] = await conn.query(
  "SELECT id, email, role FROM users WHERE email = ?",
  [ADMIN_EMAIL]
);

if (existing.length > 0) {
  // Update existing user to admin
  await conn.query(
    "UPDATE users SET role = 'admin', name = ? WHERE email = ?",
    [ADMIN_NAME, ADMIN_EMAIL]
  );
  console.log(`✅ Updated existing user ${ADMIN_EMAIL} to role=admin (id=${existing[0].id})`);
} else {
  // Create a placeholder admin user (will be linked when they first OAuth login)
  // We use a special openId that will be matched on login
  const openId = `admin_${ADMIN_EMAIL.replace(/[^a-z0-9]/gi, '_')}`;
  await conn.query(
    `INSERT INTO users (openId, email, name, role, plan, xp, level, streak, totalExams, totalQuestions, totalCorrect, lastSignedIn, createdAt, updatedAt)
     VALUES (?, ?, ?, 'admin', 'premium', 0, 1, 0, 0, 0, 0, NOW(), NOW(), NOW())`,
    [openId, ADMIN_EMAIL, ADMIN_NAME]
  );
  console.log(`✅ Created admin user for ${ADMIN_EMAIL}`);
}

// Verify
const [result] = await conn.query(
  "SELECT id, email, name, role, plan FROM users WHERE email = ?",
  [ADMIN_EMAIL]
);
console.log("\nAdmin user record:", result[0]);

// Also check if there's an env-based owner that should be admin
const [allAdmins] = await conn.query("SELECT id, email, name, role FROM users WHERE role = 'admin'");
console.log(`\nAll admin users (${allAdmins.length}):`);
allAdmins.forEach(u => console.log(`  - ${u.email || 'no email'} (${u.name || 'no name'}) id=${u.id}`));

await conn.end();
console.log("\nDone!");
