SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Limpar e reinserir com encoding correto
DELETE FROM question_assertivas;
DELETE FROM discursive_questions;
DELETE FROM questions;

-- ════════════════════════════════════════════════════════════
-- QUESTÕES DE MÚLTIPLA ESCOLHA
-- ════════════════════════════════════════════════════════════

-- [1] M1 — Farmacologia / Ivermectina
INSERT INTO questions (id, disciplineId, subjectId, modelId, questionType, difficulty, year, banca, instituicao, carreira, textPt, options, correctOption, explanationPt, status, isValidated, validatedBy, validatedAt, active, isPremium, isAnulada, isDesatualizada, revisionCount, createdAt, updatedAt)
VALUES (1, 1, 1, 'M1', 'multiple_choice', 'medium', 2023, 'CESPE/CEBRASPE', 'UnB', 'Residência Veterinária',
'A ivermectina é um dos anti-helmínticos mais utilizados na clínica veterinária. Sobre seu mecanismo de ação, é CORRETO afirmar que:',
'[{"id":"A","textPt":"Inibe a síntese de DNA nos parasitas, impedindo sua replicação."},{"id":"B","textPt":"Bloqueia os receptores colinérgicos nicotínicos, causando paralisia espástica."},{"id":"C","textPt":"Potencializa os canais de cloreto dependentes de glutamato, causando paralisia flácida dos parasitas."},{"id":"D","textPt":"Inibe a síntese de ácidos graxos na membrana celular dos helmintos."},{"id":"E","textPt":"Atua como inibidor da acetilcolinesterase, acumulando acetilcolina na junção neuromuscular."}]',
'C',
'A ivermectina atua potencializando os canais de cloreto dependentes de glutamato (GluCl) e GABA nos invertebrados, resultando em aumento da permeabilidade ao Cl⁻, hiperpolarização da membrana e paralisia flácida do parasita. A alternativa A descreve mecanismo de quinolonas; B refere-se ao levamisol; D não corresponde a anti-helmíntico relevante; E descreve organofosforados.',
'approved', 1, 1, NOW(), 1, 0, 0, 0, 0, NOW(), NOW());

-- [2] M2 — Virologia / Parvovirose canina
INSERT INTO questions (id, disciplineId, subjectId, modelId, questionType, difficulty, year, banca, instituicao, carreira, textPt, options, correctOption, explanationPt, status, isValidated, validatedBy, validatedAt, active, isPremium, isAnulada, isDesatualizada, revisionCount, createdAt, updatedAt)
VALUES (2, 1, 2, 'M2', 'multiple_choice', 'easy', 2022, 'VUNESP', 'UNESP', 'Residência Veterinária',
'O período de incubação da parvovirose canina, definido como o intervalo entre a exposição ao vírus e o aparecimento dos primeiros sinais clínicos, é de:',
'[{"id":"A","textPt":"2 a 4 horas."},{"id":"B","textPt":"12 a 24 horas."},{"id":"C","textPt":"3 a 7 dias."},{"id":"D","textPt":"14 a 21 dias."},{"id":"E","textPt":"30 a 60 dias."}]',
'C',
'O parvovírus canino (CPV-2) apresenta período de incubação de 3 a 7 dias após exposição oronasal ao vírus. A rápida divisão celular das células do epitélio intestinal criptal os torna alvos preferenciais. A alternativa A corresponde a intoxicações agudas; B é compatível com infecções bacterianas hiperagudas; D e E são excessivamente longos para o CPV.',
'approved', 1, 1, NOW(), 1, 0, 0, 0, 0, NOW(), NOW());

-- [3] M3 — Bacteriologia / Brucelose bovina
INSERT INTO questions (id, disciplineId, subjectId, modelId, questionType, difficulty, year, banca, instituicao, carreira, textPt, options, correctOption, explanationPt, status, isValidated, validatedBy, validatedAt, active, isPremium, isAnulada, isDesatualizada, revisionCount, createdAt, updatedAt)
VALUES (3, 2, 4, 'M3', 'complex_multiple_choice', 'hard', 2023, 'INEP', 'MEC', 'ENADE Medicina Veterinária',
'A brucelose bovina é uma zoonose de notificação compulsória no Brasil. Analise as assertivas a seguir e assinale a alternativa CORRETA:\n\nI. O agente etiológico Brucella abortus é uma bactéria Gram-negativa intracelular facultativa.\nII. A principal via de transmissão entre bovinos é a ingestão de placentas, fetos abortados e secreções uterinas contaminadas.\nIII. A vacinação de fêmeas bovinas entre 3 e 8 meses com a cepa B19 é obrigatória em todo o território nacional.\nIV. O teste do antígeno acidificado tamponado (AAT) é utilizado como teste de triagem por sua alta sensibilidade.',
'[{"id":"A","textPt":"Apenas I e II."},{"id":"B","textPt":"Apenas I e IV."},{"id":"C","textPt":"Apenas II e III."},{"id":"D","textPt":"I, II e IV."},{"id":"E","textPt":"I, II, III e IV."}]',
'D',
'I — VERDADEIRA: B. abortus é Gram-negativa, cocobacilo, intracelular facultativa. II — VERDADEIRA: transmissão principalmente pela via digestiva com material infectante de origem reprodutiva. III — FALSA: a obrigatoriedade varia por estado. IV — VERDADEIRA: o AAT é teste de triagem com alta sensibilidade, usado no rastreamento inicial.',
'approved', 1, 1, NOW(), 1, 0, 0, 0, 0, NOW(), NOW());

-- [4] M4 — Virologia / Características dos vírus
INSERT INTO questions (id, disciplineId, subjectId, modelId, questionType, difficulty, year, banca, instituicao, carreira, textPt, options, correctOption, explanationPt, status, isValidated, validatedBy, validatedAt, active, isPremium, isAnulada, isDesatualizada, revisionCount, createdAt, updatedAt)
VALUES (4, 3, 6, 'M4', 'multiple_choice', 'medium', 2022, 'FGV', 'UFMG', 'Concurso Público — Médico Veterinário',
'Em relação às características gerais dos vírus causadores de doenças nos animais domésticos, assinale a alternativa INCORRETA:',
'[{"id":"A","textPt":"São parasitas intracelulares obrigatórios, incapazes de se replicar fora de células hospedeiras vivas."},{"id":"B","textPt":"Possuem apenas um tipo de ácido nucleico em seu genoma, podendo ser DNA ou RNA, simples ou dupla fita."},{"id":"C","textPt":"Não possuem ribossomos próprios, dependendo da maquinaria ribossômica da célula hospedeira para síntese proteica."},{"id":"D","textPt":"Apresentam metabolismo energético próprio e independente, produzindo ATP por fosforilação oxidativa."},{"id":"E","textPt":"Vírus envelopados adquirem seu envelope lipídico a partir das membranas da célula hospedeira durante a brotação."}]',
'D',
'A alternativa D é INCORRETA (gabarito). Vírus NÃO possuem metabolismo energético próprio — dependem completamente da célula hospedeira para obtenção de ATP. As demais são corretas: A — parasitismo intracelular obrigatório; B — genoma com único tipo de ácido nucleico; C — ausência de ribossomos próprios; E — envelope lipídico derivado das membranas do hospedeiro.',
'approved', 1, 1, NOW(), 1, 0, 0, 0, 0, NOW(), NOW());

-- [5] M5 — Imunologia / Raiva animal
INSERT INTO questions (id, disciplineId, subjectId, modelId, questionType, difficulty, year, banca, instituicao, carreira, textPt, assertion1, assertion2, a1Verdadeira, a2Verdadeira, relacaoCausal, options, correctOption, explanationPt, status, isValidated, validatedBy, validatedAt, active, isPremium, isAnulada, isDesatualizada, revisionCount, createdAt, updatedAt)
VALUES (5, 2, 5, 'M5', 'assertion_reason', 'hard', 2023, 'CESPE/CEBRASPE', 'UnB', 'Residência Veterinária',
'A vacina antirrábica de vírus inativado confere proteção eficaz contra a raiva em cães e gatos com duração de pelo menos um ano após a vacinação inicial,\nPORQUE\na vacinação estimula a produção de anticorpos neutralizantes contra a glicoproteína G do vírus rábico, que é o principal determinante antigênico responsável pela neutralização viral.',
'A vacina antirrábica de vírus inativado confere proteção eficaz contra a raiva em cães e gatos com duração de pelo menos um ano após a vacinação inicial.',
'A vacinação estimula a produção de anticorpos neutralizantes contra a glicoproteína G do vírus rábico, que é o principal determinante antigênico responsável pela neutralização viral.',
TRUE, TRUE, TRUE,
'[{"id":"A","textPt":"As duas afirmativas são verdadeiras e a segunda é uma justificativa correta da primeira."},{"id":"B","textPt":"As duas afirmativas são verdadeiras, mas a segunda não é uma justificativa correta da primeira."},{"id":"C","textPt":"A primeira afirmativa é verdadeira e a segunda é falsa."},{"id":"D","textPt":"A primeira afirmativa é falsa e a segunda é verdadeira."},{"id":"E","textPt":"As duas afirmativas são falsas."}]',
'A',
'A Asserção I é VERDADEIRA: vacinas antirrábicas inativadas proporcionam proteção documentada por 1 a 3 anos. A Asserção II é VERDADEIRA: a glicoproteína G é o único antígeno viral capaz de induzir anticorpos neutralizantes. A relação causal é CORRETA: o mecanismo descrito em II explica a proteção descrita em I. Gabarito: A.',
'approved', 1, 1, NOW(), 1, 1, 0, 0, 0, NOW(), NOW());

-- [6] M1 Premium — Cirurgia / OSH equina
INSERT INTO questions (id, disciplineId, subjectId, modelId, questionType, difficulty, year, banca, instituicao, carreira, areaFormacao, textPt, options, correctOption, explanationPt, status, isValidated, validatedBy, validatedAt, active, isPremium, isAnulada, isDesatualizada, revisionCount, createdAt, updatedAt)
VALUES (6, 3, 7, 'M1', 'multiple_choice', 'very_hard', 2024, 'INEP', 'MEC', 'ENADE Medicina Veterinária', 'Medicina Veterinária',
'Em procedimento cirúrgico de ovário-salpingo-histerectomia (OSH) eletiva em cadela adulta, após ligadura do pedículo ovariano esquerdo, o cirurgião observa sangramento arterial pulsátil na região. A estrutura vascular mais provável responsável pelo sangramento, caso a ligadura tenha falhado, é:',
'[{"id":"A","textPt":"Artéria femoral, ramo direto da artéria ilíaca externa."},{"id":"B","textPt":"Artéria ovariana, ramo direto da aorta abdominal."},{"id":"C","textPt":"Artéria uterina, ramo da artéria vaginal."},{"id":"D","textPt":"Artéria mesentérica caudal, ramo da aorta abdominal."},{"id":"E","textPt":"Artéria pudenda interna, ramo da artéria ilíaca interna."}]',
'B',
'A artéria ovariana em cadelas é ramo direto da aorta abdominal e corre no mesovário para suprir o ovário. Na OSH, o pedículo ovariano contém a artéria e veia ovarianas; a falha na ligadura resulta em sangramento da artéria ovariana. A artéria uterina (C) supre o corpo uterino, não o pedículo ovariano.',
'approved', 1, 1, NOW(), 1, 1, 0, 0, 0, NOW(), NOW());

-- [7] M1 — Nutrição / Leite bovino (PENDENTE de validação)
INSERT INTO questions (id, disciplineId, subjectId, modelId, questionType, difficulty, year, carreira, textPt, options, correctOption, explanationPt, status, isValidated, active, isPremium, isAnulada, isDesatualizada, revisionCount, createdAt, updatedAt, createdBy)
VALUES (7, 4, 8, 'M1', 'multiple_choice', 'easy', 2023, 'Concurso Público',
'Em relação à composição nutricional do leite bovino integral, qual dos seguintes componentes apresenta maior variação em função da raça e da fase de lactação?',
'[{"id":"A","textPt":"Água, que representa em média 87% da composição total."},{"id":"B","textPt":"Lactose, mantida relativamente constante entre 4,5 e 5%."},{"id":"C","textPt":"Gordura, que varia de 2,5% a mais de 6% conforme raça e estágio da lactação."},{"id":"D","textPt":"Cinzas (minerais totais), que representam cerca de 0,7% de forma estável."},{"id":"E","textPt":"Proteína total, que permanece constante em 3,2% ao longo de toda a lactação."}]',
'C',
'O teor de gordura é o componente com maior variabilidade: raças Holstein apresentam 3,5-4%, Jersey pode atingir 5-6%. A lactose é relativamente estável; a proteína varia mas menos que a gordura; água e minerais são os mais constantes.',
'pending', 0, 1, 0, 0, 0, 0, NOW(), NOW(), 2);


-- ════════════════════════════════════════════════════════════
-- QUESTÕES DISCURSIVAS
-- ════════════════════════════════════════════════════════════

-- [D1] Resistência anti-helmíntica
INSERT INTO discursive_questions (id, disciplineId, subjectId, difficulty, year, author, subjectTag, textPt, expectedAnswerPt, isValidated, validatedBy, validatedAt, active, isPremium, createdAt, updatedAt)
VALUES (1, 1, 1, 'hard', 2023, 'CESPE/CEBRASPE', 'Farmacologia — Resistência Anti-helmíntica',
'A resistência anti-helmíntica representa um dos maiores desafios para a produção pecuária sustentável no Brasil. Considerando os mecanismos de desenvolvimento e propagação da resistência parasitária:\n\n(a) Explique o conceito de "refugia" e sua importância nas estratégias de controle.\n\n(b) Descreva dois mecanismos moleculares pelos quais os parasitas desenvolvem resistência à ivermectina.\n\n(c) Indique e justifique uma estratégia de manejo integrado para retardar o desenvolvimento de resistência.',
'(a) REFUGIA: população parasitária não exposta ao anti-helmíntico no momento do tratamento — inclui parasitas em hospedeiros não tratados, nas pastagens e nos estágios pré-parasitários. Sua manutenção dilui os genes de resistência: parasitas sensíveis (refugia) cruzam-se com os resistentes selecionados, reduzindo a frequência dos alelos de resistência na população.\n\n(b) Mecanismos de resistência à ivermectina:\n1. Mutações nos genes dos canais GluCl (avr-14, avr-15, glc-1): alterações nas subunidades dos canais de cloreto dependentes de glutamato reduzem a afinidade de ligação da ivermectina ao sítio-alvo, diminuindo o efeito paralítico.\n2. Superexpressão de glicoproteína-P (P-gp/ABCB): aumento da expressão de proteínas de efluxo que exportam ativamente a ivermectina para fora da célula, reduzindo sua concentração intracelular efetiva.\n\n(c) Tratamento Seletivo Estratégico (TSE) / FAMACHA®: tratar apenas animais que realmente necessitam (baseado em escore de mucosa ocular para estimar anemia), preservando animais saudáveis como refugia. Reduz a pressão seletiva, diminui custos e resíduos de fármacos.',
1, 1, NOW(), 1, 0, NOW(), NOW());

-- [D2] Leishmaniose visceral
INSERT INTO discursive_questions (id, disciplineId, subjectId, difficulty, year, author, subjectTag, textPt, expectedAnswerPt, isValidated, validatedBy, validatedAt, active, isPremium, createdAt, updatedAt)
VALUES (2, 2, 4, 'medium', 2022, 'VUNESP', 'Saúde Pública — Zoonoses',
'A leishmaniose visceral (LV) é uma zoonose de notificação compulsória no Brasil. Descreva:\n\n(a) O principal reservatório doméstico da Leishmania infantum no Brasil e seu papel epidemiológico.\n\n(b) As medidas de controle preconizadas pelo Ministério da Saúde para o vetor e para os reservatórios caninos.\n\n(c) Os critérios laboratoriais para o diagnóstico da LV em cães, diferenciando testes sorológicos dos parasitológicos.',
'(a) O cão doméstico (Canis lupus familiaris) é o principal reservatório doméstico e fonte de infecção para o vetor (Lutzomyia longipalpis) no ambiente peridomiciliar. Cães infectados, especialmente assintomáticos, apresentam alta parasitemia cutânea e são altamente infectantes para o vetor, favorecendo a manutenção do ciclo de transmissão zoonótico.\n\n(b) Medidas de controle:\n— Vetor: borrifação intradomiciliar com inseticidas residuais (piretroides); eliminação de criadouros; coleiras com deltametrina a 4% nos cães.\n— Reservatórios caninos: eutanásia dos cães soropositivos (protocolo oficial) ou tratamento com Miltefosine®; vacinação com Leish-Tec® em cães soronegativos em áreas de transmissão.\n\n(c) Diagnóstico laboratorial canino:\n— Sorológicos: ELISA (triagem — alta sensibilidade); RIFI (confirmatório). Possíveis reações cruzadas com Trypanosoma cruzi.\n— Parasitológicos: esfregaços e cultivo de medula óssea, baço ou linfonodo (alta especificidade, invasivos); PCR de sangue ou pele (alta sensibilidade e especificidade, útil em soronegativos recentes).',
1, 1, NOW(), 1, 0, NOW(), NOW());

-- [D3] Anestesia equina (PENDENTE de validação)
INSERT INTO discursive_questions (id, disciplineId, subjectId, difficulty, year, subjectTag, textPt, expectedAnswerPt, isValidated, active, isPremium, createdAt, updatedAt, createdBy)
VALUES (3, 3, 7, 'hard', 2024, 'Cirurgia — Anestesiologia Equina',
'Um equino adulto de 450 kg, macho inteiro, será submetido a cirurgia eletiva de castração em posição em estação. Descreva:\n\n(a) Medicação pré-anestésica (MPA) recomendada com doses.\n\n(b) Técnica de anestesia local a ser utilizada.\n\n(c) Possíveis complicações trans e pós-operatórias e sua prevenção.',
'(a) MPA: Xilazina (agonista α2-adrenérgico) 1,1 mg/kg IV ou 2,2 mg/kg IM. Pode ser associada ao butorfanol (0,02–0,05 mg/kg IV) para analgesia complementar.\n\n(b) Anestesia local — infiltração intratesticular e do cordão espermático: Lidocaína 2% sem vasoconstritor: 10–15 mL no parênquima testicular de cada testículo + 5–10 mL ao longo do cordão espermático. Total: 30–50 mL por animal. Aguardar 5–10 min para efeito completo.\n\n(c) Complicações e prevenção:\n— Hemorragia: emasculador adequado (Berry/Reimer), tempo de esmagamento 2–3 min; avaliação da hemostasia.\n— Evisceração: palpação dos anéis vaginais antes; correção cirúrgica imediata se ocorrer.\n— Infecção: assepsia rigorosa, não suturar a incisão (drenagem aberta), antibioticoterapia profilática.\n— Edema: exercício diário a partir do 2º dia pós-operatório.',
0, 1, 0, NOW(), NOW(), 2);

-- ════════════════════════════════════════════════════════════
-- ASSERTIVAS M3 (relacional)
-- ════════════════════════════════════════════════════════════
INSERT INTO question_assertivas (questionId, ordem, label, textPt, correta, createdAt) VALUES
  (3, 1, 'I',   'O agente etiológico Brucella abortus é uma bactéria Gram-negativa intracelular facultativa.', 1, NOW()),
  (3, 2, 'II',  'A principal via de transmissão entre bovinos é a ingestão de placentas, fetos abortados e secreções uterinas contaminadas.', 1, NOW()),
  (3, 3, 'III', 'A vacinação de fêmeas bovinas entre 3 e 8 meses de idade com a cepa B19 é obrigatória em todo o território nacional.', 0, NOW()),
  (3, 4, 'IV',  'O teste do antígeno acidificado tamponado (AAT) é utilizado como teste de triagem por sua alta sensibilidade.', 1, NOW());

-- ════════════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL
-- ════════════════════════════════════════════════════════════
SELECT 'questions' as tabela, COUNT(*) as total FROM questions
UNION ALL SELECT 'discursive_questions', COUNT(*) FROM discursive_questions
UNION ALL SELECT 'disciplines', COUNT(*) FROM disciplines
UNION ALL SELECT 'subjects', COUNT(*) FROM subjects
UNION ALL SELECT 'question_assertivas', COUNT(*) FROM question_assertivas;

SELECT id, modelId, difficulty, banca, status, isValidated, isPremium,
  LEFT(textPt, 70) as enunciado FROM questions ORDER BY id;
