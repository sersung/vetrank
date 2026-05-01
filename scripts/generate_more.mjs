/**
 * VetRank — Additional Question Generator (Round 2+)
 * Generates more questions and APPENDS to existing JSON files
 * Run multiple times until we reach 5,000 total
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../data");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) { console.error("GEMINI_API_KEY not set"); process.exit(1); }

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DISCIPLINES = [
  {
    slug: "pharmacology", namePt: "Farmacologia", nameEn: "Pharmacology",
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
    slug: "clinics", namePt: "Clínica Veterinária", nameEn: "Veterinary Clinics",
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
    slug: "herpetology", namePt: "Herpetologia", nameEn: "Herpetology",
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
    slug: "ornithology", namePt: "Ornitologia", nameEn: "Ornithology",
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
    slug: "anesthesiology", namePt: "Anestesiologia", nameEn: "Anesthesiology",
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
    slug: "small-mammals", namePt: "Pequenos Mamíferos", nameEn: "Small Mammals",
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

const DIFFICULTIES = ["easy", "medium", "hard"];
const TARGET_TOTAL = 5000;
const QS_PER_BATCH = 8; // smaller batches = more reliable JSON

async function generateBatch(discipline, subject, difficulty, count, round) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: "You are a Brazilian veterinary medicine professor. Respond ONLY with a valid JSON array, no markdown, no code blocks.",
  });

  const prompt = `Generate exactly ${count} NEW and UNIQUE multiple-choice veterinary medicine questions about "${subject.nameEn}" within "${discipline.nameEn}". Difficulty: ${difficulty}. Round ${round} - make these DIFFERENT from previous questions.

Return ONLY a valid JSON array:
[{"textPt":"...","textEn":"...","options":[{"id":"A","textPt":"...","textEn":"..."},{"id":"B","textPt":"...","textEn":"..."},{"id":"C","textPt":"...","textEn":"..."},{"id":"D","textPt":"...","textEn":"..."}],"correctOption":"A","explanationPt":"...","explanationEn":"..."}]`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim()
        .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Not array");
      return parsed.slice(0, count);
    } catch (err) {
      if (attempt < 3) await sleep(3000 * attempt);
    }
  }
  return [];
}

async function main() {
  // Count current totals
  let existing = [];
  const allFile = path.join(OUTPUT_DIR, "questions_all.json");
  if (fs.existsSync(allFile)) {
    existing = JSON.parse(fs.readFileSync(allFile, "utf8"));
  }
  
  console.log(`Current total: ${existing.length} questions`);
  console.log(`Target: ${TARGET_TOTAL} questions`);
  const needed = TARGET_TOTAL - existing.length;
  console.log(`Need to generate: ${needed} more questions\n`);

  if (needed <= 0) {
    console.log("Already at target!");
    return;
  }

  const newQuestions = [];
  let round = 2;

  // Keep generating rounds until we hit the target
  while (existing.length + newQuestions.length < TARGET_TOTAL) {
    console.log(`\n🔄 Round ${round} — Current: ${existing.length + newQuestions.length}/${TARGET_TOTAL}`);
    
    for (const discipline of DISCIPLINES) {
      if (existing.length + newQuestions.length >= TARGET_TOTAL) break;
      
      for (const subject of discipline.subjects) {
        if (existing.length + newQuestions.length >= TARGET_TOTAL) break;
        
        const batches = await Promise.all(
          DIFFICULTIES.map((diff) => generateBatch(discipline, subject, diff, QS_PER_BATCH, round))
        );

        for (let i = 0; i < DIFFICULTIES.length; i++) {
          for (const q of batches[i]) {
            newQuestions.push({
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
        }
        
        process.stdout.write(`  ✓ ${subject.namePt}: +${batches.reduce((s,b)=>s+b.length,0)} (total: ${existing.length + newQuestions.length})\n`);
        await sleep(300);
      }
    }
    round++;
    if (round > 10) break; // safety limit
  }

  // Merge and save
  const combined = [...existing, ...newQuestions];
  fs.writeFileSync(allFile, JSON.stringify(combined, null, 2));

  // Also update per-discipline files
  for (const discipline of DISCIPLINES) {
    const disciplineQs = combined.filter(q => q.disciplineSlug === discipline.slug);
    fs.writeFileSync(
      path.join(OUTPUT_DIR, `questions_${discipline.slug}.json`),
      JSON.stringify(disciplineQs, null, 2)
    );
  }

  console.log(`\n✅ Done! Total questions: ${combined.length}`);
  console.log(`📁 Saved to: ${allFile}`);
}

main().catch(console.error);
