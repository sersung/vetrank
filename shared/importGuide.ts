/**
 * importGuide.ts — Referência completa de campos, formatos e prompt IA para importação de questões.
 *
 * Exporta:
 *  FIELD_REGISTRY     — todos os campos com tipo, obrigatoriedade, descrição e exemplo
 *  FORMAT_SPECS       — especificação e limitações de JSON | CSV | XLSX
 *  buildAiPrompt()    — monta prompt pronto para uso com IA
 *  TEMPLATE_JSON      — objeto de exemplo para download
 *  TEMPLATE_CSV_ROWS  — linhas de exemplo CSV
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type FieldCategory =
  | "identificacao"
  | "conteudo"
  | "alternativas"
  | "classificacao"
  | "modelo"
  | "status"
  | "m3_assertivas"
  | "m5_assercao_razao"
  | "m8_associacao"
  | "m10_bloco";

export interface FieldDef {
  campo: string;
  aliasCSV?: string[];       // nomes alternativos aceitos no CSV/XLSX
  categoria: FieldCategory;
  tipo: string;              // exibição: "string", "number", "boolean", "enum(…)", "array"
  obrigatorio: boolean;
  descricao: string;         // descrição em pt-BR para o guia e para prompt IA
  exemplo: string;           // valor de exemplo (sempre string para exibição)
  validacao?: string;        // regra de validação em linguagem natural
  formatosSuportados: ("json" | "csv" | "xlsx")[];
}

// ─── Registro de Campos ───────────────────────────────────────────────────────

export const FIELD_REGISTRY: FieldDef[] = [

  // ── Identificação ────────────────────────────────────────────────────────────
  {
    campo: "disciplineId",
    aliasCSV: ["discipline_id", "area", "grande_area"],
    categoria: "identificacao",
    tipo: "number",
    obrigatorio: true,
    descricao: "ID numérico da Grande Área/Disciplina cadastrada no sistema. Consulte a tabela de disciplinas antes de importar.",
    exemplo: "3",
    validacao: "Deve ser um inteiro positivo correspondente a uma disciplina existente.",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "subjectId",
    aliasCSV: ["subject_id", "assunto_id", "disciplina_id"],
    categoria: "identificacao",
    tipo: "number",
    obrigatorio: false,
    descricao: "ID numérico do Assunto (subdisciplina) dentro da Grande Área. Opcional mas recomendado para filtros avançados.",
    exemplo: "12",
    validacao: "Deve pertencer à disciplineId informada.",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "subjectTag",
    aliasCSV: ["subject_tag", "tag_assunto", "tema"],
    categoria: "identificacao",
    tipo: "string (máx 128)",
    obrigatorio: false,
    descricao: "Tag de assunto em texto livre, para categorização interna sem necessidade de ID. Ex.: 'Farmacologia Clínica', 'Reprodução Bovina'.",
    exemplo: "Farmacologia Veterinária",
    formatosSuportados: ["json", "csv", "xlsx"],
  },

  // ── Conteúdo ─────────────────────────────────────────────────────────────────
  {
    campo: "textPt",
    aliasCSV: ["text_pt", "enunciado", "texto", "statement", "pergunta"],
    categoria: "conteudo",
    tipo: "string",
    obrigatorio: true,
    descricao: "Enunciado completo da questão em português. Deve ser autossuficiente, sem referências a figuras externas (a menos que imageUrl seja fornecida). Máx. recomendado: 2 000 caracteres.",
    exemplo: "Qual das alternativas descreve corretamente o mecanismo de ação da ivermectina?",
    validacao: "Não pode estar vazio. Mínimo 10 caracteres.",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "textEn",
    aliasCSV: ["text_en", "statement_en", "enunciado_en"],
    categoria: "conteudo",
    tipo: "string",
    obrigatorio: false,
    descricao: "Versão em inglês do enunciado. Opcional; usado apenas na interface bilíngue.",
    exemplo: "Which alternative correctly describes the mechanism of action of ivermectin?",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "explanationPt",
    aliasCSV: ["explanation_pt", "explicacao", "justificativa", "gabarito_comentado"],
    categoria: "conteudo",
    tipo: "string",
    obrigatorio: false,
    descricao: "Explicação detalhada do gabarito correto e dos distratores. Exibida ao aluno após responder. Suporta texto com até 4 000 caracteres.",
    exemplo: "A ivermectina atua potencializando os canais de cloro dependentes de glutamato...",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "explanationEn",
    aliasCSV: ["explanation_en", "explicacao_en"],
    categoria: "conteudo",
    tipo: "string",
    obrigatorio: false,
    descricao: "Versão em inglês da explicação do gabarito.",
    exemplo: "Ivermectin works by potentiating glutamate-gated chloride channels...",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "imageUrl",
    aliasCSV: ["image_url", "imagem", "url_imagem"],
    categoria: "conteudo",
    tipo: "string (URL)",
    obrigatorio: false,
    descricao: "URL pública da imagem associada ao enunciado (gráfico, fotografia, esquema). O sistema converte automaticamente para WebP responsivo. Formatos aceitos: JPEG, PNG, WebP, GIF.",
    exemplo: "https://exemplo.com/imagens/questao_001.jpg",
    validacao: "Deve ser uma URL acessível publicamente. Máx. 512 caracteres.",
    formatosSuportados: ["json", "csv", "xlsx"],
  },

  // ── Alternativas ──────────────────────────────────────────────────────────────
  {
    campo: "optA / optB / optC / optD / optE",
    aliasCSV: ["alternativaA", "opt_a", "opcaoA", "alternativa_a"],
    categoria: "alternativas",
    tipo: "string",
    obrigatorio: true,
    descricao: "Texto das 5 alternativas (A, B, C, D, E). No CSV/XLSX use colunas separadas (optA, optB, …). No JSON use o array 'options' com objetos {id, textPt}. Todas devem ser preenchidas — nunca deixe alternativa em branco ou use 'Todas as anteriores'.",
    exemplo: "Potencializa os canais de cloro dependentes de GABA",
    validacao: "Todas as 5 alternativas são obrigatórias. Máx. 512 caracteres cada.",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "correctOption",
    aliasCSV: ["correct_option", "gabarito", "resposta", "answer"],
    categoria: "alternativas",
    tipo: "enum(A, B, C, D, E)",
    obrigatorio: true,
    descricao: "Letra da alternativa correta. Deve ser exatamente uma das letras A, B, C, D ou E.",
    exemplo: "C",
    validacao: "Valor deve ser A, B, C, D ou E (maiúsculo, sem espaços).",
    formatosSuportados: ["json", "csv", "xlsx"],
  },

  // ── Classificação ─────────────────────────────────────────────────────────────
  {
    campo: "difficulty",
    aliasCSV: ["dificuldade", "nivel", "level"],
    categoria: "classificacao",
    tipo: "enum(very_easy, easy, medium, hard, very_hard)",
    obrigatorio: true,
    descricao: "Nível de dificuldade da questão segundo a escala de 5 níveis do VetRank. Use 'medium' como padrão quando incerto.",
    exemplo: "medium",
    validacao: "Valores aceitos: very_easy, easy, medium, hard, very_hard.",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "year",
    aliasCSV: ["ano", "year", "ano_prova"],
    categoria: "classificacao",
    tipo: "number (YYYY)",
    obrigatorio: false,
    descricao: "Ano em que a questão foi aplicada em prova ou concurso. Use formato de 4 dígitos (ex.: 2023).",
    exemplo: "2023",
    validacao: "Inteiro entre 1990 e o ano atual.",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "author",
    aliasCSV: ["autor", "author", "elaborador"],
    categoria: "classificacao",
    tipo: "string (máx 256)",
    obrigatorio: false,
    descricao: "Nome do autor ou elaborador da questão. Pode ser um professor, banca ou referência bibliográfica.",
    exemplo: "Prof. João da Silva",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "banca",
    aliasCSV: ["banca", "organizadora", "examining_board"],
    categoria: "classificacao",
    tipo: "string (máx 128)",
    obrigatorio: false,
    descricao: "Nome da banca examinadora ou organizadora da prova. Ex.: VUNESP, FGV, CESPE, INEP, UFPR. Usado como filtro no banco de questões.",
    exemplo: "CESPE/CEBRASPE",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "instituicao",
    aliasCSV: ["instituicao", "institution", "universidade", "concurso"],
    categoria: "classificacao",
    tipo: "string (máx 256)",
    obrigatorio: false,
    descricao: "Instituição que aplicou a prova (universidade, órgão público, conselho). Ex.: USP, UFMG, CFM, CFMV.",
    exemplo: "Universidade Federal do Paraná",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "cargo",
    aliasCSV: ["cargo", "position", "vaga"],
    categoria: "classificacao",
    tipo: "string (máx 256)",
    obrigatorio: false,
    descricao: "Cargo ou vaga para o qual a questão foi elaborada em concurso público. Usado para filtros de concursos específicos.",
    exemplo: "Médico Veterinário — Nível Superior",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "carreira",
    aliasCSV: ["carreira", "career", "trilha"],
    categoria: "classificacao",
    tipo: "string (máx 128)",
    obrigatorio: false,
    descricao: "Carreira ou trilha de estudo à qual a questão se aplica. Ex.: 'Residência Veterinária', 'ENADE Veterinária', 'Concurso Público'.",
    exemplo: "Residência Veterinária",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "areaFormacao",
    aliasCSV: ["area_formacao", "area_formacao", "field_of_study"],
    categoria: "classificacao",
    tipo: "string (máx 128)",
    obrigatorio: false,
    descricao: "Área de formação acadêmica ou curso para o qual a questão foi direcionada.",
    exemplo: "Medicina Veterinária",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "escolaridade",
    aliasCSV: ["escolaridade", "education_level", "nivel_escolar"],
    categoria: "classificacao",
    tipo: "enum(fundamental, medio, superior)",
    obrigatorio: false,
    descricao: "Nível de escolaridade exigido para a questão. Para concursos veterinários, use 'superior'.",
    exemplo: "superior",
    validacao: "Valores aceitos: fundamental, medio, superior.",
    formatosSuportados: ["json", "csv", "xlsx"],
  },

  // ── Modelo de Item ─────────────────────────────────────────────────────────────
  {
    campo: "modelId",
    aliasCSV: ["model_id", "modelo", "tipo_modelo"],
    categoria: "modelo",
    tipo: "enum(M1–M10)",
    obrigatorio: false,
    descricao: "Código do modelo de item conforme o catálogo VetRank. M1=Resposta Única, M2=Afirmação Incompleta, M3=Combinações, M4=Foco Negativo, M5=Asserção-Razão, M6=Lacuna, M7=Interpretação, M8=Associação, M9=Ordenação, M10=Alternativas Constantes.",
    exemplo: "M1",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "questionType",
    aliasCSV: ["question_type", "tipo_questao", "formato"],
    categoria: "modelo",
    tipo: "enum(multiple_choice, assertion_reason, complex_multiple_choice, matching, true_false, ordering, cloze, clinical_case, image_analysis, interpretation, discursive)",
    obrigatorio: false,
    descricao: "Tipo técnico de renderização da questão. Determina como a questão é exibida ao aluno. Se modelId for fornecido, o questionType é inferido automaticamente.",
    exemplo: "multiple_choice",
    validacao: "Se omitido, padrão = multiple_choice.",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "isPremium",
    aliasCSV: ["is_premium", "premium", "exclusivo"],
    categoria: "modelo",
    tipo: "boolean",
    obrigatorio: false,
    descricao: "Indica se a questão é de conteúdo exclusivo para assinantes Premium. Use true para questões especiais ou de concursos recentes.",
    exemplo: "false",
    validacao: "true ou false. Padrão: false.",
    formatosSuportados: ["json", "csv", "xlsx"],
  },

  // ── Status ────────────────────────────────────────────────────────────────────
  {
    campo: "isAnulada",
    aliasCSV: ["is_anulada", "anulada", "cancelled"],
    categoria: "status",
    tipo: "boolean",
    obrigatorio: false,
    descricao: "Indica que a questão foi oficialmente anulada pela banca. Questões anuladas são ocultas por padrão nas buscas e simulados, mas podem ser incluídas via filtro.",
    exemplo: "false",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "isDesatualizada",
    aliasCSV: ["is_desatualizada", "desatualizada", "outdated"],
    categoria: "status",
    tipo: "boolean",
    obrigatorio: false,
    descricao: "Indica que o gabarito ou conteúdo da questão ficou desatualizado por mudanças na legislação, protocolo clínico ou literatura. Oculto por padrão, disponível via filtro.",
    exemplo: "false",
    formatosSuportados: ["json", "csv", "xlsx"],
  },

  // ── M3: Assertivas ─────────────────────────────────────────────────────────────
  {
    campo: "assertiva1 … assertiva5",
    aliasCSV: ["assertiva1", "assertiva_i", "statement_1"],
    categoria: "m3_assertivas",
    tipo: "string",
    obrigatorio: false,
    descricao: "[Apenas M3] Texto de cada assertiva (I, II, III, IV, V). No CSV use colunas assertiva1–assertiva5 + assertiva1Correta–assertiva5Correta (true/false). No JSON use o array 'assertivas': [{label, textPt, correta}].",
    exemplo: "O tecido cartilaginoso é avascular e recebe nutrição por difusão.",
    formatosSuportados: ["json", "csv", "xlsx"],
  },

  // ── M5: Asserção–Razão ─────────────────────────────────────────────────────────
  {
    campo: "assertion1",
    aliasCSV: ["assertion1", "assercao1", "assercao_i"],
    categoria: "m5_assercao_razao",
    tipo: "string",
    obrigatorio: false,
    descricao: "[M5] Texto da Asserção I — a proposição principal que pode ser verdadeira ou falsa.",
    exemplo: "A vacinação contra raiva em cães é eficaz na prevenção da doença.",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "assertion2",
    aliasCSV: ["assertion2", "assercao2", "assercao_ii", "razao"],
    categoria: "m5_assercao_razao",
    tipo: "string",
    obrigatorio: false,
    descricao: "[M5] Texto da Asserção II — a razão alegada para explicar a Asserção I (conectada pelo PORQUE).",
    exemplo: "A vacina estimula a produção de anticorpos neutralizantes contra o vírus rábico.",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "a1Verdadeira",
    aliasCSV: ["a1_verdadeira", "assercao1_verdadeira", "s1_true"],
    categoria: "m5_assercao_razao",
    tipo: "boolean",
    obrigatorio: false,
    descricao: "[M5] Indica se a Asserção I é verdadeira (true) ou falsa (false). Junto com a2Verdadeira e relacaoCausal, determina automaticamente o gabarito (A–E) sem necessidade de digitá-lo.",
    exemplo: "true",
    validacao: "A: V+V+relação correta | B: V+V | C: V+F | D: F+V | E: F+F",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "a2Verdadeira",
    aliasCSV: ["a2_verdadeira", "assercao2_verdadeira", "s2_true"],
    categoria: "m5_assercao_razao",
    tipo: "boolean",
    obrigatorio: false,
    descricao: "[M5] Indica se a Asserção II (Razão) é verdadeira (true) ou falsa (false).",
    exemplo: "true",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "relacaoCausal",
    aliasCSV: ["relacao_causal", "relacao_correta", "causality"],
    categoria: "m5_assercao_razao",
    tipo: "boolean",
    obrigatorio: false,
    descricao: "[M5] Indica se a Asserção II é de fato a justificativa correta da Asserção I. Só é relevante quando ambas são verdadeiras. Se true e ambas V → gabarito A. Se false e ambas V → gabarito B.",
    exemplo: "true",
    formatosSuportados: ["json", "csv", "xlsx"],
  },

  // ── M8: Associação ─────────────────────────────────────────────────────────────
  {
    campo: "colEsq1 … colEsq6",
    aliasCSV: ["col_esq1", "coluna_esquerda_1", "left_1"],
    categoria: "m8_associacao",
    tipo: "string",
    obrigatorio: false,
    descricao: "[M8] Itens da Coluna I (esquerda). Use colunas colEsq1–colEsq6 no CSV/XLSX. No JSON use 'matching.esquerda': [{label, textPt}].",
    exemplo: "Fígado",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "colDir1 … colDir6",
    aliasCSV: ["col_dir1", "coluna_direita_1", "right_1"],
    categoria: "m8_associacao",
    tipo: "string",
    obrigatorio: false,
    descricao: "[M8] Itens da Coluna II (direita). Use colunas colDir1–colDir6 no CSV/XLSX.",
    exemplo: "Produz bile e metaboliza lipídios",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "pares",
    aliasCSV: ["pares", "pairs", "par1", "par2"],
    categoria: "m8_associacao",
    tipo: "string (ex.: '1-b,2-c,3-a')",
    obrigatorio: false,
    descricao: "[M8] Pares corretos no formato 'ordem_esq-label_dir'. No CSV use uma string separada por vírgulas. No JSON use 'matching.pairs': [{esquerdaOrdem, direitaOrdem}].",
    exemplo: "1-b,2-c,3-a,4-d",
    formatosSuportados: ["json", "csv", "xlsx"],
  },

  // ── M10: Bloco de Alternativas Constantes ──────────────────────────────────────
  {
    campo: "grupoId",
    aliasCSV: ["grupo_id", "block_id", "bloco"],
    categoria: "m10_bloco",
    tipo: "string (máx 64)",
    obrigatorio: false,
    descricao: "[M10] Identificador único do bloco de alternativas constantes. Todas as questões do mesmo bloco compartilham texto-base e as mesmas 5 alternativas. Use um ID descritivo como 'ENADE2023_Q10'.",
    exemplo: "ENADE2023_Q10",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
  {
    campo: "posicaoBloco",
    aliasCSV: ["posicao_bloco", "block_position", "posicao"],
    categoria: "m10_bloco",
    tipo: "number",
    obrigatorio: false,
    descricao: "[M10] Posição sequencial desta questão dentro do bloco (1, 2, 3…). Usado para ordenar as questões ao exibir o bloco completo.",
    exemplo: "1",
    formatosSuportados: ["json", "csv", "xlsx"],
  },
];

// ─── Especificações de Formato ─────────────────────────────────────────────────

export interface FormatSpec {
  id: "json" | "csv" | "xlsx";
  nome: string;
  descricao: string;
  limites: string[];
  vantagens: string[];
  desvantagens: string[];
  estrutura: string;          // descrição da estrutura esperada
  estruturaExemplo: string;   // snippet de exemplo
}

export const FORMAT_SPECS: FormatSpec[] = [
  {
    id: "json",
    nome: "JSON",
    descricao: "Formato mais completo. Suporta todos os campos, incluindo arrays de assertivas (M3), colunas de associação (M8) e blocos M10 com estruturas aninhadas.",
    limites: [
      "Máximo de 500 questões por arquivo",
      "Tamanho máximo do arquivo: 10 MB",
      "Encoding: UTF-8 obrigatório",
      "O JSON deve ser um array de objetos no nível raiz",
      "Campos desconhecidos são ignorados silenciosamente",
    ],
    vantagens: [
      "Suporta toda a estrutura relacional (M3/M8/M10)",
      "Permite aninhamento nativo (options[], assertivas[], matching)",
      "Ideal para importação programática via API",
      "Compatível com exportação de outras plataformas",
    ],
    desvantagens: [
      "Requer conhecimento de JSON para criação manual",
      "Não suportado por editores de planilha sem plugin",
    ],
    estrutura: `Array de objetos. Cada objeto representa uma questão.
Para M3: inclua "assertivas": [{label, textPt, correta}]
Para M5: inclua "a1Verdadeira", "a2Verdadeira", "relacaoCausal"
Para M8: inclua "matching": {esquerda:[{label,textPt}], direita:[{label,textPt}], pairs:[{esquerdaOrdem,direitaOrdem}]}
Para M10: inclua "grupoId" e "posicaoBloco"`,
    estruturaExemplo: `[
  {
    "disciplineId": 1,
    "modelId": "M1",
    "questionType": "multiple_choice",
    "difficulty": "medium",
    "year": 2023,
    "banca": "CESPE",
    "instituicao": "UnB",
    "textPt": "Enunciado da questão...",
    "options": [
      {"id": "A", "textPt": "Alternativa A"},
      {"id": "B", "textPt": "Alternativa B"},
      {"id": "C", "textPt": "Alternativa C"},
      {"id": "D", "textPt": "Alternativa D"},
      {"id": "E", "textPt": "Alternativa E"}
    ],
    "correctOption": "C",
    "explanationPt": "Justificativa do gabarito..."
  }
]`,
  },

  {
    id: "csv",
    nome: "CSV",
    descricao: "Formato tabular simples. Ideal para questões de múltipla escolha padrão (M1/M2/M4). Limitado para modelos complexos (M3/M8/M10).",
    limites: [
      "Máximo de 1 000 linhas por arquivo",
      "Tamanho máximo: 5 MB",
      "Encoding: UTF-8 com BOM (recomendado para Excel)",
      "Separador: vírgula (,) — campos com vírgula devem usar aspas duplas",
      "Primeira linha deve ser o cabeçalho (nomes dos campos)",
      "M3: assertivas como colunas assertiva1–assertiva5 + assertiva1Correta (true/false)",
      "M8: pares no formato '1-b,2-c,3-a' em coluna única 'pares'",
      "M10: apenas grupoId e posicaoBloco; texto-base e alternativas do grupo devem ser criados separadamente",
      "Imagens: apenas URL externa (imageUrl); upload direto não suportado",
    ],
    vantagens: [
      "Editável no Excel, Google Sheets, LibreOffice",
      "Fácil de preencher em massa",
      "Template disponível para download",
      "Suporta aliases de colunas (ex.: 'enunciado' = 'textPt')",
    ],
    desvantagens: [
      "Não suporta estruturas aninhadas nativas",
      "M3 requer colunas extras (assertiva1…5 + correta1…5)",
      "Limitado para questões com imagens (apenas URL)",
      "Problemas de encoding em editores não-UTF8",
    ],
    estrutura: `Cabeçalho: disciplineId, modelId, questionType, difficulty, year, banca, instituicao,
cargo, carreira, areaFormacao, escolaridade, textPt, textEn, optA, optB, optC,
optD, optE, correctOption, explanationPt, assertion1, assertion2, a1Verdadeira,
a2Verdadeira, relacaoCausal, assertiva1, assertiva1Correta, assertiva2, assertiva2Correta,
assertiva3, assertiva3Correta, assertiva4, assertiva4Correta, colEsq1, colEsq2, colEsq3,
colDir1, colDir2, colDir3, pares, grupoId, posicaoBloco, isPremium, isAnulada,
isDesatualizada, imageUrl, subjectId, subjectTag, author`,
    estruturaExemplo: `disciplineId,modelId,difficulty,year,banca,textPt,optA,optB,optC,optD,optE,correctOption,explanationPt
1,M1,medium,2023,CESPE,"Enunciado da questão...","Alt A","Alt B","Alt C","Alt D","Alt E",C,"Justificativa..."`,
  },

  {
    id: "xlsx",
    nome: "XLSX / Excel",
    descricao: "Planilha Excel com múltiplas abas. A aba principal 'Questões' segue o mesmo formato do CSV. Abas auxiliares para M3 e M8 permitem estrutura relacional parcial.",
    limites: [
      "Máximo de 1 000 linhas na aba Questões",
      "Tamanho máximo: 20 MB",
      "Use apenas as abas: Questões | Assertivas_M3 | Associacao_M8 | Grupos_M10",
      "Não usar macros, fórmulas ou formatação condicional (ignoradas)",
      "Datas devem estar no formato AAAA (apenas ano) na coluna 'year'",
      "Booleanos: use TRUE/FALSE ou 1/0",
      "Encoding é gerenciado automaticamente pelo Excel",
    ],
    vantagens: [
      "Interface familiar para professores e coordenadores",
      "Múltiplas abas para dados relacionais",
      "Suporta validação de dados nas células",
      "Template com dropdown pré-configurado para difficulty/modelId",
    ],
    desvantagens: [
      "Arquivo maior que JSON/CSV para o mesmo conteúdo",
      "Pode corromper encoding em versões antigas do Excel",
      "Macros e fórmulas são ignoradas pelo importador",
    ],
    estrutura: `Aba "Questões": mesmas colunas do CSV
Aba "Assertivas_M3": questionRef (ID local), label, textPt, correta
Aba "Associacao_M8": questionRef, coluna (esquerda/direita), ordem, label, textPt
Aba "Grupos_M10": grupoId, titulo, textBasePt, altA, altB, altC, altD, altE`,
    estruturaExemplo: `[Aba: Questões]
disciplineId | modelId | difficulty | textPt | optA | optB | optC | optD | optE | correctOption
1            | M3      | hard       | Sobre… | Ap I | I,II | I,III| II   | Todas| C

[Aba: Assertivas_M3]
questionRef | label | textPt                          | correta
1           | I     | O tecido é avascular...         | TRUE
1           | II    | As células alfa predominam...   | FALSE
1           | III   | O colágeno tipo II é principal..| TRUE`,
  },
];

// ─── Template JSON para download ──────────────────────────────────────────────

export const TEMPLATE_JSON = [
  {
    _comentario: "M1 — Resposta Única (exemplo padrão)",
    disciplineId: 1,
    subjectId: null,
    modelId: "M1",
    questionType: "multiple_choice",
    difficulty: "medium",
    year: 2024,
    banca: "CESPE/CEBRASPE",
    instituicao: "Nome da Universidade",
    cargo: null,
    carreira: "Residência Veterinária",
    areaFormacao: "Medicina Veterinária",
    escolaridade: "superior",
    textPt: "Enunciado completo da questão em português. Seja claro e objetivo.",
    textEn: null,
    options: [
      { id: "A", textPt: "Texto da alternativa A" },
      { id: "B", textPt: "Texto da alternativa B" },
      { id: "C", textPt: "Texto da alternativa C (correta)" },
      { id: "D", textPt: "Texto da alternativa D" },
      { id: "E", textPt: "Texto da alternativa E" },
    ],
    correctOption: "C",
    explanationPt: "Justificativa detalhada do gabarito. Explique por que C é correta e por que as demais são incorretas.",
    isPremium: false,
    isAnulada: false,
    isDesatualizada: false,
    imageUrl: null,
    subjectTag: null,
    author: null,
  },
  {
    _comentario: "M3 — Combinações (com array de assertivas)",
    disciplineId: 1,
    modelId: "M3",
    questionType: "complex_multiple_choice",
    difficulty: "hard",
    year: 2023,
    textPt: "Sobre as características do tecido cartilaginoso, analise as assertivas e assinale a alternativa CORRETA:",
    options: [
      { id: "A", textPt: "Apenas I." },
      { id: "B", textPt: "I e II." },
      { id: "C", textPt: "I e III." },
      { id: "D", textPt: "II e III." },
      { id: "E", textPt: "I, II e III." },
    ],
    correctOption: "C",
    assertivas: [
      { label: "I",   textPt: "O tecido cartilaginoso é avascular e recebe nutrição por difusão.", correta: true },
      { label: "II",  textPt: "As células predominantes são os osteócitos.", correta: false },
      { label: "III", textPt: "A matriz extracelular contém predominantemente colágeno tipo II.", correta: true },
    ],
    explanationPt: "I e III são verdadeiras. II é falsa: as células do tecido cartilaginoso são condrócitos, não osteócitos.",
  },
  {
    _comentario: "M5 — Asserção-Razão (gabarito calculado pelos booleanos)",
    disciplineId: 1,
    modelId: "M5",
    questionType: "assertion_reason",
    difficulty: "hard",
    assertion1: "A vacina antirrábica é eficaz na prevenção da raiva em cães.",
    assertion2: "A vacina estimula a produção de anticorpos neutralizantes contra o vírus rábico.",
    a1Verdadeira: true,
    a2Verdadeira: true,
    relacaoCausal: true,
    options: [
      { id: "A", textPt: "As duas afirmativas são verdadeiras e a II é justificativa correta da I." },
      { id: "B", textPt: "As duas afirmativas são verdadeiras, mas a II não é justificativa correta da I." },
      { id: "C", textPt: "A afirmativa I é verdadeira e a afirmativa II é falsa." },
      { id: "D", textPt: "A afirmativa I é falsa e a afirmativa II é verdadeira." },
      { id: "E", textPt: "As duas afirmativas são falsas." },
    ],
    correctOption: "A",
    explanationPt: "Ambas as asserções são verdadeiras e a II explica corretamente a I.",
  },
  {
    _comentario: "M8 — Associação/Correspondência",
    disciplineId: 1,
    modelId: "M8",
    questionType: "matching",
    difficulty: "medium",
    textPt: "Associe cada estrutura da Coluna I com sua função principal descrita na Coluna II:",
    matching: {
      esquerda: [
        { label: "1", textPt: "Fígado" },
        { label: "2", textPt: "Pâncreas" },
        { label: "3", textPt: "Baço" },
      ],
      direita: [
        { label: "a", textPt: "Produz bile e metaboliza lipídios" },
        { label: "b", textPt: "Filtra sangue e armazena eritrócitos" },
        { label: "c", textPt: "Produz enzimas digestivas e insulina" },
      ],
      pairs: [
        { esquerdaOrdem: 1, direitaOrdem: 1 },
        { esquerdaOrdem: 2, direitaOrdem: 3 },
        { esquerdaOrdem: 3, direitaOrdem: 2 },
      ],
    },
    options: [
      { id: "A", textPt: "1-a / 2-c / 3-b." },
      { id: "B", textPt: "1-c / 2-a / 3-b." },
      { id: "C", textPt: "1-a / 2-b / 3-c." },
      { id: "D", textPt: "1-b / 2-c / 3-a." },
      { id: "E", textPt: "1-c / 2-b / 3-a." },
    ],
    correctOption: "A",
  },
];

// ─── Template CSV (linhas) ─────────────────────────────────────────────────────

export const TEMPLATE_CSV_HEADER =
  "disciplineId,modelId,questionType,difficulty,year,banca,instituicao,cargo,carreira,areaFormacao,escolaridade,textPt,optA,optB,optC,optD,optE,correctOption,explanationPt,assertion1,assertion2,a1Verdadeira,a2Verdadeira,relacaoCausal,isPremium,isAnulada,isDesatualizada,imageUrl,subjectId,subjectTag,author";

export const TEMPLATE_CSV_ROWS = [
  `1,M1,multiple_choice,medium,2023,CESPE,"Universidade Federal X","","Residência Veterinária","Medicina Veterinária",superior,"Qual o principal mecanismo de ação da ivermectina?","Inibe síntese de DNA","Bloqueia canais de Ca2+","Potencializa canais de Cl- via glutamato","Inibe síntese proteica","Bloqueia receptores colinérgicos",C,"A ivermectina potencializa os canais de cloreto dependentes de glutamato...","","",,,,,FALSE,FALSE,FALSE,,1,"Farmacologia","Prof. Silva"`,
  `1,M2,multiple_choice,easy,2022,VUNESP,UFMG,"","","",superior,"O período de incubação do tétano em equinos é de:","2 a 4 horas","12 a 24 horas","1 a 3 dias","3 a 21 dias","2 a 3 meses",D,"O período de incubação do Clostridium tetani varia de 3 a 21 dias...","","",,,,,FALSE,FALSE,FALSE,,,,"`,
];

// ─── Builder de Prompt IA ─────────────────────────────────────────────────────

export interface AiPromptOptions {
  modelId?: string;
  discipline?: string;
  subject?: string;
  difficulty?: string;
  year?: number;
  banca?: string;
  nivelCognitivo?: string;
  quantidade?: number;
  instrucaoExtra?: string;
}

export function buildAiPrompt(opts: AiPromptOptions = {}): string {
  const fieldRef = FIELD_REGISTRY
    .filter(f => !["m3_assertivas", "m8_associacao", "m10_bloco"].includes(f.categoria))
    .map(f => `  - ${f.campo} (${f.tipo}${f.obrigatorio ? ", obrigatório" : ""}): ${f.descricao} Exemplo: ${f.exemplo}`)
    .join("\n");

  const modelInstr: Record<string, string> = {
    M1: "Crie uma pergunta direta terminando em '?'. Apenas uma alternativa é inequivocamente correta.",
    M2: "O enunciado deve ser uma frase incompleta terminando em ':'. As alternativas completam a frase.",
    M3: "Liste de 3 a 5 assertivas (I, II, III…). As alternativas são combinações (ex.: 'Apenas I e III'). Inclua o campo 'assertivas' com label, textPt e correta (boolean).",
    M4: "O termo negativo (EXCETO/NÃO/INCORRETO) deve aparecer em MAIÚSCULAS no enunciado. Quatro alternativas são verdadeiras; o gabarito é a única falsa.",
    M5: "Use o campo 'assertion1' (proposição I) e 'assertion2' (razão — PORQUE). Inclua os booleanos a1Verdadeira, a2Verdadeira, relacaoCausal. As 5 alternativas são FIXAS conforme padrão ENADE.",
    M6: "O enunciado deve conter lacunas marcadas como [BLANK]. As alternativas preenchem as lacunas.",
    M7: "Inclua um texto-base (caso clínico, artigo, tabela ou gráfico descrito em texto). O enunciado deve exigir inferência.",
    M8: "Inclua o campo 'matching' com esquerda[], direita[] e pairs[]. As alternativas listam combinações (ex.: '1-a / 2-c / 3-b').",
    M9: "Liste os passos a serem ordenados em 'formatData.steps'. As alternativas são sequências diferentes.",
    M10: "Inclua 'grupoId' e 'posicaoBloco'. O texto-base é compartilhado entre as questões do bloco. As alternativas A-E são idênticas para todas as questões do mesmo grupoId.",
  };

  return `Você é um especialista em elaboração de itens de múltipla escolha para provas veterinárias (graduação, concursos, residência).

=== TAREFA ===
Crie ${opts.quantidade ?? 1} questão(ões) de múltipla escolha no formato JSON, seguindo RIGOROSAMENTE a estrutura abaixo.
${opts.modelId ? `\nModelo de item: ${opts.modelId} — ${modelInstr[opts.modelId] ?? "Múltipla escolha padrão"}` : ""}
${opts.discipline ? `Disciplina/Área: ${opts.discipline}` : ""}
${opts.subject ? `Assunto específico: ${opts.subject}` : ""}
${opts.difficulty ? `Dificuldade: ${opts.difficulty}` : ""}
${opts.year ? `Estilo de prova do ano: ${opts.year}` : ""}
${opts.banca ? `Estilo de banca: ${opts.banca}` : ""}
${opts.nivelCognitivo ? `Nível cognitivo (Bloom): ${opts.nivelCognitivo}` : ""}
${opts.instrucaoExtra ? `\nInstrução adicional: ${opts.instrucaoExtra}` : ""}

=== REGRAS OBRIGATÓRIAS ===
1. Sempre 5 alternativas (A, B, C, D, E). Exatamente 1 correta.
2. Nunca use "Todas as anteriores", "Nenhuma das anteriores" ou "a e b".
3. Alternativas homogêneas: mesma extensão, voz e estrutura gramatical.
4. O gabarito não deve ser revelado pelo comprimento ou pelo estilo da alternativa.
5. Justificativa obrigatória (explanationPt): explique por que o gabarito está correto E por que cada distrator está errado.
6. Não invente dados clínicos falsos — baseie-se em literatura veterinária estabelecida.

=== ESTRUTURA DO JSON (campos disponíveis) ===
${fieldRef}

=== FORMATO DE SAÍDA ===
Retorne SOMENTE o array JSON, sem markdown, sem comentários externos:
[{ ...campos da questão... }]

${opts.modelId === "M5" ? `\n=== ALTERNATIVAS FIXAS PARA M5 ===
A: "As duas afirmativas são verdadeiras e a segunda é justificativa correta da primeira."
B: "As duas afirmativas são verdadeiras, mas a segunda não é justificativa correta da primeira."
C: "A primeira afirmativa é verdadeira e a segunda é falsa."
D: "A primeira afirmativa é falsa e a segunda é verdadeira."
E: "As duas afirmativas são falsas."` : ""}`;
}

// ─── Categorias de campos para exibição ──────────────────────────────────────

export const CATEGORY_LABELS: Record<FieldCategory, string> = {
  identificacao:      "Identificação",
  conteudo:           "Conteúdo",
  alternativas:       "Alternativas",
  classificacao:      "Classificação e Proveniência",
  modelo:             "Modelo e Tipo",
  status:             "Status",
  m3_assertivas:      "M3 — Assertivas",
  m5_assercao_razao:  "M5 — Asserção–Razão",
  m8_associacao:      "M8 — Associação",
  m10_bloco:          "M10 — Bloco de Alternativas Constantes",
};
