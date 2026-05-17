/**
 * VetRank — Database Export Script
 *
 * Uso:
 *   DATABASE_URL=mysql://user:pass@host:3306/dbname node scripts/export-db.mjs
 *
 * Gera: vetrank-backup-YYYY-MM-DD.sql
 */

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL não definida.");
  console.error("    Uso: DATABASE_URL=mysql://... node scripts/export-db.mjs");
  process.exit(1);
}

// ── Parse connection string ──────────────────────────────────────────────────
function parseUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || "3306"),
    user: u.username,
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    ssl: u.searchParams.get("ssl") === "true" ? { rejectUnauthorized: false } : undefined,
  };
}

// ── Escape helpers ───────────────────────────────────────────────────────────
function escapeId(name) {
  return "`" + name.replace(/`/g, "``") + "`";
}

function escapeVal(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "1" : "0";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
  if (Buffer.isBuffer(val)) return `X'${val.toString("hex")}'`;
  // Escape string
  const str = String(val)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\0/g, "\\0");
  return `'${str}'`;
}

// ── Main export ──────────────────────────────────────────────────────────────
async function exportDatabase() {
  const config = parseUrl(DATABASE_URL);
  console.log(`\n🔌  Conectando a ${config.host}:${config.port}/${config.database}...`);

  const conn = await mysql.createConnection({ ...config, multipleStatements: true });
  console.log("✅  Conectado.");

  const date = new Date().toISOString().slice(0, 10);
  const outputFile = `vetrank-backup-${date}.sql`;
  const out = fs.createWriteStream(outputFile);

  const write = (line) => out.write(line + "\n");

  // ── Header ─────────────────────────────────────────────────────────────────
  write(`-- VetRank Database Backup`);
  write(`-- Gerado em: ${new Date().toISOString()}`);
  write(`-- Banco: ${config.database} @ ${config.host}`);
  write(`-- =============================================`);
  write("");
  write("SET FOREIGN_KEY_CHECKS = 0;");
  write("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';");
  write("SET NAMES utf8mb4;");
  write("");

  // ── List tables ───────────────────────────────────────────────────────────
  const [tables] = await conn.query("SHOW TABLES");
  const tableKey = Object.keys(tables[0])[0];
  const tableNames = tables.map((r) => r[tableKey]);

  console.log(`\n📋  Tabelas encontradas (${tableNames.length}):`);
  tableNames.forEach((t) => console.log(`    • ${t}`));

  // ── Export each table ─────────────────────────────────────────────────────
  for (const tableName of tableNames) {
    console.log(`\n⏳  Exportando: ${tableName}...`);

    // DROP + CREATE
    const [[createResult]] = await conn.query(`SHOW CREATE TABLE ${escapeId(tableName)}`);
    const createSql = createResult["Create Table"];

    write(`-- ─────────────────────────────────────────────`);
    write(`-- Tabela: ${tableName}`);
    write(`-- ─────────────────────────────────────────────`);
    write(`DROP TABLE IF EXISTS ${escapeId(tableName)};`);
    write(`${createSql};`);
    write("");

    // Count rows
    const [[countRow]] = await conn.query(`SELECT COUNT(*) as cnt FROM ${escapeId(tableName)}`);
    const total = Number(countRow.cnt);

    if (total === 0) {
      write(`-- (tabela vazia)`);
      write("");
      console.log(`    0 linhas`);
      continue;
    }

    // Paginated export (1000 rows per batch)
    const batchSize = 1000;
    let exported = 0;

    while (exported < total) {
      const [rows] = await conn.query(
        `SELECT * FROM ${escapeId(tableName)} LIMIT ${batchSize} OFFSET ${exported}`
      );

      if (rows.length === 0) break;

      const cols = Object.keys(rows[0]).map(escapeId).join(", ");

      write(`INSERT INTO ${escapeId(tableName)} (${cols}) VALUES`);
      const valueLines = rows.map((row) => {
        const vals = Object.values(row).map(escapeVal).join(", ");
        return `  (${vals})`;
      });
      write(valueLines.join(",\n") + ";");
      write("");

      exported += rows.length;
      process.stdout.write(`    ${exported}/${total} linhas\r`);
    }

    console.log(`    ✅  ${exported} linhas exportadas`);
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  write("SET FOREIGN_KEY_CHECKS = 1;");
  write("");
  write(`-- Backup concluído: ${new Date().toISOString()}`);

  await new Promise((resolve) => out.end(resolve));
  await conn.end();

  const stats = fs.statSync(outputFile);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log(`\n🎉  Exportação concluída!`);
  console.log(`    Arquivo: ${outputFile}`);
  console.log(`    Tamanho: ${sizeMB} MB`);
  console.log(`    Tabelas: ${tableNames.length}`);
  console.log("");
}

exportDatabase().catch((err) => {
  console.error("\n❌  Erro durante exportação:", err.message);
  process.exit(1);
});
