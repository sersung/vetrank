/**
 * Reseed VetRank disciplines and subjects with the official veterinary curriculum.
 * 6 major areas, 40 subjects.
 * Existing questions will be reassigned to the closest matching new discipline.
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(DB_URL);

// ── Curriculum definition ─────────────────────────────────────────────────────
const curriculum = [
  {
    namePt: "Ciências Biológicas e Ciclo Básico",
    nameEn: "Biological Sciences and Basic Cycle",
    slug: "ciencias-biologicas",
    color: "#10b981",
    icon: "🔬",
    subjects: [
      { namePt: "Anatomia Veterinária I e II (Sistêmica e Topográfica)", nameEn: "Veterinary Anatomy I & II (Systemic and Topographic)" },
      { namePt: "Biologia Celular e Molecular", nameEn: "Cell and Molecular Biology" },
      { namePt: "Histologia Veterinária (Geral e Especial)", nameEn: "Veterinary Histology (General and Special)" },
      { namePt: "Embriologia Veterinária", nameEn: "Veterinary Embryology" },
      { namePt: "Bioquímica Veterinária e Metabólica", nameEn: "Veterinary and Metabolic Biochemistry" },
      { namePt: "Biofísica Veterinária", nameEn: "Veterinary Biophysics" },
      { namePt: "Fisiologia Veterinária I e II", nameEn: "Veterinary Physiology I & II" },
      { namePt: "Genética e Evolução Animal", nameEn: "Animal Genetics and Evolution" },
      { namePt: "Bioestatística e Metodologia Científica", nameEn: "Biostatistics and Scientific Methodology" },
    ],
  },
  {
    namePt: "Patobiologia e Agentes Agressores",
    nameEn: "Pathobiology and Pathogenic Agents",
    slug: "patobiologia",
    color: "#f59e0b",
    icon: "🦠",
    subjects: [
      { namePt: "Microbiologia Veterinária (Bacteriologia e Virologia)", nameEn: "Veterinary Microbiology (Bacteriology and Virology)" },
      { namePt: "Imunologia Veterinária", nameEn: "Veterinary Immunology" },
      { namePt: "Parasitologia Veterinária", nameEn: "Veterinary Parasitology" },
      { namePt: "Patologia Geral e Técnicas de Necropsia", nameEn: "General Pathology and Necropsy Techniques" },
      { namePt: "Patologia Especial/Sistêmica Veterinária", nameEn: "Special/Systemic Veterinary Pathology" },
      { namePt: "Farmacologia e Terapêutica Veterinária", nameEn: "Veterinary Pharmacology and Therapeutics" },
      { namePt: "Toxicologia Veterinária", nameEn: "Veterinary Toxicology" },
    ],
  },
  {
    namePt: "Clínica, Cirurgia e Reprodução Animal",
    nameEn: "Clinical Medicine, Surgery and Animal Reproduction",
    slug: "clinica-cirurgia",
    color: "#3b82f6",
    icon: "🏥",
    subjects: [
      { namePt: "Semiologia Veterinária (Propedêutica)", nameEn: "Veterinary Semiology (Propaedeutics)" },
      { namePt: "Patologia Clínica Veterinária (Diagnóstico Laboratorial)", nameEn: "Veterinary Clinical Pathology (Laboratory Diagnosis)" },
      { namePt: "Diagnóstico por Imagem (Radiologia e Ultrassonografia)", nameEn: "Diagnostic Imaging (Radiology and Ultrasonography)" },
      { namePt: "Técnica Cirúrgica Veterinária", nameEn: "Veterinary Surgical Technique" },
      { namePt: "Anestesiologia Veterinária", nameEn: "Veterinary Anesthesiology" },
      { namePt: "Clínica Médica e Cirúrgica de Pequenos Animais (Cães e Gatos)", nameEn: "Small Animal Medicine and Surgery (Dogs and Cats)" },
      { namePt: "Clínica Médica e Cirúrgica de Ruminantes (Bovinos, Ovinos e Caprinos)", nameEn: "Ruminant Medicine and Surgery (Cattle, Sheep and Goats)" },
      { namePt: "Clínica Médica e Cirúrgica de Equídeos", nameEn: "Equine Medicine and Surgery" },
      { namePt: "Fisiopatologia da Reprodução (Macho e Fêmea)", nameEn: "Reproductive Physiopathology (Male and Female)" },
      { namePt: "Obstetrícia Veterinária e Biotecnologia da Reprodução", nameEn: "Veterinary Obstetrics and Reproductive Biotechnology" },
    ],
  },
  {
    namePt: "Medicina Preventiva, Saúde Pública e Inspeção",
    nameEn: "Preventive Medicine, Public Health and Inspection",
    slug: "medicina-preventiva",
    color: "#8b5cf6",
    icon: "🛡️",
    subjects: [
      { namePt: "Epidemiologia Veterinária", nameEn: "Veterinary Epidemiology" },
      { namePt: "Zoonoses e Saúde Pública", nameEn: "Zoonoses and Public Health" },
      { namePt: "Saneamento Ambiental e Planejamento em Saúde Animal", nameEn: "Environmental Sanitation and Animal Health Planning" },
      { namePt: "Inspeção de Produtos de Origem Animal (Carnes, Leite, Ovos, Pescado e Mel)", nameEn: "Inspection of Animal Products (Meat, Milk, Eggs, Fish and Honey)" },
      { namePt: "Tecnologia de Produtos de Origem Animal", nameEn: "Technology of Animal Products" },
      { namePt: "Higiene de Alimentos", nameEn: "Food Hygiene" },
    ],
  },
  {
    namePt: "Zootecnia e Produção Animal",
    nameEn: "Animal Science and Production",
    slug: "zootecnia",
    color: "#06b6d4",
    icon: "🐄",
    subjects: [
      { namePt: "Introdução à Zootecnia", nameEn: "Introduction to Animal Science" },
      { namePt: "Nutrição e Alimentação Animal", nameEn: "Animal Nutrition and Feeding" },
      { namePt: "Agrostologia e Forragicultura (Pastagens)", nameEn: "Agrostology and Forage Science (Pastures)" },
      { namePt: "Melhoramento Genético Animal", nameEn: "Animal Genetic Improvement" },
      { namePt: "Bovinocultura de Corte e de Leite", nameEn: "Beef and Dairy Cattle Production" },
      { namePt: "Avicultura, Suinocultura e Equideocultura", nameEn: "Poultry, Swine and Equine Production" },
      { namePt: "Aquicultura e Piscicultura", nameEn: "Aquaculture and Fish Farming" },
    ],
  },
  {
    namePt: "Ética, Humanidades e Áreas Complementares",
    nameEn: "Ethics, Humanities and Complementary Areas",
    slug: "etica-humanidades",
    color: "#ec4899",
    icon: "⚖️",
    subjects: [
      { namePt: "Deontologia, Ética e Bioética na Medicina Veterinária", nameEn: "Deontology, Ethics and Bioethics in Veterinary Medicine" },
      { namePt: "Bem-Estar Animal e Etologia", nameEn: "Animal Welfare and Ethology" },
      { namePt: "Medicina Veterinária Legal (Perícia)", nameEn: "Forensic Veterinary Medicine" },
      { namePt: "Administração e Planejamento Rural", nameEn: "Rural Administration and Planning" },
      { namePt: "Extensão Rural e Sociologia", nameEn: "Rural Extension and Sociology" },
      { namePt: "Medicina de Animais Selvagens e Pets Exóticos", nameEn: "Wildlife and Exotic Pet Medicine" },
    ],
  },
];

// ── Check current schema ──────────────────────────────────────────────────────
const [cols] = await conn.query("SHOW COLUMNS FROM disciplines");
const colNames = cols.map(c => c.Field);
console.log("Disciplines columns:", colNames.join(", "));

const hasSlug = colNames.includes("slug");
const hasColor = colNames.includes("color");
const hasIcon = colNames.includes("icon");

// Add missing columns if needed
if (!hasSlug) {
  await conn.query("ALTER TABLE disciplines ADD COLUMN slug VARCHAR(64) NULL");
  console.log("Added slug column");
}
if (!hasColor) {
  await conn.query("ALTER TABLE disciplines ADD COLUMN color VARCHAR(16) NULL");
  console.log("Added color column");
}
if (!hasIcon) {
  await conn.query("ALTER TABLE disciplines ADD COLUMN icon VARCHAR(8) NULL");
  console.log("Added icon column");
}

// ── Check subjects schema ─────────────────────────────────────────────────────
const [subCols] = await conn.query("SHOW COLUMNS FROM subjects");
const subColNames = subCols.map(c => c.Field);
const hasNameEn = subColNames.includes("nameEn");
if (!hasNameEn) {
  await conn.query("ALTER TABLE subjects ADD COLUMN nameEn TEXT NULL");
  console.log("Added nameEn column to subjects");
}

// ── Check disciplines schema for nameEn ──────────────────────────────────────
const hasDiscNameEn = colNames.includes("nameEn");
if (!hasDiscNameEn) {
  await conn.query("ALTER TABLE disciplines ADD COLUMN nameEn TEXT NULL");
  console.log("Added nameEn column to disciplines");
}

// ── Clear old data ────────────────────────────────────────────────────────────
console.log("\nClearing old disciplines and subjects...");
// Disable FK checks temporarily to allow clean delete
await conn.query("SET FOREIGN_KEY_CHECKS = 0");
await conn.query("UPDATE questions SET subjectId = 1 WHERE subjectId IS NOT NULL");
await conn.query("UPDATE questions SET disciplineId = 1 WHERE disciplineId IS NOT NULL");
await conn.query("DELETE FROM subjects");
await conn.query("DELETE FROM disciplines");
await conn.query("SET FOREIGN_KEY_CHECKS = 1");
console.log("Old data cleared.");

// ── Insert new curriculum ─────────────────────────────────────────────────────
let totalSubjects = 0;
const disciplineIdMap = {}; // slug -> id

for (const [idx, disc] of curriculum.entries()) {
  const [result] = await conn.query(
    `INSERT INTO disciplines (namePt, nameEn, slug, color, icon, active, createdAt)
     VALUES (?, ?, ?, ?, ?, 1, NOW())`,
    [disc.namePt, disc.nameEn, disc.slug, disc.color, disc.icon]
  );
  const discId = result.insertId;
  disciplineIdMap[disc.slug] = discId;
  console.log(`\n[${idx + 1}/6] Inserted discipline: ${disc.namePt} (id=${discId})`);

  for (const [si, subj] of disc.subjects.entries()) {
    // generate a slug from the PT name
    const slug = subj.namePt.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 64);
    await conn.query(
      `INSERT INTO subjects (disciplineId, namePt, nameEn, slug, active, createdAt)
       VALUES (?, ?, ?, ?, 1, NOW())`,
      [discId, subj.namePt, subj.nameEn, slug]
    );
    totalSubjects++;
    console.log(`  ✓ ${subj.namePt}`);
  }
}

console.log(`\n✅ Inserted 6 disciplines and ${totalSubjects} subjects.`);

// ── Reassign existing questions to the new "Clínica, Cirurgia e Reprodução" discipline ──
// (best general match for the old mixed questions)
const clinicaId = disciplineIdMap["clinica-cirurgia"];
const [updateResult] = await conn.query(
  "UPDATE questions SET disciplineId = ?, subjectId = NULL WHERE disciplineId IS NULL",
  [clinicaId]
);
console.log(`\nReassigned ${updateResult.affectedRows} unassigned questions to Clínica, Cirurgia e Reprodução.`);

// Show final counts
const [discCount] = await conn.query("SELECT COUNT(*) as n FROM disciplines");
const [subjCount] = await conn.query("SELECT COUNT(*) as n FROM subjects");
const [qCount] = await conn.query("SELECT COUNT(*) as n FROM questions");
console.log(`\nFinal DB state:`);
console.log(`  Disciplines: ${discCount[0].n}`);
console.log(`  Subjects: ${subjCount[0].n}`);
console.log(`  Questions: ${qCount[0].n}`);

await conn.end();
console.log("\nDone!");
