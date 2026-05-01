/**
 * VetRank — Bulk Question Generator
 * Uses Gemini 2.5 Flash to generate 5,000 veterinary questions
 * organized by discipline and subject, then saves them as JSON.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../data");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY not set");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ── Discipline & Subject Map ─────────────────────────────────────────────────
const DISCIPLINES = [
  {
    slug: "pharmacology",
    namePt: "Farmacologia",
    nameEn: "Pharmacology",
    subjects: [
      { slug: "pharmacokinetics", namePt: "Farmacocinética", nameEn: "Pharmacokinetics" },
      { slug: "pharmacodynamics", namePt: "Farmacodinâmica", nameEn: "Pharmacodynamics" },
      { slug: "antibiotics", namePt: "Antibióticos e Antimicrobianos", nameEn: "Antibiotics and Antimicrobials" },
      { slug: "antiparasitics", namePt: "Antiparasitários", nameEn: "Antiparasitics" },
      { slug: "analgesics", namePt: "Analgésicos e Anti-inflamatórios", nameEn: "Analgesics and Anti-inflammatories" },
      { slug: "hormones", namePt: "Hormônios e Endocrinologia Farmacológica", nameEn: "Hormones and Pharmacological Endocrinology" },
      { slug: "cardiovascular_drugs", namePt: "Fármacos Cardiovasculares", nameEn: "Cardiovascular Drugs" },
      { slug: "toxicology", namePt: "Toxicologia Veterinária", nameEn: "Veterinary Toxicology" },
    ],
  },
  {
    slug: "clinics",
    namePt: "Clínica Veterinária",
    nameEn: "Veterinary Clinics",
    subjects: [
      { slug: "internal_medicine_dogs", namePt: "Clínica Médica de Cães", nameEn: "Internal Medicine — Dogs" },
      { slug: "internal_medicine_cats", namePt: "Clínica Médica de Gatos", nameEn: "Internal Medicine — Cats" },
      { slug: "dermatology", namePt: "Dermatologia Veterinária", nameEn: "Veterinary Dermatology" },
      { slug: "cardiology", namePt: "Cardiologia Veterinária", nameEn: "Veterinary Cardiology" },
      { slug: "gastroenterology", namePt: "Gastroenterologia Veterinária", nameEn: "Veterinary Gastroenterology" },
      { slug: "nephrology", namePt: "Nefrologia e Urologia Veterinária", nameEn: "Veterinary Nephrology and Urology" },
      { slug: "neurology", namePt: "Neurologia Veterinária", nameEn: "Veterinary Neurology" },
      { slug: "oncology", namePt: "Oncologia Veterinária", nameEn: "Veterinary Oncology" },
      { slug: "infectious_diseases", namePt: "Doenças Infecciosas", nameEn: "Infectious Diseases" },
      { slug: "parasitology", namePt: "Parasitologia Clínica", nameEn: "Clinical Parasitology" },
    ],
  },
  {
    slug: "herpetology",
    namePt: "Herpetologia",
    nameEn: "Herpetology",
    subjects: [
      { slug: "reptile_anatomy", namePt: "Anatomia de Répteis", nameEn: "Reptile Anatomy" },
      { slug: "reptile_nutrition", namePt: "Nutrição de Répteis", nameEn: "Reptile Nutrition" },
      { slug: "reptile_diseases", namePt: "Doenças Comuns em Répteis", nameEn: "Common Reptile Diseases" },
      { slug: "reptile_anesthesia", namePt: "Anestesia em Répteis", nameEn: "Reptile Anesthesia" },
      { slug: "amphibians", namePt: "Anfíbios — Biologia e Clínica", nameEn: "Amphibians — Biology and Clinics" },
      { slug: "chelonians", namePt: "Quelônios — Tartarugas e Jabutis", nameEn: "Chelonians — Turtles and Tortoises" },
      { slug: "lizards_snakes", namePt: "Lagartos e Serpentes", nameEn: "Lizards and Snakes" },
    ],
  },
  {
    slug: "ornithology",
    namePt: "Ornitologia",
    nameEn: "Ornithology",
    subjects: [
      { slug: "bird_anatomy", namePt: "Anatomia de Aves", nameEn: "Bird Anatomy" },
      { slug: "bird_nutrition", namePt: "Nutrição de Aves", nameEn: "Bird Nutrition" },
      { slug: "bird_diseases", namePt: "Doenças Aviárias", nameEn: "Avian Diseases" },
      { slug: "psittacines", namePt: "Psitacídeos — Papagaios e Araras", nameEn: "Psittacines — Parrots and Macaws" },
      { slug: "raptors", namePt: "Aves de Rapina", nameEn: "Raptors" },
      { slug: "poultry", namePt: "Avicultura e Aves de Produção", nameEn: "Poultry and Production Birds" },
      { slug: "bird_reproduction", namePt: "Reprodução em Aves", nameEn: "Bird Reproduction" },
    ],
  },
  {
    slug: "anesthesiology",
    namePt: "Anestesiologia",
    nameEn: "Anesthesiology",
    subjects: [
      { slug: "premedication", namePt: "Medicação Pré-Anestésica (MPA)", nameEn: "Pre-Anesthetic Medication" },
      { slug: "inhalation_anesthesia", namePt: "Anestesia Inalatória", nameEn: "Inhalation Anesthesia" },
      { slug: "injectable_anesthesia", namePt: "Anestesia Injetável", nameEn: "Injectable Anesthesia" },
      { slug: "local_anesthesia", namePt: "Anestesia Local e Regional", nameEn: "Local and Regional Anesthesia" },
      { slug: "monitoring", namePt: "Monitoração Anestésica", nameEn: "Anesthetic Monitoring" },
      { slug: "analgesia", namePt: "Analgesia Peri-operatória", nameEn: "Perioperative Analgesia" },
      { slug: "complications", namePt: "Complicações Anestésicas", nameEn: "Anesthetic Complications" },
      { slug: "exotic_anesthesia", namePt: "Anestesia em Animais Exóticos", nameEn: "Exotic Animal Anesthesia" },
    ],
  },
  {
    slug: "small-mammals",
    namePt: "Pequenos Mamíferos",
    nameEn: "Small Mammals",
    subjects: [
      { slug: "rabbit_medicine", namePt: "Clínica de Coelhos", nameEn: "Rabbit Medicine" },
      { slug: "ferret_medicine", namePt: "Clínica de Furões", nameEn: "Ferret Medicine" },
      { slug: "guinea_pig", namePt: "Porquinhos-da-Índia e Roedores", nameEn: "Guinea Pigs and Rodents" },
      { slug: "hamster_gerbil", namePt: "Hamsters e Gerbils", nameEn: "Hamsters and Gerbils" },
      { slug: "hedgehog", namePt: "Ouriços e Outros Insetívoros", nameEn: "Hedgehogs and Other Insectivores" },
      { slug: "small_mammal_nutrition", namePt: "Nutrição de Pequenos Mamíferos", nameEn: "Small Mammal Nutrition" },
      { slug: "small_mammal_diseases", namePt: "Doenças Comuns em Pequenos Mamíferos", nameEn: "Common Small Mammal Diseases" },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generateBatch(discipline, subject, difficulty, count, retries = 3) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction:
      "You are a Brazilian veterinary medicine professor creating multiple-choice exam questions. Respond ONLY with valid JSON array, no markdown, no code blocks, no extra text.",
  });

  const prompt = `Generate exactly ${count} multiple-choice veterinary medicine questions about "${subject.nameEn}" within the discipline of "${discipline.nameEn}". Difficulty: ${difficulty}.

Each question must be unique, clinically relevant, and test real veterinary knowledge.

Return ONLY a valid JSON array (no markdown, no code blocks):
[
  {
    "textPt": "Pergunta em português brasileiro",
    "textEn": "Question in English",
    "options": [
      {"id": "A", "textPt": "Opção A em português", "textEn": "Option A in English"},
      {"id": "B", "textPt": "Opção B em português", "textEn": "Option B in English"},
      {"id": "C", "textPt": "Opção C em português", "textEn": "Option C in English"},
      {"id": "D", "textPt": "Opção D em português", "textEn": "Option D in English"}
    ],
    "correctOption": "A",
    "explanationPt": "Explicação detalhada em português",
    "explanationEn": "Detailed explanation in English"
  }
]`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("Not an array");
      return parsed.slice(0, count);
    } catch (err) {
      console.warn(`  Attempt ${attempt}/${retries} failed for ${discipline.slug}/${subject.slug}/${difficulty}: ${err.message.slice(0, 80)}`);
      if (attempt < retries) await sleep(2000 * attempt);
    }
  }
  return [];
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🐾 VetRank Question Generator — Gemini 2.5 Flash");
  console.log("Target: 5,000 questions across 6 disciplines\n");

  const allQuestions = [];
  const DIFFICULTIES = ["easy", "medium", "hard"];

  // Questions per subject per difficulty — tuned to hit ~5000 total
  // 6 disciplines × avg 7.5 subjects × 3 difficulties × 11 questions ≈ 4,950
  const QS_PER_BATCH = 11;

  let total = 0;
  const startTime = Date.now();

  for (const discipline of DISCIPLINES) {
    console.log(`\n📚 ${discipline.namePt} (${discipline.subjects.length} subjects)`);

    for (const subject of discipline.subjects) {
      // Run 3 difficulty levels concurrently per subject
      const batches = await Promise.all(
        DIFFICULTIES.map((diff) => generateBatch(discipline, subject, diff, QS_PER_BATCH))
      );

      for (let i = 0; i < DIFFICULTIES.length; i++) {
        const questions = batches[i];
        for (const q of questions) {
          allQuestions.push({
            disciplineSlug: discipline.slug,
            disciplineNamePt: discipline.namePt,
            disciplineNameEn: discipline.nameEn,
            subjectSlug: subject.slug,
            subjectNamePt: subject.namePt,
            subjectNameEn: subject.nameEn,
            difficulty: DIFFICULTIES[i],
            year: 2024,
            isPremium: DIFFICULTIES[i] === "hard",
            ...q,
          });
        }
        total += questions.length;
      }

      process.stdout.write(`  ✓ ${subject.namePt}: ${batches.reduce((s, b) => s + b.length, 0)} questions (total: ${total})\n`);

      // Small delay between subjects to avoid rate limiting
      await sleep(500);
    }

    // Save progress after each discipline
    const progressFile = path.join(OUTPUT_DIR, `questions_${discipline.slug}.json`);
    const disciplineQuestions = allQuestions.filter((q) => q.disciplineSlug === discipline.slug);
    fs.writeFileSync(progressFile, JSON.stringify(disciplineQuestions, null, 2));
    console.log(`  💾 Saved ${disciplineQuestions.length} questions to ${progressFile}`);
  }

  // Save full dataset
  const fullFile = path.join(OUTPUT_DIR, "questions_all.json");
  fs.writeFileSync(fullFile, JSON.stringify(allQuestions, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n✅ Done! Generated ${allQuestions.length} questions in ${elapsed} minutes`);
  console.log(`📁 Saved to: ${fullFile}`);
}

main().catch(console.error);
