/**
 * VetRank — Fast Parallel Question Generator
 * Generates remaining questions to reach 5,000 total using concurrent API calls
 * Uses gemini-2.5-flash with controlled concurrency to respect rate limits
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../data");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) { console.error("GEMINI_API_KEY not set"); process.exit(1); }

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DISCIPLINES = [
  { slug: "pharmacology", namePt: "Farmacologia", nameEn: "Pharmacology",
    subjects: [
      { slug: "pharmacokinetics", namePt: "Farmacocinética", nameEn: "Pharmacokinetics" },
      { slug: "pharmacodynamics", namePt: "Farmacodinâmica", nameEn: "Pharmacodynamics" },
      { slug: "antibiotics", namePt: "Antibióticos e Antimicrobianos", nameEn: "Antibiotics and Antimicrobials" },
      { slug: "antiparasitics", namePt: "Antiparasitários", nameEn: "Antiparasitics" },
      { slug: "analgesics", namePt: "Analgésicos e Anti-inflamatórios", nameEn: "Analgesics and Anti-inflammatories" },
      { slug: "hormones", namePt: "Hormônios e Endocrinologia Farmacológica", nameEn: "Hormones and Pharmacological Endocrinology" },
      { slug: "cardiovascular_drugs", namePt: "Fármacos Cardiovasculares", nameEn: "Cardiovascular Drugs" },
      { slug: "toxicology", namePt: "Toxicologia Veterinária", nameEn: "Veterinary Toxicology" },
    ]},
  { slug: "clinics", namePt: "Clínica Veterinária", nameEn: "Veterinary Clinics",
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
    ]},
  { slug: "herpetology", namePt: "Herpetologia", nameEn: "Herpetology",
    subjects: [
      { slug: "reptile_anatomy", namePt: "Anatomia de Répteis", nameEn: "Reptile Anatomy" },
      { slug: "reptile_nutrition", namePt: "Nutrição de Répteis", nameEn: "Reptile Nutrition" },
      { slug: "reptile_diseases", namePt: "Doenças Comuns em Répteis", nameEn: "Common Reptile Diseases" },
      { slug: "reptile_anesthesia", namePt: "Anestesia em Répteis", nameEn: "Reptile Anesthesia" },
      { slug: "amphibians", namePt: "Anfíbios — Biologia e Clínica", nameEn: "Amphibians — Biology and Clinics" },
      { slug: "chelonians", namePt: "Quelônios — Tartarugas e Jabutis", nameEn: "Chelonians — Turtles and Tortoises" },
      { slug: "lizards_snakes", namePt: "Lagartos e Serpentes", nameEn: "Lizards and Snakes" },
    ]},
  { slug: "ornithology", namePt: "Ornitologia", nameEn: "Ornithology",
    subjects: [
      { slug: "bird_anatomy", namePt: "Anatomia de Aves", nameEn: "Bird Anatomy" },
      { slug: "bird_nutrition", namePt: "Nutrição de Aves", nameEn: "Bird Nutrition" },
      { slug: "bird_diseases", namePt: "Doenças Aviárias", nameEn: "Avian Diseases" },
      { slug: "psittacines", namePt: "Psitacídeos — Papagaios e Araras", nameEn: "Psittacines — Parrots and Macaws" },
      { slug: "raptors", namePt: "Aves de Rapina", nameEn: "Raptors" },
      { slug: "poultry", namePt: "Avicultura e Aves de Produção", nameEn: "Poultry and Production Birds" },
      { slug: "bird_reproduction", namePt: "Reprodução em Aves", nameEn: "Bird Reproduction" },
    ]},
  { slug: "anesthesiology", namePt: "Anestesiologia", nameEn: "Anesthesiology",
    subjects: [
      { slug: "premedication", namePt: "Medicação Pré-Anestésica (MPA)", nameEn: "Pre-Anesthetic Medication" },
      { slug: "inhalation_anesthesia", namePt: "Anestesia Inalatória", nameEn: "Inhalation Anesthesia" },
      { slug: "injectable_anesthesia", namePt: "Anestesia Injetável", nameEn: "Injectable Anesthesia" },
      { slug: "local_anesthesia", namePt: "Anestesia Local e Regional", nameEn: "Local and Regional Anesthesia" },
      { slug: "monitoring", namePt: "Monitoração Anestésica", nameEn: "Anesthetic Monitoring" },
      { slug: "analgesia", namePt: "Analgesia Peri-operatória", nameEn: "Perioperative Analgesia" },
      { slug: "complications", namePt: "Complicações Anestésicas", nameEn: "Anesthetic Complications" },
      { slug: "exotic_anesthesia", namePt: "Anestesia em Animais Exóticos", nameEn: "Exotic Animal Anesthesia" },
    ]},
  { slug: "small-mammals", namePt: "Pequenos Mamíferos", nameEn: "Small Mammals",
    subjects: [
      { slug: "rabbit_medicine", namePt: "Clínica de Coelhos", nameEn: "Rabbit Medicine" },
      { slug: "ferret_medicine", namePt: "Clínica de Furões", nameEn: "Ferret Medicine" },
      { slug: "guinea_pig", namePt: "Porquinhos-da-Índia e Roedores", nameEn: "Guinea Pigs and Rodents" },
      { slug: "hamster_gerbil", namePt: "Hamsters e Gerbils", nameEn: "Hamsters and Gerbils" },
      { slug: "hedgehog", namePt: "Ouriços e Outros Insetívoros", nameEn: "Hedgehogs and Other Insectivores" },
      { slug: "small_mammal_nutrition", namePt: "Nutrição de Pequenos Mamíferos", nameEn: "Small Mammal Nutrition" },
      { slug: "small_mammal_diseases", namePt: "Doenças Comuns em Pequenos Mamíferos", nameEn: "Common Small Mammal Diseases" },
    ]},
];

const DIFFICULTIES = ["easy", "medium", "hard"];
const TARGET_TOTAL = 5000;
const CONCURRENCY = 5; // parallel API calls
const QS_PER_CALL = 15; // questions per API call

async function generateBatch(discipline, subject, difficulty, count, round) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: "You are a Brazilian veterinary medicine professor. Respond ONLY with a valid JSON array, no markdown, no code blocks, no extra text.",
  });

  const prompt = `Generate exactly ${count} multiple-choice veterinary questions about "${subject.nameEn}" (${discipline.nameEn}). Difficulty: ${difficulty}. Round ${round} - make these UNIQUE and DIFFERENT.

Return ONLY a JSON array (no markdown):
[{"textPt":"question in Portuguese","textEn":"question in English","options":[{"id":"A","textPt":"option A PT","textEn":"option A EN"},{"id":"B","textPt":"option B PT","textEn":"option B EN"},{"id":"C","textPt":"option C PT","textEn":"option C EN"},{"id":"D","textPt":"option D PT","textEn":"option D EN"}],"correctOption":"A","explanationPt":"explanation in Portuguese","explanationEn":"explanation in English"}]`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      // Strip any markdown code blocks
      text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      // Find the JSON array
      const start = text.indexOf("[");
      const end = text.lastIndexOf("]");
      if (start === -1 || end === -1) throw new Error("No array found");
      text = text.slice(start, end + 1);
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Empty array");
      return parsed.slice(0, count);
    } catch (err) {
      if (attempt < 3) await sleep(2000 * attempt);
    }
  }
  return [];
}

// Semaphore for concurrency control
class Semaphore {
  constructor(max) { this.max = max; this.count = 0; this.queue = []; }
  async acquire() {
    if (this.count < this.max) { this.count++; return; }
    await new Promise(resolve => this.queue.push(resolve));
    this.count++;
  }
  release() {
    this.count--;
    if (this.queue.length > 0) { const next = this.queue.shift(); next(); }
  }
}

async function main() {
  // Load existing questions
  const allFile = path.join(DATA_DIR, "questions_all.json");
  let existing = [];
  if (fs.existsSync(allFile)) {
    existing = JSON.parse(fs.readFileSync(allFile, "utf8"));
  }
  
  const currentTotal = existing.length;
  const needed = TARGET_TOTAL - currentTotal;
  console.log(`🐾 VetRank Fast Question Generator`);
  console.log(`Current: ${currentTotal} | Target: ${TARGET_TOTAL} | Need: ${needed}\n`);

  if (needed <= 0) {
    console.log("✅ Already at target!");
    return;
  }

  // Calculate how many rounds needed
  // Each round: 47 subjects × 3 difficulties × QS_PER_CALL = ~2,115 questions
  const questionsPerRound = DISCIPLINES.reduce((s, d) => s + d.subjects.length, 0) * 3 * QS_PER_CALL;
  const roundsNeeded = Math.ceil(needed / questionsPerRound);
  console.log(`Questions per round: ~${questionsPerRound}`);
  console.log(`Rounds needed: ${roundsNeeded}\n`);

  const sem = new Semaphore(CONCURRENCY);
  const newQuestions = [];
  let completed = 0;

  for (let round = 1; round <= roundsNeeded; round++) {
    if (currentTotal + newQuestions.length >= TARGET_TOTAL) break;
    console.log(`\n🔄 Round ${round}/${roundsNeeded} — Total so far: ${currentTotal + newQuestions.length}`);

    const tasks = [];
    for (const discipline of DISCIPLINES) {
      for (const subject of discipline.subjects) {
        for (const difficulty of DIFFICULTIES) {
          tasks.push(async () => {
            await sem.acquire();
            try {
              const qs = await generateBatch(discipline, subject, difficulty, QS_PER_CALL, round);
              for (const q of qs) {
                newQuestions.push({
                  disciplineSlug: discipline.slug,
                  disciplineNamePt: discipline.namePt,
                  disciplineNameEn: discipline.nameEn,
                  subjectSlug: subject.slug,
                  subjectNamePt: subject.namePt,
                  subjectNameEn: subject.nameEn,
                  difficulty,
                  year: 2024,
                  isPremium: difficulty === "hard",
                  ...q,
                });
              }
              completed++;
              if (completed % 10 === 0) {
                process.stdout.write(`  Progress: ${currentTotal + newQuestions.length}/${TARGET_TOTAL}\n`);
              }
            } finally {
              sem.release();
            }
            await sleep(200); // small delay between calls
          });
        }
      }
    }

    await Promise.all(tasks.map(t => t()));

    // Save intermediate progress
    const combined = [...existing, ...newQuestions];
    fs.writeFileSync(allFile, JSON.stringify(combined, null, 2));
    console.log(`  💾 Saved ${combined.length} total questions`);

    if (currentTotal + newQuestions.length >= TARGET_TOTAL) break;
  }

  // Final save
  const combined = [...existing, ...newQuestions];
  fs.writeFileSync(allFile, JSON.stringify(combined, null, 2));

  // Update per-discipline files
  for (const discipline of DISCIPLINES) {
    const dqs = combined.filter(q => q.disciplineSlug === discipline.slug);
    fs.writeFileSync(
      path.join(DATA_DIR, `questions_${discipline.slug}.json`),
      JSON.stringify(dqs, null, 2)
    );
  }

  console.log(`\n✅ Done! Total: ${combined.length} questions`);
  console.log(`New questions generated: ${newQuestions.length}`);
}

main().catch(console.error);
