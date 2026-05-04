/**
 * Reformats all questions in the database to ENADE Brazil format.
 * ENADE format: contexto (situational context) + enunciado (stem) + comando (command) + 5 alternativas (A-E)
 * Processes in batches of 20 questions at a time using Gemini 2.5 Flash.
 */
import { createConnection } from 'mysql2/promise';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const BATCH_SIZE = 10;
const PROGRESS_FILE = '/tmp/enade_progress.json';
const LOG_FILE = '/tmp/enade_reformat.log';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { writeFileSync(LOG_FILE, line + '\n', { flag: 'a' }); } catch {}
}

async function reformatBatch(questions) {
  const prompt = `Você é um especialista em elaboração de questões no formato ENADE Brasil para Medicina Veterinária.

Reformate cada questão abaixo para o padrão ENADE completo com:
1. CONTEXTO: Situação clínica, caso prático ou cenário científico relevante (2-4 frases)
2. ENUNCIADO: Apresentação do problema ou dados complementares (1-2 frases)  
3. COMANDO: Pergunta direta iniciando com "Assinale a alternativa que..." ou "Com base no exposto, é CORRETO afirmar que..." ou similar
4. ALTERNATIVAS: Exatamente 5 alternativas (A, B, C, D, E) sendo apenas 1 correta
5. GABARITO: Letra da alternativa correta
6. EXPLICAÇÃO: Justificativa detalhada da resposta correta (3-5 frases)

IMPORTANTE:
- Mantenha o mesmo conteúdo técnico da questão original
- As alternativas devem ser plausíveis e tecnicamente embasadas
- O contexto deve ser realista e clinicamente relevante
- Retorne APENAS JSON válido, sem markdown

Questões para reformatar:
${JSON.stringify(questions.map(q => ({
  id: q.id,
  textPt: q.textPt,
  options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
  correctAnswer: q.correctOption,
  explanationPt: q.explanationPt,
  difficulty: q.difficulty
})))}

Retorne um array JSON com exatamente ${questions.length} objetos no formato:
[{
  "id": <number>,
  "textPt": "<CONTEXTO>\\n\\n<ENUNCIADO>\\n\\n<COMANDO>",
  "textEn": "<English version of context + stem + command>",
  "options": [
    {"label": "A", "textPt": "...", "textEn": "..."},
    {"label": "B", "textPt": "...", "textEn": "..."},
    {"label": "C", "textPt": "...", "textEn": "..."},
    {"label": "D", "textPt": "...", "textEn": "..."},
    {"label": "E", "textPt": "...", "textEn": "..."}
  ],
  "correctAnswer": "<A|B|C|D|E>",
  "explanationPt": "...",
  "explanationEn": "..."
}]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  
  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON array found in response');
  
  return JSON.parse(jsonMatch[0]);
}

async function main() {
  const conn = await createConnection(process.env.DATABASE_URL);
  
  // Load progress
  let progress = { lastId: 0, processed: 0, errors: 0 };
  if (existsSync(PROGRESS_FILE)) {
    progress = JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'));
    log(`Resuming from question ID > ${progress.lastId} (${progress.processed} already processed)`);
  }
  
  // Get total count
  const [[{ total }]] = await conn.execute('SELECT COUNT(*) as total FROM questions WHERE id > ?', [progress.lastId]);
  log(`Total questions to process: ${total}`);
  
  let processed = 0;
  
  while (true) {
    // Fetch next batch
    const [rows] = await conn.query(
      `SELECT id, textPt, textEn, options, correctOption, explanationPt, explanationEn, difficulty 
       FROM questions WHERE id > ${progress.lastId} ORDER BY id ASC LIMIT ${BATCH_SIZE}`
    );
    
    if (rows.length === 0) break;
    
    log(`Processing batch: IDs ${rows[0].id} - ${rows[rows.length-1].id}`);
    
    try {
      const reformatted = await reformatBatch(rows);
      
      // Update each question
      for (const q of reformatted) {
        const optionsJson = JSON.stringify(q.options);
        await conn.execute(
          `UPDATE questions SET 
            textPt = ?, textEn = ?, options = ?, correctOption = ?,
            explanationPt = ?, explanationEn = ?, questionType = 'multiple_choice'
           WHERE id = ?`,
          [q.textPt, q.textEn, optionsJson, q.correctAnswer, q.explanationPt, q.explanationEn, q.id]
        );
      }
      
      progress.lastId = rows[rows.length - 1].id;
      progress.processed += rows.length;
      processed += rows.length;
      
      writeFileSync(PROGRESS_FILE, JSON.stringify(progress));
      log(`✓ Batch done. Total processed: ${progress.processed}/${parseInt(total) + progress.processed}`);
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 2000));
      
    } catch (err) {
      progress.errors++;
      log(`✗ Batch error: ${err.message}. Skipping batch and continuing...`);
      progress.lastId = rows[rows.length - 1].id;
      writeFileSync(PROGRESS_FILE, JSON.stringify(progress));
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  log(`\n=== COMPLETE ===`);
  log(`Processed: ${progress.processed} questions`);
  log(`Errors: ${progress.errors} batches`);
  
  await conn.end();
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
