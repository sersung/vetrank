-- ============================================================
-- Seed: Disciplinas + Assuntos + Questões de demonstração
-- VetRank — Medicina Veterinária
-- ============================================================

-- ─── Disciplinas ──────────────────────────────────────────────────────────────
INSERT INTO disciplines (id, slug, namePt, nameEn, icon, color, active, createdAt)
VALUES
  (1, 'ciencias-biologicas', 'Ciências Biológicas e Ciclo Básico', 'Biological Sciences', '🔬', '#22c55e', 1, NOW()),
  (2, 'med-vet-preventiva', 'Medicina Veterinária Preventiva e Saúde Pública', 'Preventive Vet Medicine', '🛡️', '#3b82f6', 1, NOW()),
  (3, 'clinica-cirurgia', 'Clínica e Cirurgia Veterinária', 'Vet Clinic and Surgery', '🩺', '#f59e0b', 1, NOW()),
  (4, 'producao-animal', 'Produção Animal e Inspeção de Produtos', 'Animal Production', '🐄', '#8b5cf6', 1, NOW()),
  (5, 'med-legal-etica', 'Medicina Veterinária Legal e Ética', 'Vet Legal Medicine', '⚖️', '#ef4444', 1, NOW())
ON DUPLICATE KEY UPDATE namePt = VALUES(namePt);

-- ─── Assuntos ──────────────────────────────────────────────────────────────────
INSERT INTO subjects (id, disciplineId, slug, namePt, nameEn, active, createdAt)
VALUES
  (1, 1, 'farmacologia', 'Farmacologia Veterinária', 'Veterinary Pharmacology', 1, NOW()),
  (2, 1, 'fisiologia', 'Fisiologia Animal', 'Animal Physiology', 1, NOW()),
  (3, 1, 'anatomia', 'Anatomia Veterinária', 'Veterinary Anatomy', 1, NOW()),
  (4, 2, 'epidemiologia', 'Epidemiologia e Controle de Zoonoses', 'Epidemiology and Zoonosis Control', 1, NOW()),
  (5, 2, 'vacinacao', 'Imunização e Vacinação Animal', 'Animal Vaccination', 1, NOW()),
  (6, 3, 'clinica-pequenos', 'Clínica de Pequenos Animais', 'Small Animal Clinic', 1, NOW()),
  (7, 3, 'cirurgia-geral', 'Cirurgia Geral Veterinária', 'General Veterinary Surgery', 1, NOW()),
  (8, 4, 'nutricao-animal', 'Nutrição e Alimentação Animal', 'Animal Nutrition', 1, NOW())
ON DUPLICATE KEY UPDATE namePt = VALUES(namePt);


-- ============================================================
-- QUESTÕES DE MÚLTIPLA ESCOLHA
-- ============================================================

-- ─── M1: Resposta Única — Farmacologia ────────────────────────────────────────
INSERT INTO questions (
  disciplineId, subjectId, modelId, questionType, difficulty, year,
  banca, instituicao, carreira,
  textPt, options, correctOption, explanationPt,
  status, isValidated, active, isPremium, isAnulada, isDesatualizada,
  revisionCount, createdAt, updatedAt
) VALUES (
  1, 1, 'M1', 'multiple_choice', 'medium', 2023,
  'CESPE/CEBRASPE', 'UnB', 'Residência Veterinária',
  'A ivermectina é um dos anti-helmínticos mais utilizados na clínica veterinária. Sobre seu mecanismo de ação, é CORRETO afirmar que:',
  JSON_ARRAY(
    JSON_OBJECT('id','A','textPt','Inibe a síntese de DNA nos parasitas, impedindo sua replicação.'),
    JSON_OBJECT('id','B','textPt','Bloqueia os receptores colinérgicos nicotínicos, causando paralisia espástica.'),
    JSON_OBJECT('id','C','textPt','Potencializa os canais de cloreto dependentes de glutamato, causando paralisia flácida dos parasitas.'),
    JSON_OBJECT('id','D','textPt','Inibe a síntese de ácidos graxos na membrana celular dos helmintos.'),
    JSON_OBJECT('id','E','textPt','Atua como inibidor da acetilcolinesterase, acumulando acetilcolina na junção neuromuscular.')
  ),
  'C',
  'A ivermectina atua potencializando os canais de cloreto dependentes de glutamato (GluCl) e GABA nos invertebrados, resultando em aumento da permeabilidade ao Cl⁻, hiperpolarização da membrana e paralisia flácida do parasita. Nos mamíferos, esses canais não cruzam a barreira hematoencefálica em condições normais, conferindo seletividade. A alternativa A descreve mecanismo de quinolonas; B refere-se ao levamisol; D não corresponde a nenhum anti-helmíntico relevante; E descreve organofosforados.',
  'approved', 1, 1, 0, 0, 0, 0, NOW(), NOW()
);

-- ─── M2: Afirmação Incompleta — Fisiologia ─────────────────────────────────────
INSERT INTO questions (
  disciplineId, subjectId, modelId, questionType, difficulty, year,
  banca, instituicao, carreira,
  textPt, options, correctOption, explanationPt,
  status, isValidated, active, isPremium, isAnulada, isDesatualizada,
  revisionCount, createdAt, updatedAt
) VALUES (
  1, 2, 'M2', 'multiple_choice', 'easy', 2022,
  'VUNESP', 'UNESP', 'Residência Veterinária',
  'O período de incubação da parvovirose canina, definido como o intervalo entre a exposição ao vírus e o aparecimento dos primeiros sinais clínicos, é de:',
  JSON_ARRAY(
    JSON_OBJECT('id','A','textPt','2 a 4 horas.'),
    JSON_OBJECT('id','B','textPt','12 a 24 horas.'),
    JSON_OBJECT('id','C','textPt','3 a 7 dias.'),
    JSON_OBJECT('id','D','textPt','14 a 21 dias.'),
    JSON_OBJECT('id','E','textPt','30 a 60 dias.')
  ),
  'C',
  'O parvovírus canino (CPV-2) apresenta período de incubação de 3 a 7 dias após exposição oronasal ao vírus. A rápida divisão celular das células do epitélio intestinal criptal e dos precursores hematopoiéticos os torna alvos preferenciais. A alternativa A corresponde a intoxicações agudas; B é compatível com infecções bacterianas hiperagudas; D e E são excessivamente longos para o CPV.',
  'approved', 1, 1, 0, 0, 0, 0, NOW(), NOW()
);

-- ─── M3: Combinações — Epidemiologia ───────────────────────────────────────────
INSERT INTO questions (
  disciplineId, subjectId, modelId, questionType, difficulty, year,
  banca, instituicao, carreira,
  textPt, options, correctOption, explanationPt,
  status, isValidated, active, isPremium, isAnulada, isDesatualizada,
  revisionCount, createdAt, updatedAt
) VALUES (
  2, 4, 'M3', 'complex_multiple_choice', 'hard', 2023,
  'INEP', 'MEC', 'ENADE Medicina Veterinária',
  'A brucelose bovina é uma zoonose de notificação compulsória no Brasil. Sobre essa doença, analise as assertivas a seguir e assinale a alternativa CORRETA:\n\nI. O agente etiológico Brucella abortus é uma bactéria Gram-negativa intracelular facultativa.\nII. A principal via de transmissão entre bovinos é a ingestão de placentas, fetos abortados e secreções uterinas contaminadas.\nIII. A vacinação de fêmeas bovinas entre 3 e 8 meses de idade com a cepa B19 (Brucelina) é obrigatória em todo o território nacional.\nIV. O teste do antígeno acidificado tamponado (AAT) é utilizado como teste de triagem por sua alta sensibilidade.',
  JSON_ARRAY(
    JSON_OBJECT('id','A','textPt','Apenas I e II.'),
    JSON_OBJECT('id','B','textPt','Apenas I e IV.'),
    JSON_OBJECT('id','C','textPt','Apenas II e III.'),
    JSON_OBJECT('id','D','textPt','I, II e IV.'),
    JSON_OBJECT('id','E','textPt','I, II, III e IV.')
  ),
  'D',
  'I — VERDADEIRA: B. abortus é Gram-negativa, cocobacilo, intracelular facultativa. II — VERDADEIRA: a transmissão se dá principalmente pela via digestiva com material infectante de origem reprodutiva. III — FALSA: a vacinação com B19 é obrigatória apenas em estados onde o programa nacional a exige; a faixa etária correta é 3–8 meses, mas a obrigatoriedade varia por estado. IV — VERDADEIRA: o AAT é teste de triagem com alta sensibilidade (poucos falsos negativos), usado no rastreamento inicial.',
  'approved', 1, 1, 0, 0, 0, 0, NOW(), NOW()
);

-- ─── M4: Foco Negativo — Clínica ────────────────────────────────────────────────
INSERT INTO questions (
  disciplineId, subjectId, modelId, questionType, difficulty, year,
  banca, instituicao, carreira,
  textPt, options, correctOption, explanationPt,
  status, isValidated, active, isPremium, isAnulada, isDesatualizada,
  revisionCount, createdAt, updatedAt
) VALUES (
  3, 6, 'M4', 'multiple_choice', 'medium', 2022,
  'FGV', 'UFMG', 'Concurso Público — Médico Veterinário',
  'Em relação às características gerais dos vírus causadores de doenças nos animais domésticos, assinale a alternativa INCORRETA:',
  JSON_ARRAY(
    JSON_OBJECT('id','A','textPt','São parasitas intracelulares obrigatórios, incapazes de se replicar fora de células hospedeiras vivas.'),
    JSON_OBJECT('id','B','textPt','Possuem apenas um tipo de ácido nucleico em seu genoma, podendo ser DNA ou RNA, simples ou dupla fita.'),
    JSON_OBJECT('id','C','textPt','Não possuem ribossomos próprios, dependendo da maquinaria ribossômica da célula hospedeira para síntese proteica.'),
    JSON_OBJECT('id','D','textPt','Apresentam metabolismo energético próprio e independente, produzindo ATP por fosforilação oxidativa.'),
    JSON_OBJECT('id','E','textPt','Vírus envelopados adquirem seu envelope lipídico a partir das membranas da célula hospedeira durante a brotação.')
  ),
  'D',
  'A alternativa D é INCORRETA e constitui o gabarito. Vírus NÃO possuem metabolismo energético próprio — são completamente dependentes da célula hospedeira para obtenção de energia (ATP) e para todos os processos biossintéticos. As demais afirmativas são corretas: A — parasitismo intracelular obrigatório é definitório; B — genoma com único tipo de ácido nucleico; C — ausência de ribossomos próprios; E — envelope lipídico derivado das membranas celulares do hospedeiro.',
  'approved', 1, 1, 0, 0, 0, 0, NOW(), NOW()
);

-- ─── M5: Asserção-Razão — Vacinação ─────────────────────────────────────────────
INSERT INTO questions (
  disciplineId, subjectId, modelId, questionType, difficulty, year,
  banca, instituicao, carreira,
  textPt, assertion1, assertion2, a1Verdadeira, a2Verdadeira, relacaoCausal,
  options, correctOption, explanationPt,
  status, isValidated, active, isPremium, isAnulada, isDesatualizada,
  revisionCount, createdAt, updatedAt
) VALUES (
  2, 5, 'M5', 'assertion_reason', 'hard', 2023,
  'CESPE/CEBRASPE', 'UnB', 'Residência Veterinária',
  'A vacina antirrábica de vírus inativado confere proteção eficaz contra a raiva em cães e gatos com duração de pelo menos um ano após a vacinação inicial,\nPORQUE\na vacinação estimula a produção de anticorpos neutralizantes contra a glicoproteína G do vírus rábico, que é o principal determinante antigênico responsável pela neutralização viral.',
  'A vacina antirrábica de vírus inativado confere proteção eficaz contra a raiva em cães e gatos com duração de pelo menos um ano após a vacinação inicial.',
  'A vacinação estimula a produção de anticorpos neutralizantes contra a glicoproteína G do vírus rábico, que é o principal determinante antigênico responsável pela neutralização viral.',
  TRUE, TRUE, TRUE,
  JSON_ARRAY(
    JSON_OBJECT('id','A','textPt','As duas afirmativas são verdadeiras e a segunda é uma justificativa correta da primeira.'),
    JSON_OBJECT('id','B','textPt','As duas afirmativas são verdadeiras, mas a segunda não é uma justificativa correta da primeira.'),
    JSON_OBJECT('id','C','textPt','A primeira afirmativa é verdadeira e a segunda é falsa.'),
    JSON_OBJECT('id','D','textPt','A primeira afirmativa é falsa e a segunda é verdadeira.'),
    JSON_OBJECT('id','E','textPt','As duas afirmativas são falsas.')
  ),
  'A',
  'A Asserção I é VERDADEIRA: vacinas antirrábicas inativadas proporcionam proteção documentada por pelo menos 1 a 3 anos em cães e gatos. A Asserção II é VERDADEIRA: a glicoproteína G é o único antígeno viral capaz de induzir anticorpos neutralizantes, sendo o principal alvo vacinal. A relação causal é CORRETA: o mecanismo descrito em II (produção de anticorpos anti-glicoproteína G) é a base imunológica que explica a proteção descrita em I. Gabarito: A.',
  'approved', 1, 1, 0, 0, 0, 0, NOW(), NOW()
);

-- ─── M1: Questão Premium com imagem — Cirurgia ──────────────────────────────────
INSERT INTO questions (
  disciplineId, subjectId, modelId, questionType, difficulty, year,
  banca, instituicao, carreira, areaFormacao,
  textPt, options, correctOption, explanationPt,
  status, isValidated, active, isPremium, isAnulada, isDesatualizada,
  revisionCount, createdAt, updatedAt
) VALUES (
  3, 7, 'M1', 'multiple_choice', 'very_hard', 2024,
  'INEP', 'MEC', 'ENADE Medicina Veterinária', 'Medicina Veterinária',
  'Em procedimento cirúrgico de ovário-salpingo-histerectomia (OSH) eletiva em cadela adulta, após ligadura do pedículo ovariano esquerdo, o cirurgião observa sangramento arterial pulsátil na região. A estrutura vascular mais provável responsável pelo sangramento, caso a ligadura tenha falhado, é:',
  JSON_ARRAY(
    JSON_OBJECT('id','A','textPt','Artéria femoral, ramo direto da artéria ilíaca externa.'),
    JSON_OBJECT('id','B','textPt','Artéria ovariana, ramo direto da aorta abdominal.'),
    JSON_OBJECT('id','C','textPt','Artéria uterina, ramo da artéria vaginal.'),
    JSON_OBJECT('id','D','textPt','Artéria mesentérica caudal, ramo da aorta abdominal.'),
    JSON_OBJECT('id','E','textPt','Artéria pudenda interna, ramo da artéria ilíaca interna.')
  ),
  'B',
  'A artéria ovariana em cadelas é um ramo direto da aorta abdominal (assim como em humanos do sexo feminino) e corre no mesovário para suprir o ovário. Na OSH, o pedículo ovariano contém a artéria e veia ovarianas; a falha na ligadura desse pedículo resulta em sangramento arterial da artéria ovariana. A artéria uterina (C) supre o corpo uterino, não o pedículo ovariano. As demais estruturas (A, D, E) não fazem parte do pedículo ovariano.',
  'approved', 1, 1, 1, 0, 0, 0, NOW(), NOW()
);

-- ─── M1: Questão Pendente (criada por professor, aguarda validação) ───────────────
INSERT INTO questions (
  disciplineId, subjectId, modelId, questionType, difficulty, year,
  banca, carreira,
  textPt, options, correctOption, explanationPt,
  status, isValidated, active, isPremium, isAnulada, isDesatualizada,
  revisionCount, createdAt, updatedAt, createdBy
) VALUES (
  4, 8, 'M1', 'multiple_choice', 'easy', 2023,
  NULL, 'Concurso Público',
  'Em relação à composição nutricional do leite bovino integral, qual dos seguintes componentes apresenta maior variação em função da raça e da fase de lactação?',
  JSON_ARRAY(
    JSON_OBJECT('id','A','textPt','Água, que representa em média 87% da composição total.'),
    JSON_OBJECT('id','B','textPt','Lactose, mantida relativamente constante entre 4,5 e 5% independentemente de outros fatores.'),
    JSON_OBJECT('id','C','textPt','Gordura, que varia de 2,5% a mais de 6% conforme raça e estágio da lactação.'),
    JSON_OBJECT('id','D','textPt','Cinzas (minerais totais), que representam cerca de 0,7% de forma estável.'),
    JSON_OBJECT('id','E','textPt','Proteína total, que permanece constante em 3,2% ao longo de toda a lactação.')
  ),
  'C',
  'O teor de gordura é o componente do leite com maior variabilidade: raças especializadas para leite como Holstein apresentam médias de 3,5-4%, enquanto raças de dupla aptidão e Jersey podem atingir 5-6% ou mais. A fase de lactação também impacta significativamente, com colostro apresentando valores muito superiores. A lactose é relativamente estável; a proteína varia mas menos que a gordura; água e minerais são os mais constantes.',
  'pending', 0, 1, 0, 0, 0, 0, NOW(), NOW(), 2
);


-- ============================================================
-- QUESTÕES DISCURSIVAS
-- ============================================================

-- ─── Discursiva 1 — Farmacologia / Resistência anti-helmíntica ──────────────────
INSERT INTO discursive_questions (
  disciplineId, subjectId, difficulty, year,
  author, subjectTag,
  textPt, expectedAnswerPt,
  isValidated, active, isPremium, createdAt, updatedAt
) VALUES (
  1, 1, 'hard', 2023,
  'CESPE/CEBRASPE', 'Farmacologia — Resistência',
  'A resistência anti-helmíntica representa um dos maiores desafios para a produção pecuária sustentável no Brasil. Considerando os mecanismos de desenvolvimento e propagação da resistência parasitária aos anti-helmínticos:\n\n(a) Explique o conceito de "refugia" e sua importância nas estratégias de controle da resistência parasitária.\n\n(b) Descreva dois mecanismos moleculares pelos quais os parasitas desenvolvem resistência à ivermectina.\n\n(c) Indique e justifique uma estratégia de manejo integrado que contribua para retardar o desenvolvimento de resistência.',
  '(a) REFUGIA refere-se à população parasitária não exposta ao anti-helmíntico no momento do tratamento — inclui parasitas em hospedeiros não tratados, nas pastagens, nos estágios pré-parasitários e em fêmeas em lactação não tratadas. Sua manutenção é fundamental pois dilui os genes de resistência: os parasitas sensíveis (refugia) que sobrevivem se cruzam com os resistentes selecionados pelo tratamento, reduzindo a frequência dos alelos de resistência na população. Estratégias que preservam a refugia (ex.: tratamento seletivo) são mais sustentáveis que o tratamento em massa.\n\n(b) Dois mecanismos de resistência à ivermectina:\n1. Mutações nos genes dos canais GluCl (avr-14, avr-15, glc-1): alterações nos genes que codificam as subunidades dos canais de cloreto dependentes de glutamato reduzem a afinidade de ligação da ivermectina ao seu sítio-alvo, diminuindo ou abolindo o efeito paralítico.\n2. Superexpressão de glicoproteína-P (P-gp): aumento na expressão de proteínas de efluxo da família ABC (ABCB/P-gp) na cutícula e intestino dos parasitas, que exportam ativamente a ivermectina para fora da célula, reduzindo sua concentração intracelular efetiva.\n\n(c) Tratamento Seletivo Estratégico (TSE) ou FAMACHA®: tratar apenas os animais que realmente necessitam (baseado em escore de mucosa ocular para estimar grau de anemia), preservando os animais saudáveis como refugia. Justificativa: reduz a pressão seletiva sobre a população parasitária, mantém animais como fonte de parasitas suscetíveis, diminui custos e resíduos de fármacos.',
  1, 1, 0, NOW(), NOW()
);

-- ─── Discursiva 2 — Saúde Pública / Zoonoses ────────────────────────────────────
INSERT INTO discursive_questions (
  disciplineId, subjectId, difficulty, year,
  author, subjectTag,
  textPt, expectedAnswerPt,
  isValidated, active, isPremium, createdAt, updatedAt
) VALUES (
  2, 4, 'medium', 2022,
  'VUNESP', 'Saúde Pública — Zoonoses Emergentes',
  'A leishmaniose visceral (LV) é uma zoonose de notificação compulsória no Brasil, com vetores, reservatórios e distribuição geográfica bem estabelecidos.\n\nDescreva:\n(a) O principal reservatório doméstico da Leishmania infantum no Brasil e seu papel epidemiológico.\n(b) As medidas de controle preconizadas pelo Ministério da Saúde para o vetor e para os reservatórios caninos.\n(c) Os critérios laboratoriais para o diagnóstico da LV em cães, diferenciando os testes sorológicos dos parasitológicos.',
  '(a) O cão doméstico (Canis lupus familiaris) é o principal reservatório doméstico e fonte de infecção para o vetor (flebotomíneo Lutzomyia longipalpis) no ambiente peridomiciliar. Cães infectados, especialmente os assintomáticos ou oligossintomáticos, apresentam alta parasitemia cutânea e são altamente infectantes para o vetor. Sua proximidade ao homem e ao vetor favorece a manutenção do ciclo de transmissão zoonótico.\n\n(b) Medidas de controle:\n— Vetor: borrifação intradomiciliar com inseticidas residuais (piretroides) em áreas de transmissão; eliminação de criadouros e fontes de matéria orgânica que atraem os flebotomíneos; coleiras com deltametrina a 4% nos cães.\n— Reservatórios caninos: eutanásia dos cães soropositivos (polêmica, revisada em 2016 com uso de domperidona — MiltefosineVet® aprovado no Brasil como tratamento canino); uso de coleiras repelentes; vacinação com Leish-Tec® (única vacina aprovada pelo MAPA no Brasil) em cães soronegativos em áreas de transmissão.\n\n(c) Diagnóstico laboratorial canino:\n— Sorológicos (pesquisa de anticorpos): ELISA (teste padrão ouro para triagem em programas de controle), RIFI (imunofluorescência indireta — utilizado como confirmatório). Alta sensibilidade mas pode haver reações cruzadas com Trypanosoma cruzi e outras leishmânias.\n— Parasitológicos (pesquisa direta do parasita): esfregaços e cultivo de medula óssea, baço ou linfonodo (alta especificidade, mas invasivos e de menor sensibilidade em cães assintomáticos); PCR de sangue ou pele (alta sensibilidade e especificidade, útil em animais soronegativos recentes).',
  1, 1, 0, NOW(), NOW()
);

-- ─── Discursiva 3 — Clínica Cirúrgica (pendente, aguarda validação) ──────────────
INSERT INTO discursive_questions (
  disciplineId, subjectId, difficulty, year,
  subjectTag,
  textPt, expectedAnswerPt,
  isValidated, active, isPremium, createdAt, updatedAt, createdBy
) VALUES (
  3, 7, 'hard', 2024,
  'Cirurgia — Anestesiologia',
  'Um equino adulto de 450 kg, macho inteiro, será submetido a cirurgia eletiva de castração em posição em estação (standing castration). Descreva o protocolo anestésico/analgésico mais adequado para esse procedimento, incluindo:\n\n(a) Medicação pré-anestésica (MPA) recomendada com doses.\n(b) Técnica de anestesia local a ser utilizada.\n(c) Possíveis complicações trans e pós-operatórias e sua prevenção.',
  '(a) MPA recomendada: Xilazina (agonista α2-adrenérgico) na dose de 1,1 mg/kg IV ou 2,2 mg/kg IM, com início de efeito em 3-5 minutos IV. Proporciona sedação, analgesia visceral e relaxamento muscular adequados para o procedimento em estação. Pode ser associada ao butorfanol (0,02-0,05 mg/kg IV) para analgesia complementar e maior tranquilização.\n\n(b) Anestesia local — Técnica de infiltração intratesticular e do cordão espermático:\n- Lidocaína 2% sem vasoconstritor: infiltrar 10-15 mL diretamente no parênquima testicular de cada testículo (anestesia do testículo); infiltrar 5-10 mL ao longo do cordão espermático (anestesia das estruturas do cordão). Total: 30-50 mL de lidocaína por animal. Aguardar 5-10 minutos para efeito completo. A mepivacaína (Carbocaína) é alternativa de ação mais duradoura.\n\n(c) Complicações e prevenção:\n— Hemorragia do coto do cordão espermático: uso de emasculador adequado (Berry ou Reimer), com tempo de esmagamento de 2-3 minutos; avaliação da hemostasia antes do fechamento.\n— Evisceração (protrusão de alça intestinal pelo anel vaginal): mais comum em asininos e muares; palpação dos anéis vaginais antes; redução e correção cirúrgica imediata se ocorrer.\n— Infecção/abscesso: assepsia rigorosa do campo, não suturar a incisão escrotal (drenagem aberta), antibioticoterapia profilática (penicilina G benzatina).\n— Edema escrotal pós-operatório: exercício diário a partir do 2º dia PO (trote no piquete), aplicação de fomentos frios.',
  0, 1, 0, NOW(), NOW(), 2
);

-- ─── Verificação ──────────────────────────────────────────────────────────────────
SELECT 'questions' as tabela, COUNT(*) as total FROM questions
UNION ALL
SELECT 'discursive_questions', COUNT(*) FROM discursive_questions
UNION ALL
SELECT 'disciplines', COUNT(*) FROM disciplines
UNION ALL
SELECT 'subjects', COUNT(*) FROM subjects;
ENDSQL