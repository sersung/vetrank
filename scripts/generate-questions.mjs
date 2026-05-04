/**
 * generate-questions.mjs
 * Generates new veterinary questions for all disciplines/subjects using the LLM API.
 * Inserts directly into the DB with proper format.
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!FORGE_URL || !FORGE_KEY) {
  console.error("Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY");
  process.exit(1);
}

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get all disciplines and subjects
const [disciplines] = await conn.query("SELECT id, namePt FROM disciplines ORDER BY id");
const [subjects] = await conn.query("SELECT id, disciplineId, namePt FROM subjects ORDER BY disciplineId, id");

// Group subjects by discipline
const subjectsByDisc = {};
for (const s of subjects) {
  if (!subjectsByDisc[s.disciplineId]) subjectsByDisc[s.disciplineId] = [];
  subjectsByDisc[s.disciplineId].push(s);
}

async function callLLM(messages) {
  const res = await fetch(`${FORGE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FORGE_KEY}`,
    },
    body: JSON.stringify({
      model: "gemini-2.0-flash",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.8,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function generateQuestionsForSubject(disciplineId, disciplineNamePt, subjectId, subjectNamePt, count = 5) {
  const difficulties = ["easy", "medium", "hard"];
  const prompt = `Você é um professor especialista em Medicina Veterinária do Brasil, criando questões para o CFMV (Conselho Federal de Medicina Veterinária) e concursos veterinários.

Gere ${count} questões de múltipla escolha (5 alternativas A a E) sobre o tema: "${subjectNamePt}" (disciplina: "${disciplineNamePt}").

Regras obrigatórias:
1. Cada questão deve ter exatamente 5 alternativas (A, B, C, D, E)
2. Apenas UMA alternativa é correta
3. As alternativas incorretas devem ser plausíveis (não óbvias)
4. O enunciado deve ser claro e objetivo
5. Distribua as dificuldades: algumas fáceis, algumas médias, algumas difíceis
6. Varie qual alternativa é a correta (não coloque sempre A)
7. Forneça uma explicação breve da resposta correta em português

Retorne APENAS um JSON válido no formato:
{
  "questions": [
    {
      "textPt": "Enunciado da questão em português",
      "textEn": "Question text in English",
      "difficulty": "easy|medium|hard",
      "correctOption": "A|B|C|D|E",
      "options": [
        {"id": "A", "textPt": "Alternativa A em português", "textEn": "Option A in English"},
        {"id": "B", "textPt": "Alternativa B em português", "textEn": "Option B in English"},
        {"id": "C", "textPt": "Alternativa C em português", "textEn": "Option C in English"},
        {"id": "D", "textPt": "Alternativa D em português", "textEn": "Option D in English"},
        {"id": "E", "textPt": "Alternativa E em português", "textEn": "Option E in English"}
      ],
      "explanationPt": "Explicação da resposta correta em português",
      "explanationEn": "Explanation of the correct answer in English"
    }
  ]
}`;

  const raw = await callLLM([
    { role: "system", content: "Você é um especialista em medicina veterinária. Responda APENAS com JSON válido, sem markdown, sem texto adicional." },
    { role: "user", content: prompt },
  ]);

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    // Try to extract JSON from response
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error("Could not parse LLM response as JSON");
  }

  return parsed.questions || [];
}

async function insertQuestion(q, disciplineId, subjectId) {
  const validOptions = ["A", "B", "C", "D", "E"];
  if (!validOptions.includes(q.correctOption)) {
    console.warn(`  Skipping: invalid correctOption "${q.correctOption}"`);
    return false;
  }
  if (!q.options || q.options.length !== 5) {
    console.warn(`  Skipping: expected 5 options, got ${q.options?.length}`);
    return false;
  }

  await conn.query(
    `INSERT INTO questions 
     (disciplineId, subjectId, difficulty, textPt, textEn, options, correctOption, explanationPt, explanationEn, active, isPremium, questionType, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'multiple_choice', 'approved', NOW(), NOW())`,
    [
      disciplineId,
      subjectId,
      q.difficulty || "medium",
      q.textPt,
      q.textEn || null,
      JSON.stringify(q.options),
      q.correctOption,
      q.explanationPt || null,
      q.explanationEn || null,
    ]
  );
  return true;
}

// Main generation loop
let totalGenerated = 0;
let totalInserted = 0;

// Generate 5 questions per subject (45 subjects × 5 = 225 new questions)
const QUESTIONS_PER_SUBJECT = 5;

for (const disc of disciplines) {
  const discSubjects = subjectsByDisc[disc.id] || [];
  console.log(`\n[${disc.namePt}] (${discSubjects.length} subjects)`);

  for (const subj of discSubjects) {
    process.stdout.write(`  → ${subj.namePt}... `);
    try {
      const questions = await generateQuestionsForSubject(
        disc.id,
        disc.namePt,
        subj.id,
        subj.namePt,
        QUESTIONS_PER_SUBJECT
      );
      totalGenerated += questions.length;
      let inserted = 0;
      for (const q of questions) {
        const ok = await insertQuestion(q, disc.id, subj.id);
        if (ok) inserted++;
      }
      totalInserted += inserted;
      console.log(`✓ ${inserted}/${questions.length} inserted`);
    } catch (e) {
      console.log(`✗ ERROR: ${e.message}`);
    }
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }
}

console.log(`\n=== GENERATION COMPLETE ===`);
console.log(`Generated: ${totalGenerated}`);
console.log(`Inserted:  ${totalInserted}`);

// Final count
const [[{ total }]] = await conn.query("SELECT COUNT(*) as total FROM questions WHERE active=1");
console.log(`Total active questions in DB: ${total}`);

await conn.end();
