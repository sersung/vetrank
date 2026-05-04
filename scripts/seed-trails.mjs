/**
 * Seed script: creates 5 trails from TrilhasdeAprendizagem.docx
 *
 * Trails:
 *  1. Fisiologia Animal I  (disciplineId=30001, subjectId=30007)
 *  2. Fisiologia Animal II (disciplineId=30001, subjectId=30007)
 *  3. Fisiologia Geral     (disciplineId=30001, subjectId=30007) — combines I + II
 *  4. Patologia Geral      (disciplineId=30002, subjectId=30013)
 *  5. Patologia Especial   (disciplineId=30002, subjectId=30014)
 *
 * Each trail module has a questionFilter JSON that maps to the DB filter fields:
 *   { disciplineId, subjectId, difficulty, questionType }
 *
 * Question counts per module are set so the total per trail is ~500 questions.
 * Passing score is 70% throughout.
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ─── Helper ─────────────────────────────────────────────────────────────────

async function insertTrail(trail) {
  const [result] = await conn.query(
    `INSERT INTO trails (disciplineId, title, description, totalHours, passingScore, finalExamQuestions, finalExamTimeSeconds, active, createdBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`,
    [
      trail.disciplineId,
      trail.title,
      trail.description,
      trail.totalHours,
      trail.passingScore ?? 70,
      trail.finalExamQuestions ?? 40,
      trail.finalExamTimeSeconds ?? 3600,
    ]
  );
  const trailId = result.insertId;
  console.log(`  ✓ Trail "${trail.title}" → id=${trailId}`);

  for (let i = 0; i < trail.modules.length; i++) {
    const mod = trail.modules[i];
    await conn.query(
      `INSERT INTO trail_modules (trailId, \`order\`, title, summary, difficulty, questionCount, minPassRate, questionFilter)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trailId,
        i + 1,
        mod.title,
        mod.summary,
        mod.difficulty ?? "mixed",
        mod.questionCount,
        mod.minPassRate ?? 70,
        JSON.stringify(mod.questionFilter),
      ]
    );
    console.log(`    · Module ${i + 1}: "${mod.title}" (${mod.questionCount}q)`);
  }
  return trailId;
}

// ─── Trail 1: Fisiologia Animal I ───────────────────────────────────────────
// 7 modules × ~50q = 350q + 40q final = ~390q total
const fisioI = {
  disciplineId: 30001,
  title: "Fisiologia Animal I",
  description:
    "Trilha de Fisiologia Animal I cobrindo os fundamentos da fisiologia celular, neurofisiologia, fisiologia muscular, cardiovascular, circulatória e renal. Ao final, o aluno será capaz de compreender os mecanismos homeostáticos básicos dos sistemas estudados.",
  totalHours: 60,
  passingScore: 70,
  finalExamQuestions: 40,
  finalExamTimeSeconds: 3600,
  modules: [
    {
      title: "Módulo 1 — Introdução à Fisiologia e Homeostase",
      summary:
        "Conceitos fundamentais de fisiologia, homeostase, mecanismos de feedback negativo e positivo, compartimentos líquidos corporais e composição do meio interno.",
      difficulty: "easy",
      questionCount: 40,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "easy" },
    },
    {
      title: "Módulo 2 — Fisiologia Celular e Membrana",
      summary:
        "Potencial de membrana, potencial de ação, transporte ativo e passivo, canais iônicos e comunicação celular.",
      difficulty: "medium",
      questionCount: 50,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "medium" },
    },
    {
      title: "Módulo 3 — Neurofisiologia",
      summary:
        "Organização do sistema nervoso, sinapses, neurotransmissores, arco reflexo, sistema nervoso autônomo simpático e parassimpático.",
      difficulty: "medium",
      questionCount: 55,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "medium" },
    },
    {
      title: "Módulo 4 — Fisiologia Muscular",
      summary:
        "Tipos de músculo, mecanismo de contração muscular, acoplamento excitação-contração, fadiga muscular e propriedades do músculo liso.",
      difficulty: "medium",
      questionCount: 50,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "medium" },
    },
    {
      title: "Módulo 5 — Fisiologia Cardíaca",
      summary:
        "Propriedades do músculo cardíaco, ciclo cardíaco, débito cardíaco, eletrocardiograma, regulação da frequência cardíaca.",
      difficulty: "hard",
      questionCount: 55,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "hard" },
    },
    {
      title: "Módulo 6 — Fisiologia Circulatória",
      summary:
        "Hemodinâmica, pressão arterial, microcirculação, sistema linfático, regulação da pressão arterial e choque circulatório.",
      difficulty: "hard",
      questionCount: 55,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "hard" },
    },
    {
      title: "Módulo 7 — Fisiologia Renal",
      summary:
        "Estrutura e função do néfron, filtração glomerular, reabsorção e secreção tubular, regulação do equilíbrio ácido-base e controle da diurese.",
      difficulty: "hard",
      questionCount: 55,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "hard" },
    },
  ],
};

// ─── Trail 2: Fisiologia Animal II ──────────────────────────────────────────
// 4 modules × ~55q = 220q + 40q final = ~260q total (combined with I = ~650)
const fisioII = {
  disciplineId: 30001,
  title: "Fisiologia Animal II",
  description:
    "Trilha de Fisiologia Animal II cobrindo os sistemas digestório, respiratório, endócrino e reprodutor. Continuação da Fisiologia Animal I, aprofundando os mecanismos regulatórios dos sistemas viscerais.",
  totalHours: 45,
  passingScore: 70,
  finalExamQuestions: 40,
  finalExamTimeSeconds: 3600,
  modules: [
    {
      title: "Módulo 1 — Fisiologia Digestória",
      summary:
        "Motilidade gastrointestinal, secreções digestivas, digestão e absorção de nutrientes, fisiologia do rúmen em ruminantes.",
      difficulty: "medium",
      questionCount: 60,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "medium" },
    },
    {
      title: "Módulo 2 — Fisiologia Respiratória",
      summary:
        "Mecânica respiratória, volumes e capacidades pulmonares, troca gasosa, transporte de O₂ e CO₂, regulação da respiração.",
      difficulty: "medium",
      questionCount: 55,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "medium" },
    },
    {
      title: "Módulo 3 — Fisiologia Endócrina",
      summary:
        "Glândulas endócrinas, mecanismos de ação hormonal, eixo hipotálamo-hipófise, hormônios da tireoide, adrenais, pâncreas e regulação do metabolismo.",
      difficulty: "hard",
      questionCount: 60,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "hard" },
    },
    {
      title: "Módulo 4 — Fisiologia da Reprodução",
      summary:
        "Fisiologia do macho e da fêmea, ciclo estral, espermatogênese, ovogênese, gestação, parto e lactação nas principais espécies domésticas.",
      difficulty: "hard",
      questionCount: 60,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "hard" },
    },
  ],
};

// ─── Trail 3: Fisiologia Geral ───────────────────────────────────────────────
// 11 modules (I + II combined) × ~45q = 495q + 50q final = ~545q total
const fisioGeral = {
  disciplineId: 30001,
  title: "Fisiologia Geral",
  description:
    "Trilha completa de Fisiologia Veterinária cobrindo todos os sistemas: celular, neuromuscular, cardiovascular, renal, digestório, respiratório, endócrino e reprodutor. Indicada para revisão completa antes de concursos e residências.",
  totalHours: 100,
  passingScore: 70,
  finalExamQuestions: 50,
  finalExamTimeSeconds: 5400,
  modules: [
    {
      title: "Módulo 1 — Homeostase e Fisiologia Celular",
      summary: "Fundamentos de homeostase, potencial de membrana, transporte e comunicação celular.",
      difficulty: "easy",
      questionCount: 40,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "easy" },
    },
    {
      title: "Módulo 2 — Neurofisiologia",
      summary: "Sistema nervoso central e periférico, sinapses, neurotransmissores, sistema autônomo.",
      difficulty: "medium",
      questionCount: 45,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "medium" },
    },
    {
      title: "Módulo 3 — Fisiologia Muscular",
      summary: "Músculo esquelético, cardíaco e liso — contração, fadiga e regulação.",
      difficulty: "medium",
      questionCount: 45,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "medium" },
    },
    {
      title: "Módulo 4 — Fisiologia Cardíaca",
      summary: "Ciclo cardíaco, débito cardíaco, ECG e regulação da frequência cardíaca.",
      difficulty: "medium",
      questionCount: 45,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "medium" },
    },
    {
      title: "Módulo 5 — Fisiologia Circulatória",
      summary: "Hemodinâmica, pressão arterial, microcirculação e regulação vascular.",
      difficulty: "medium",
      questionCount: 45,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "medium" },
    },
    {
      title: "Módulo 6 — Fisiologia Renal",
      summary: "Néfron, filtração, reabsorção, secreção e equilíbrio ácido-base.",
      difficulty: "hard",
      questionCount: 45,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "hard" },
    },
    {
      title: "Módulo 7 — Fisiologia Digestória",
      summary: "Motilidade, secreções, digestão, absorção e fisiologia ruminal.",
      difficulty: "medium",
      questionCount: 45,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "medium" },
    },
    {
      title: "Módulo 8 — Fisiologia Respiratória",
      summary: "Mecânica respiratória, troca gasosa e regulação da ventilação.",
      difficulty: "medium",
      questionCount: 45,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "medium" },
    },
    {
      title: "Módulo 9 — Fisiologia Endócrina",
      summary: "Eixo hipotálamo-hipófise, tireoide, adrenais, pâncreas e metabolismo.",
      difficulty: "hard",
      questionCount: 50,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "hard" },
    },
    {
      title: "Módulo 10 — Fisiologia da Reprodução",
      summary: "Ciclo estral, gametogênese, gestação, parto e lactação.",
      difficulty: "hard",
      questionCount: 50,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "hard" },
    },
    {
      title: "Módulo 11 — Revisão Integrada e Casos Clínicos",
      summary: "Integração dos sistemas fisiológicos através de casos clínicos e questões de alta complexidade.",
      difficulty: "hard",
      questionCount: 40,
      minPassRate: 70,
      questionFilter: { disciplineId: 30001, subjectId: 30007, difficulty: "hard" },
    },
  ],
};

// ─── Trail 4: Patologia Geral ────────────────────────────────────────────────
// 9 modules × ~50q = 450q + 40q final = ~490q total
const patologiaGeral = {
  disciplineId: 30002,
  title: "Patologia Geral",
  description:
    "Trilha de Patologia Geral Veterinária cobrindo os processos fundamentais de lesão celular, inflamação, reparo, distúrbios circulatórios, neoplasias e técnicas de necropsia. Base essencial para o diagnóstico anatomopatológico.",
  totalHours: 70,
  passingScore: 70,
  finalExamQuestions: 40,
  finalExamTimeSeconds: 3600,
  modules: [
    {
      title: "Módulo 1 — Introdução à Patologia e Lesão Celular",
      summary:
        "Conceitos de patologia, adaptações celulares (hipertrofia, hiperplasia, atrofia, metaplasia), lesão celular reversível e irreversível, necrose e apoptose.",
      difficulty: "easy",
      questionCount: 40,
      minPassRate: 70,
      questionFilter: { disciplineId: 30002, subjectId: 30013, difficulty: "easy" },
    },
    {
      title: "Módulo 2 — Degenerações e Depósitos Patológicos",
      summary:
        "Degenerações celulares (hidrópica, gordurosa, hialina), calcificações patológicas, pigmentações endógenas e exógenas.",
      difficulty: "medium",
      questionCount: 45,
      minPassRate: 70,
      questionFilter: { disciplineId: 30002, subjectId: 30013, difficulty: "medium" },
    },
    {
      title: "Módulo 3 — Distúrbios Circulatórios",
      summary:
        "Hiperemia, congestão, hemorragia, trombose, embolia, infarto, edema e choque. Fisiopatologia e achados macroscópicos e microscópicos.",
      difficulty: "medium",
      questionCount: 55,
      minPassRate: 70,
      questionFilter: { disciplineId: 30002, subjectId: 30013, difficulty: "medium" },
    },
    {
      title: "Módulo 4 — Inflamação Aguda",
      summary:
        "Eventos vasculares e celulares da inflamação aguda, mediadores químicos, tipos de exsudatos, inflamação serosa, fibrinosa, purulenta e hemorrágica.",
      difficulty: "medium",
      questionCount: 55,
      minPassRate: 70,
      questionFilter: { disciplineId: 30002, subjectId: 30013, difficulty: "medium" },
    },
    {
      title: "Módulo 5 — Inflamação Crônica e Granulomatosa",
      summary:
        "Inflamação crônica inespecífica e granulomatosa, células gigantes, granuloma, doenças granulomatosas de importância veterinária.",
      difficulty: "hard",
      questionCount: 50,
      minPassRate: 70,
      questionFilter: { disciplineId: 30002, subjectId: 30013, difficulty: "hard" },
    },
    {
      title: "Módulo 6 — Reparo e Cicatrização",
      summary:
        "Regeneração tecidual, cicatrização por primeira e segunda intenção, fatores que influenciam o reparo, queloides e cicatrizes patológicas.",
      difficulty: "medium",
      questionCount: 45,
      minPassRate: 70,
      questionFilter: { disciplineId: 30002, subjectId: 30013, difficulty: "medium" },
    },
    {
      title: "Módulo 7 — Neoplasias: Conceitos e Classificação",
      summary:
        "Nomenclatura e classificação das neoplasias, características de benignidade e malignidade, grau e estadiamento tumoral, metástase.",
      difficulty: "hard",
      questionCount: 55,
      minPassRate: 70,
      questionFilter: { disciplineId: 30002, subjectId: 30013, difficulty: "hard" },
    },
    {
      title: "Módulo 8 — Carcinogênese e Oncologia Veterinária",
      summary:
        "Agentes carcinogênicos (químicos, físicos, biológicos), oncogenes e genes supressores de tumor, neoplasias mais frequentes em cães, gatos e bovinos.",
      difficulty: "hard",
      questionCount: 55,
      minPassRate: 70,
      questionFilter: { disciplineId: 30002, subjectId: 30013, difficulty: "hard" },
    },
    {
      title: "Módulo 9 — Técnicas de Necropsia e Diagnóstico Anatomopatológico",
      summary:
        "Técnica de necropsia nas principais espécies domésticas, coleta e fixação de amostras, diagnóstico histopatológico e laudo anatomopatológico.",
      difficulty: "hard",
      questionCount: 50,
      minPassRate: 70,
      questionFilter: { disciplineId: 30002, subjectId: 30013, difficulty: "hard" },
    },
  ],
};

// ─── Trail 5: Patologia Especial ─────────────────────────────────────────────
// 5 modules × ~70q = 350q + 40q final = ~390q total
const patologiaEspecial = {
  disciplineId: 30002,
  title: "Patologia Especial / Sistêmica",
  description:
    "Trilha de Patologia Especial Veterinária cobrindo as lesões específicas de cada sistema orgânico: cardiovascular, respiratório, digestório, urinário, nervoso, musculoesquelético, reprodutor e tegumentar.",
  totalHours: 60,
  passingScore: 70,
  finalExamQuestions: 40,
  finalExamTimeSeconds: 3600,
  modules: [
    {
      title: "Módulo 1 — Patologia Cardiovascular e Respiratória",
      summary:
        "Cardiopatias congênitas e adquiridas, pericardite, miocardite, endocardite, pneumonias, pleurite, bronquiectasia e neoplasias pulmonares.",
      difficulty: "medium",
      questionCount: 65,
      minPassRate: 70,
      questionFilter: { disciplineId: 30002, subjectId: 30014, difficulty: "medium" },
    },
    {
      title: "Módulo 2 — Patologia Digestória e Hepática",
      summary:
        "Lesões do trato gastrointestinal (estomatite, gastrite, enterite, colite), hepatopatias (hepatite, cirrose, lipidose), pancreatite e lesões do rúmen.",
      difficulty: "medium",
      questionCount: 70,
      minPassRate: 70,
      questionFilter: { disciplineId: 30002, subjectId: 30014, difficulty: "medium" },
    },
    {
      title: "Módulo 3 — Patologia Urinária e Nervosa",
      summary:
        "Nefropatias (glomerulonefrite, nefrose, pielonefrite), urolitíase, cistite, encefalites, meningites, doenças degenerativas do SNC e neoplasias nervosas.",
      difficulty: "hard",
      questionCount: 70,
      minPassRate: 70,
      questionFilter: { disciplineId: 30002, subjectId: 30014, difficulty: "hard" },
    },
    {
      title: "Módulo 4 — Patologia Musculoesquelética e Tegumentar",
      summary:
        "Miopatias, artropatias, osteopatias, dermatites, dermatoses parasitárias, neoplasias de pele e tecido subcutâneo nas principais espécies.",
      difficulty: "hard",
      questionCount: 65,
      minPassRate: 70,
      questionFilter: { disciplineId: 30002, subjectId: 30014, difficulty: "hard" },
    },
    {
      title: "Módulo 5 — Patologia Reprodutora, Endócrina e Casos Integrados",
      summary:
        "Lesões do trato reprodutor masculino e feminino, endocrinopatias, casos anatomopatológicos integrados e questões de alta complexidade.",
      difficulty: "hard",
      questionCount: 70,
      minPassRate: 70,
      questionFilter: { disciplineId: 30002, subjectId: 30014, difficulty: "hard" },
    },
  ],
};

// ─── Run ─────────────────────────────────────────────────────────────────────

console.log("Seeding trails...\n");

try {
  // Check if trails already exist to avoid duplicates
  const [existing] = await conn.query("SELECT title FROM trails");
  const existingTitles = new Set(existing.map(r => r.title));

  for (const trail of [fisioI, fisioII, fisioGeral, patologiaGeral, patologiaEspecial]) {
    if (existingTitles.has(trail.title)) {
      console.log(`  ⚠ Trail "${trail.title}" already exists, skipping.`);
      continue;
    }
    await insertTrail(trail);
  }

  const [count] = await conn.query("SELECT COUNT(*) as c FROM trails");
  const [modCount] = await conn.query("SELECT COUNT(*) as c FROM trail_modules");
  console.log(`\nDone! Total trails: ${count[0].c}, total modules: ${modCount[0].c}`);
} finally {
  await conn.end();
}
