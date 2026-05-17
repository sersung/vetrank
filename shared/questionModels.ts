/**
 * Catálogo oficial de modelos de itens de múltipla escolha — VetRank v1.0
 * Fonte: especificação interna baseada em INEP/ENADE e boas práticas de elaboração de itens.
 *
 * Cada modelo (M1–M10) define:
 *  - estrutura de campos
 *  - regras de qualidade
 *  - campos obrigatórios/opcionais no dataset
 *  - validações automáticas sugeridas
 *  - exemplo mínimo de formato
 */

export type ModelId =
  | "M1" | "M2" | "M3" | "M4" | "M5"
  | "M6" | "M7" | "M8" | "M9" | "M10";

export type NivelCognitivo =
  | "memorização"
  | "compreensão"
  | "aplicação"
  | "análise"
  | "síntese"
  | "avaliação";

export type Dificuldade = "very_easy" | "easy" | "medium" | "hard" | "very_hard";

export interface AlternativasExemplo {
  A: string;
  B: string;
  C: string;
  D: string;
  E: string;
}

export interface ExemploItem {
  id: string;
  tipo_item: ModelId;
  texto_base: string | null;
  enunciado: string;
  alternativas: AlternativasExemplo;
  gabarito: "A" | "B" | "C" | "D" | "E";
  justificativa_gabarito: string;
  justificativas_distratores: AlternativasExemplo;
}

export interface QuestionModelDef {
  modelo_id: ModelId;
  /** questionType value used in the DB schema */
  db_question_type: string;
  nome_modelo: string;
  sinonimos_comuns: string[];
  descricao: string;
  quando_usar: string[];
  quando_evitar: string[];
  estrutura: {
    texto_base: { obrigatorio: boolean; observacao: string };
    enunciado: { padrao: string; exemplos_de_comando: string[] };
    alternativas: {
      quantidade: 5;
      rotulos: ["A", "B", "C", "D", "E"];
      regras_de_forma: string[];
    };
    campos_especificos?: Record<string, string>;
  };
  regras_de_qualidade: {
    unicidade_resposta: string[];
    distratores: string[];
    linguagem: string[];
    pistas_a_evitar: string[];
  };
  campos_dataset: {
    obrigatorios: string[];
    opcionais: string[];
  };
  validacoes_automaticas_sugeridas: string[];
  exemplo_minimo_item: ExemploItem;
}

// ─── Catálogo ─────────────────────────────────────────────────────────────────

export const QUESTION_MODELS_CATALOG: {
  versao_catalogo: string;
  idioma: string;
  modelos: QuestionModelDef[];
  observacoes_globais: string[];
} = {
  versao_catalogo: "1.0",
  idioma: "pt-BR",
  observacoes_globais: [
    "Todos os modelos usam exatamente 5 alternativas rotuladas A–E, com uma única resposta correta.",
    "Nunca use alternativas do tipo 'Todas as anteriores' ou 'Nenhuma das anteriores'.",
    "O enunciado deve ter uma única interpretação possível.",
    "Distratores devem ser homogêneos em extensão, nível de linguagem e estrutura gramatical.",
    "Destaque tipográfico (NEGRITO/MAIÚSCULAS) é obrigatório apenas em M4 para o termo negativo.",
    "Para M10 (alternativas constantes), agrupe questões pelo campo grupo_id no banco de dados.",
    "Níveis cognitivos seguem taxonomia de Bloom revisada: memorização, compreensão, aplicação, análise, síntese, avaliação.",
    "O campo modelId (M1–M10) deve ser preenchido em toda questão nova; questões legadas recebem null.",
  ],
  modelos: [
    // ─── M1 ────────────────────────────────────────────────────────────────────
    {
      modelo_id: "M1",
      db_question_type: "multiple_choice",
      nome_modelo: "Resposta Única (Pergunta Direta)",
      sinonimos_comuns: ["item de resposta direta", "questão objetiva simples", "pergunta fechada"],
      descricao:
        "O enunciado formula uma pergunta clara e direta. O candidato deve identificar a alternativa factualmente correta entre as cinco opções. É o modelo mais comum e versátil.",
      quando_usar: [
        "Verificar conhecimento factual ou conceitual objetivo.",
        "Avaliar definições, mecanismos, classificações e dados precisos.",
        "Nível cognitivo: memorização, compreensão e aplicação direta.",
      ],
      quando_evitar: [
        "Quando a resposta depende de opinião, ponto de vista pessoal ou contexto indefinido.",
        "Quando for mais adequado avaliar raciocínio complexo (prefira M3, M5 ou M7).",
      ],
      estrutura: {
        texto_base: {
          obrigatorio: false,
          observacao:
            "Pode incluir caso clínico curto, citação ou contexto situacional que fundamenta a pergunta.",
        },
        enunciado: {
          padrao:
            "Pergunta direta terminando em '?' ou comando imperativo claro (ex.: 'Assinale a alternativa CORRETA sobre...').",
          exemplos_de_comando: [
            "Qual é o principal mecanismo de ação do fármaco X?",
            "Assinale a alternativa que apresenta a definição CORRETA de Y.",
            "Sobre o processo Z, é CORRETO afirmar que:",
          ],
        },
        alternativas: {
          quantidade: 5,
          rotulos: ["A", "B", "C", "D", "E"],
          regras_de_forma: [
            "Cada alternativa deve ser gramaticalmente completa quando lida junto com o enunciado.",
            "Extensão similar entre alternativas (± 30% de caracteres).",
            "Sem sobreposição semântica entre distratores.",
            "Evitar termos absolutos como 'sempre', 'nunca', 'apenas' em alternativas corretas (a menos que verdadeiros).",
          ],
        },
      },
      regras_de_qualidade: {
        unicidade_resposta: [
          "Apenas uma alternativa deve ser inquestionavelmente correta.",
          "Revisar se algum distrator pode ser defendido como correto em algum contexto.",
        ],
        distratores: [
          "Usar erros conceituais reais e frequentes do público-alvo.",
          "Evitar distratores absurdos que facilitam eliminação imediata.",
          "Distratores devem ser plausíveis para quem não domina o conteúdo.",
        ],
        linguagem: [
          "Enunciado na voz ativa, tempo presente, linguagem técnica do nível da prova.",
          "Evitar dupla negação.",
          "Alternativas sem comentários extras que revelem o gabarito.",
        ],
        pistas_a_evitar: [
          "Alternativa correta com extensão significativamente maior.",
          "Uso de termos do enunciado apenas na alternativa correta.",
          "Padrão fixo de posição do gabarito.",
        ],
      },
      campos_dataset: {
        obrigatorios: [
          "id", "disciplineId", "subjectId", "modelId", "questionType",
          "nivelCognitivo", "dificuldade", "enunciado", "alternativas",
          "gabarito", "justificativa_gabarito", "justificativas_distratores",
        ],
        opcionais: [
          "texto_base", "banca", "ano", "instituicao", "cargo", "tags",
          "imageUrl", "fonte_referencia",
        ],
      },
      validacoes_automaticas_sugeridas: [
        "existe_apenas_um_gabarito",
        "alternativas_sem_sobreposicao_semantica",
        "enunciado_termina_em_interrogacao_ou_imperativo",
        "distratores_homogeneos_em_extensao",
      ],
      exemplo_minimo_item: {
        id: "EX_M1_001",
        tipo_item: "M1",
        texto_base: null,
        enunciado: "Qual das seguintes estruturas é responsável pela produção de insulina no organismo?",
        alternativas: {
          A: "Células alfa do pâncreas.",
          B: "Células beta do pâncreas.",
          C: "Células delta do pâncreas.",
          D: "Células acinar do pâncreas.",
          E: "Ductos de Wirsung.",
        },
        gabarito: "B",
        justificativa_gabarito:
          "As células beta das ilhotas de Langerhans são as únicas responsáveis pela síntese e secreção de insulina.",
        justificativas_distratores: {
          A: "Células alfa secretam glucagon, não insulina.",
          B: "Correta: células beta produzem insulina.",
          C: "Células delta secretam somatostatina.",
          D: "Células acinares produzem enzimas digestivas exócrinas.",
          E: "Ductos de Wirsung são vias de condução do suco pancreático, sem função secretora hormonal.",
        },
      },
    },

    // ─── M2 ────────────────────────────────────────────────────────────────────
    {
      modelo_id: "M2",
      db_question_type: "multiple_choice",
      nome_modelo: "Afirmação Incompleta",
      sinonimos_comuns: ["frase a completar", "lacuna no enunciado", "complemento de afirmação"],
      descricao:
        "O enunciado é uma frase ou proposição incompleta (termina com dois-pontos ou reticências). As alternativas completam a afirmação; apenas uma está correta.",
      quando_usar: [
        "Avaliar compreensão de conceitos que se expressam melhor como definições ou completamentos.",
        "Quando a estrutura de pergunta direta tornaria o item artificial ou truncado.",
        "Nível cognitivo: compreensão e aplicação.",
      ],
      quando_evitar: [
        "Quando o enunciado incompleto gerar ambiguidade sobre o que exatamente deve ser completado.",
        "Se mais de uma alternativa completar a frase de forma gramaticalmente e semanticamente válida.",
      ],
      estrutura: {
        texto_base: {
          obrigatorio: false,
          observacao: "Opcional; útil quando a afirmação precisa de contexto situacional prévio.",
        },
        enunciado: {
          padrao:
            "Frase declarativa incompleta terminando em ':' ou '...', seguida das alternativas de completamento.",
          exemplos_de_comando: [
            "O principal agente etiológico da doença X em bovinos é:",
            "A técnica de diagnóstico padrão-ouro para Y caracteriza-se por:",
            "Em relação ao metabolismo do cálcio, é CORRETO afirmar que:",
          ],
        },
        alternativas: {
          quantidade: 5,
          rotulos: ["A", "B", "C", "D", "E"],
          regras_de_forma: [
            "Cada alternativa deve completar a frase do enunciado formando uma sentença gramaticalmente correta.",
            "As alternativas devem ter a mesma categoria gramatical (ex.: todas substantivas, todas verbais).",
            "Extensão similar entre opções.",
            "Não iniciar alternativas com maiúsculas quando o enunciado já define o início da sentença.",
          ],
        },
      },
      regras_de_qualidade: {
        unicidade_resposta: [
          "Testar se cada distrator, ao completar o enunciado, forma uma afirmação claramente falsa.",
          "Garantir que a alternativa correta é inquestionavelmente verdadeira no contexto da área.",
        ],
        distratores: [
          "Usar conceitos próximos ao correto para criar confusão produtiva.",
          "Evitar completamentos gramaticalmente incorretos que delação o distrator.",
        ],
        linguagem: [
          "Enunciado e alternativas devem conectar-se fluidamente como uma frase única.",
          "Evitar que o gênero/número gramatical das alternativas revele o gabarito.",
        ],
        pistas_a_evitar: [
          "Artigos no final do enunciado que combinem com apenas uma alternativa (ex.: '...é uma').",
          "Alternativa correta gramaticalmente diferente das demais.",
        ],
      },
      campos_dataset: {
        obrigatorios: [
          "id", "disciplineId", "subjectId", "modelId", "questionType",
          "nivelCognitivo", "dificuldade", "enunciado", "alternativas",
          "gabarito", "justificativa_gabarito", "justificativas_distratores",
        ],
        opcionais: ["texto_base", "banca", "ano", "instituicao", "cargo", "tags", "imageUrl"],
      },
      validacoes_automaticas_sugeridas: [
        "existe_apenas_um_gabarito",
        "enunciado_termina_em_dois_pontos_ou_reticencias",
        "alternativas_completam_frase_gramaticalmente",
        "distratores_homogeneos_em_extensao",
      ],
      exemplo_minimo_item: {
        id: "EX_M2_001",
        tipo_item: "M2",
        texto_base: null,
        enunciado: "O período de incubação da doença X, definido como o intervalo entre a exposição ao agente e o aparecimento dos primeiros sinais clínicos, é de:",
        alternativas: {
          A: "2 a 5 horas.",
          B: "12 a 24 horas.",
          C: "3 a 7 dias.",
          D: "15 a 30 dias.",
          E: "3 a 6 meses.",
        },
        gabarito: "C",
        justificativa_gabarito:
          "O período de incubação padrão para este agente é de 3 a 7 dias, conforme literatura de referência da área.",
        justificativas_distratores: {
          A: "Intervalo muito curto; corresponde a intoxicações agudas, não a doenças infecciosas.",
          B: "Período compatível com infecções bacterianas de curso hiperagudo, não com a doença em questão.",
          C: "Correta: 3 a 7 dias é o período de incubação estabelecido.",
          D: "Período intermediário compatível com outras enfermidades de evolução subaguda.",
          E: "Período longo compatível com doenças de curso crônico ou doenças priônicas.",
        },
      },
    },

    // ─── M3 ────────────────────────────────────────────────────────────────────
    {
      modelo_id: "M3",
      db_question_type: "complex_multiple_choice",
      nome_modelo: "Resposta Múltipla / Combinações",
      sinonimos_comuns: ["item de combinações", "assertivas", "múltipla escolha composta", "itens I–IV"],
      descricao:
        "O enunciado apresenta um conjunto de assertivas numeradas (I, II, III, IV — máximo 5). As alternativas indicam quais assertivas são CORRETAS por meio de combinações. Cada assertiva é verdadeira ou falsa de forma independente.",
      quando_usar: [
        "Avaliar múltiplos aspectos de um conceito simultaneamente.",
        "Discriminar candidatos de alto desempenho em nível cognitivo de análise.",
        "Quando o conteúdo tem múltiplas facetas igualmente importantes.",
      ],
      quando_evitar: [
        "Quando o enunciado puder ser resolvido por M1 sem perda de qualidade.",
        "Com menos de 3 assertivas (resultado banal).",
        "Com mais de 5 assertivas (sobrecarga cognitiva excessiva).",
      ],
      estrutura: {
        texto_base: {
          obrigatorio: false,
          observacao: "Recomendado para contextualizar as assertivas; pode ser caso clínico ou situação-problema.",
        },
        enunciado: {
          padrao:
            "Apresenta as assertivas I, II, III (e opcionalmente IV) seguidas do comando de seleção das corretas.",
          exemplos_de_comando: [
            "Sobre o tema X, analise as assertivas a seguir e assinale a alternativa CORRETA:",
            "Com relação ao procedimento Y, são CORRETOS os itens:",
            "Considerando as propriedades de Z, identifique as afirmações verdadeiras:",
          ],
        },
        alternativas: {
          quantidade: 5,
          rotulos: ["A", "B", "C", "D", "E"],
          regras_de_forma: [
            "As alternativas devem ser combinações mutuamente exclusivas das assertivas.",
            "Formato recomendado: 'Apenas I'; 'I e II'; 'I, II e III'; 'II, III e IV'; 'I, II, III e IV'.",
            "Não repetir a mesma assertiva em mais de 3 alternativas (reduz discriminação).",
            "Distribuir a assertiva correta como parte de diferentes combinações para dificultar dedução.",
            "Nunca usar 'Todas' ou 'Nenhuma' como alternativa.",
          ],
        },
        campos_especificos: {
          assertivas: "Array de objetos {id: 'I'|'II'|'III'|'IV'|'V', texto: string, correta: boolean}",
          combinacoes_corretas:
            "Array de IDs das assertivas verdadeiras, ex.: ['I', 'III'] — determina o gabarito.",
        },
      },
      regras_de_qualidade: {
        unicidade_resposta: [
          "Somente uma combinação de alternativas deve corresponder ao conjunto de assertivas verdadeiras.",
          "Verificar se a combinação do gabarito é exclusiva entre as 5 alternativas.",
        ],
        distratores: [
          "Cada distrator deve incluir pelo menos uma assertiva falsa e excluir pelo menos uma verdadeira.",
          "Evitar alternativas que sejam superconjuntos óbvios do gabarito.",
        ],
        linguagem: [
          "Assertivas redigidas na mesma voz e nível de linguagem.",
          "Cada assertiva deve ser autossuficiente (compreensível sem contexto das outras).",
          "Assertivas com extensão similar entre si.",
        ],
        pistas_a_evitar: [
          "Assertiva correta com tom diferente (mais formal, mais longa) das incorretas.",
          "Usar termos absolutos apenas nas assertivas incorretas.",
          "Padrão de sempre incluir a assertiva 'I' no gabarito.",
        ],
      },
      campos_dataset: {
        obrigatorios: [
          "id", "disciplineId", "subjectId", "modelId", "questionType",
          "nivelCognitivo", "dificuldade", "enunciado", "assertivas",
          "alternativas", "gabarito", "justificativa_gabarito", "justificativas_distratores",
        ],
        opcionais: [
          "texto_base", "banca", "ano", "instituicao", "cargo",
          "tags", "imageUrl", "combinacoes_corretas",
        ],
      },
      validacoes_automaticas_sugeridas: [
        "existe_apenas_um_gabarito",
        "todas_as_assertivas_avaliadas_ao_menos_uma_vez",
        "combinacoes_mutualmente_exclusivas",
        "numero_assertivas_entre_3_e_5",
      ],
      exemplo_minimo_item: {
        id: "EX_M3_001",
        tipo_item: "M3",
        texto_base: null,
        enunciado:
          "Sobre as características do tecido X, analise as assertivas a seguir.\n\nI. O tecido X é avascular e recebe nutrição por difusão.\nII. As células do tipo alfa são as mais abundantes nesse tecido.\nIII. A matriz extracelular contém predominantemente colágeno tipo II.\nIV. O processo de remodelação ocorre continuamente ao longo da vida.\n\nSão CORRETAS apenas:",
        alternativas: {
          A: "I e II.",
          B: "I e III.",
          C: "II e IV.",
          D: "I, III e IV.",
          E: "II, III e IV.",
        },
        gabarito: "D",
        justificativa_gabarito:
          "As assertivas I (avascular), III (colágeno II) e IV (remodelação contínua) são corretas. A assertiva II é falsa: as células predominantes são do tipo beta, não alfa.",
        justificativas_distratores: {
          A: "Inclui I (correta) mas exclui III e IV; inclui II que é falsa.",
          B: "Inclui I e III (ambas corretas), mas exclui IV e inclui a falsa II implicitamente — combinação incompleta.",
          C: "Inclui II (falsa) e IV (correta); exclui I e III que são verdadeiras.",
          D: "Correta: I, III e IV são as únicas assertivas verdadeiras.",
          E: "Inclui II (falsa) com III e IV; exclui a verdadeira I.",
        },
      },
    },

    // ─── M4 ────────────────────────────────────────────────────────────────────
    {
      modelo_id: "M4",
      db_question_type: "multiple_choice",
      nome_modelo: "Foco Negativo (EXCETO / NÃO / INCORRETO)",
      sinonimos_comuns: ["item de exceção", "questão negativa", "item invertido"],
      descricao:
        "O enunciado pede que o candidato identifique a alternativa INCORRETA, FALSA ou que NÃO se aplica. O termo negativo deve ser destacado tipograficamente (MAIÚSCULAS e/ou negrito). Quatro alternativas são corretas; apenas uma é o gabarito por ser a errada.",
      quando_usar: [
        "Quando o conhecimento de exceções e casos especiais é clinicamente ou tecnicamente relevante.",
        "Para avaliar discriminação fina entre conceitos relacionados.",
        "Com parcimônia: no máximo 20% dos itens de uma prova.",
      ],
      quando_evitar: [
        "Como modelo predominante (confunde candidatos e reduz validade).",
        "Quando a exceção for óbvia ou trivial (item sem poder discriminativo).",
        "Em conjunto com dupla negação (ex.: 'NÃO é INCORRETO que...').",
      ],
      estrutura: {
        texto_base: {
          obrigatorio: false,
          observacao: "Pode contextualizar o domínio onde as exceções serão avaliadas.",
        },
        enunciado: {
          padrao:
            "Enunciado com termo negativo em MAIÚSCULAS e/ou negrito, solicitando a alternativa incorreta/falsa/que não se aplica.",
          exemplos_de_comando: [
            "Assinale a alternativa que NÃO corresponde a uma característica de X.",
            "São complicações da síndrome Y, EXCETO:",
            "Em relação ao procedimento Z, é INCORRETO afirmar que:",
          ],
        },
        alternativas: {
          quantidade: 5,
          rotulos: ["A", "B", "C", "D", "E"],
          regras_de_forma: [
            "Quatro alternativas devem ser CORRETAS (verdadeiras); apenas uma é o gabarito (incorreta).",
            "O gabarito (incorreto) deve ser plausível — não deve ser óbvio por absurdo.",
            "Todas as alternativas devem ter estrutura gramatical e extensão semelhantes.",
            "O destaque do termo negativo (EXCETO/NÃO/INCORRETO) é OBRIGATÓRIO no enunciado.",
          ],
        },
      },
      regras_de_qualidade: {
        unicidade_resposta: [
          "Confirmar que exatamente uma alternativa é falsa/incorreta no contexto dado.",
          "Testar se alguma das quatro 'corretas' pode ser questionada como incorreta.",
        ],
        distratores: [
          "Os quatro distratores (corretos) devem ser afirmações sólidas e inquestionáveis.",
          "O gabarito (incorreto) deve ser um erro conceitual real, não uma afirmação absurda.",
        ],
        linguagem: [
          "Todas as alternativas devem usar a mesma voz e tempo verbal.",
          "Evitar qualificadores que denunciem qual é o item falso.",
        ],
        pistas_a_evitar: [
          "Gabarito (incorreto) com extensão significativamente diferente das demais.",
          "Usar 'sempre' ou 'nunca' apenas no gabarito incorreto.",
          "Posição fixa do gabarito em itens negativos.",
        ],
      },
      campos_dataset: {
        obrigatorios: [
          "id", "disciplineId", "subjectId", "modelId", "questionType",
          "nivelCognitivo", "dificuldade", "enunciado", "alternativas",
          "gabarito", "justificativa_gabarito", "justificativas_distratores",
          "termo_negativo_destacado",
        ],
        opcionais: ["texto_base", "banca", "ano", "instituicao", "cargo", "tags"],
      },
      validacoes_automaticas_sugeridas: [
        "existe_apenas_um_gabarito",
        "enunciado_contem_termo_negativo_em_maiusculas",
        "quatro_alternativas_corretas_uma_incorreta",
        "gabarito_incorreto_plausivel",
      ],
      exemplo_minimo_item: {
        id: "EX_M4_001",
        tipo_item: "M4",
        texto_base: null,
        enunciado:
          "Em relação às características gerais dos vírus, assinale a alternativa INCORRETA:",
        alternativas: {
          A: "São parasitas intracelulares obrigatórios.",
          B: "Possuem apenas um tipo de ácido nucleico (DNA ou RNA).",
          C: "Não possuem ribossomos próprios.",
          D: "Apresentam metabolismo próprio independente da célula hospedeira.",
          E: "Podem ter envelope lipídico derivado da membrana do hospedeiro.",
        },
        gabarito: "D",
        justificativa_gabarito:
          "Vírus NÃO possuem metabolismo próprio; são completamente dependentes da maquinaria metabólica da célula hospedeira para replicação. D é a afirmação INCORRETA.",
        justificativas_distratores: {
          A: "Correta: vírus são parasitas intracelulares obrigatórios por definição.",
          B: "Correta: cada vírus possui apenas DNA ou RNA, nunca ambos simultaneamente.",
          C: "Correta: vírus não possuem ribossomos próprios; usam os do hospedeiro.",
          D: "INCORRETA (gabarito): vírus não têm metabolismo independente.",
          E: "Correta: vírus envelopados adquirem o envelope da membrana da célula hospedeira.",
        },
      },
    },

    // ─── M5 ────────────────────────────────────────────────────────────────────
    {
      modelo_id: "M5",
      db_question_type: "assertion_reason",
      nome_modelo: "Asserção–Razão",
      sinonimos_comuns: ["item PORQUE", "causa e efeito", "proposição–razão", "asserção-causalidade"],
      descricao:
        "Apresenta duas proposições (Asserção I e Asserção II) conectadas pela palavra 'PORQUE'. O candidato avalia: (a) a veracidade de cada proposição independentemente e (b) se a Asserção II é a razão correta da Asserção I. As alternativas são FIXAS em todos os itens M5.",
      quando_usar: [
        "Avaliar relação causal entre fenômenos (mecanismo de ação, fisiopatologia, justificativas clínicas).",
        "Nível cognitivo: análise e avaliação.",
        "Quando a compreensão da causalidade é o objetivo pedagógico central.",
      ],
      quando_evitar: [
        "Quando as duas proposições não tiverem relação causal potencial (o modelo perde sentido).",
        "Para conteúdos meramente factuais sem relação causa-efeito.",
        "Quando o candidato puder determinar o gabarito avaliando apenas uma das proposições.",
      ],
      estrutura: {
        texto_base: {
          obrigatorio: false,
          observacao: "Raramente necessário; o modelo é autocontido pelas duas asserções.",
        },
        enunciado: {
          padrao:
            "ASSERÇÃO I: [proposição 1]. PORQUE ASSERÇÃO II: [proposição 2]. Avalie as asserções e a relação proposta.",
          exemplos_de_comando: [
            "A vacinação reduz a mortalidade por doença X, PORQUE o antígeno vacinal estimula a produção de anticorpos neutralizantes.",
            "O fármaco Y deve ser administrado em jejum, PORQUE a presença de alimentos reduz sua absorção intestinal.",
          ],
        },
        alternativas: {
          quantidade: 5,
          rotulos: ["A", "B", "C", "D", "E"],
          regras_de_forma: [
            "As alternativas são FIXAS e padronizadas para todos os itens M5:",
            "A — As duas asserções são VERDADEIRAS e a segunda é uma justificativa CORRETA da primeira.",
            "B — As duas asserções são VERDADEIRAS, mas a segunda NÃO é uma justificativa correta da primeira.",
            "C — A asserção I é VERDADEIRA e a asserção II é FALSA.",
            "D — A asserção I é FALSA e a asserção II é VERDADEIRA.",
            "E — As duas asserções são FALSAS.",
          ],
        },
        campos_especificos: {
          assercao1: "texto: string — primeira proposição (causa ou fato principal)",
          assercao2: "texto: string — segunda proposição (razão ou explicação)",
          relacao_correta: "boolean — se a II explica corretamente a I quando ambas forem verdadeiras",
        },
      },
      regras_de_qualidade: {
        unicidade_resposta: [
          "Determinar inequivocamente V/F de cada asserção antes de definir a relação.",
          "Confirmar que a relação causal avaliada em 'A' vs 'B' seja não óbvia.",
        ],
        distratores: [
          "O modelo é fixo; a qualidade está na escolha das proposições.",
          "A Asserção II deve ser plausível como explicação da I mesmo quando falsa (distrator eficaz).",
        ],
        linguagem: [
          "Cada asserção deve ser autocontida e avaliável independentemente.",
          "Evitar que a veracidade de uma asserção seja revelada pelo texto da outra.",
          "Usar linguagem técnica precisa; termos vagos tornam a avaliação subjetiva.",
        ],
        pistas_a_evitar: [
          "Asserção II obviamente falsa quando a I é verdadeira.",
          "Relação causal óbvia que torna o item trivial (gabarito A sempre óbvio).",
        ],
      },
      campos_dataset: {
        obrigatorios: [
          "id", "disciplineId", "subjectId", "modelId", "questionType",
          "nivelCognitivo", "dificuldade", "assercao1", "assercao2",
          "gabarito", "justificativa_gabarito",
        ],
        opcionais: [
          "texto_base", "banca", "ano", "instituicao", "cargo",
          "tags", "relacao_correta",
        ],
      },
      validacoes_automaticas_sugeridas: [
        "alternativas_fixas_padrao_M5",
        "existe_apenas_um_gabarito",
        "assercao1_e_assercao2_preenchidas",
        "gabarito_consistente_com_veracidade_das_assercoes",
      ],
      exemplo_minimo_item: {
        id: "EX_M5_001",
        tipo_item: "M5",
        texto_base: null,
        enunciado:
          "A hipoglicemia é uma complicação frequente do uso de insulina exógena em doses excessivas,\nPORQUE\na insulina promove a captação de glicose pelos tecidos periféricos e inibe a glicogenólise hepática, reduzindo a glicemia sanguínea.\n\nA respeito das asserções acima, assinale a alternativa CORRETA:",
        alternativas: {
          A: "As duas asserções são verdadeiras e a segunda é uma justificativa correta da primeira.",
          B: "As duas asserções são verdadeiras, mas a segunda não é uma justificativa correta da primeira.",
          C: "A primeira asserção é verdadeira e a segunda é falsa.",
          D: "A primeira asserção é falsa e a segunda é verdadeira.",
          E: "As duas asserções são falsas.",
        },
        gabarito: "A",
        justificativa_gabarito:
          "A Asserção I é VERDADEIRA: hipoglicemia é de fato a principal complicação da insulinoterapia excessiva. A Asserção II é VERDADEIRA e descreve corretamente o mecanismo pelo qual a insulina reduz a glicemia (captação periférica + inibição da glicogenólise). A relação causal é válida: o mecanismo descrito em II explica o fenômeno descrito em I.",
        justificativas_distratores: {
          A: "Correta: ambas verdadeiras com relação causal válida.",
          B: "Incorreta: a Asserção II é sim a justificativa correta da I.",
          C: "Incorreta: a Asserção II é verdadeira, não falsa.",
          D: "Incorreta: a Asserção I é verdadeira.",
          E: "Incorreta: ambas as asserções são verdadeiras.",
        },
      },
    },

    // ─── M6 ────────────────────────────────────────────────────────────────────
    {
      modelo_id: "M6",
      db_question_type: "cloze",
      nome_modelo: "Lacuna (Cloze)",
      sinonimos_comuns: ["preenchimento de lacuna", "completar texto", "cloze", "fill in the blank"],
      descricao:
        "Um texto, definição ou protocolo apresenta uma ou mais lacunas indicadas por '[___]' ou numeradas ([1], [2]...). As alternativas preenchem a(s) lacuna(s). Com uma lacuna: alternativas simples. Com múltiplas: alternativas são combinações na ordem das lacunas.",
      quando_usar: [
        "Avaliar terminologia técnica, nomes de estruturas, fases de protocolos ou sequências fixas.",
        "Quando o contexto textual é essencial para determinar o termo correto.",
        "Nível cognitivo: memorização, compreensão e aplicação contextual.",
      ],
      quando_evitar: [
        "Quando a lacuna puder ser preenchida por mais de um termo igualmente correto.",
        "Com texto-base muito longo que gere fadiga antes de atingir a lacuna.",
        "Se a posição da lacuna no texto revelar dicas gramaticais sobre o gabarito.",
      ],
      estrutura: {
        texto_base: {
          obrigatorio: true,
          observacao:
            "O texto com as lacunas é o corpo principal do item. Lacunas simples: '[___]'. Múltiplas: '[1]', '[2]', '[3]'.",
        },
        enunciado: {
          padrao:
            "Instrução de preenchimento das lacunas, ex.: 'Assinale a alternativa que preenche CORRETAMENTE a(s) lacuna(s) do texto acima, na ordem em que aparecem.'",
          exemplos_de_comando: [
            "Assinale a alternativa que preenche CORRETAMENTE a lacuna do texto.",
            "Assinale a alternativa que completa, na ordem correta, as lacunas do fragmento acima.",
          ],
        },
        alternativas: {
          quantidade: 5,
          rotulos: ["A", "B", "C", "D", "E"],
          regras_de_forma: [
            "Com uma lacuna: cada alternativa é um único termo ou expressão.",
            "Com múltiplas lacunas: cada alternativa lista os termos na ordem das lacunas (ex.: 'X — Y — Z').",
            "Os termos em cada posição devem ser da mesma categoria semântica entre alternativas.",
            "Evitar alternativas onde um único termo diferente seja óbvio pelo contexto.",
          ],
        },
        campos_especificos: {
          lacunas: "Array de posições e respostas corretas: [{id:1, resposta:'termo_correto'}]",
          texto_com_lacunas: "string — texto original com marcadores [1], [2] etc.",
        },
      },
      regras_de_qualidade: {
        unicidade_resposta: [
          "O contexto deve restringir cada lacuna a exatamente um termo correto.",
          "Testar cada distrator no lugar do gabarito para confirmar que produz afirmação claramente falsa.",
        ],
        distratores: [
          "Usar termos da mesma família semântica do gabarito (ex.: outros hormônios, outros fármacos).",
          "Em lacunas múltiplas, variar quais posições estão corretas entre as alternativas.",
        ],
        linguagem: [
          "O texto deve ser fluente e natural com o gabarito inserido.",
          "Evitar lacunas no início da frase (contexto insuficiente para o candidato).",
        ],
        pistas_a_evitar: [
          "Artigos ou preposições antes da lacuna que combinem com apenas uma alternativa.",
          "Alternativa correta com extensão diferente das demais.",
        ],
      },
      campos_dataset: {
        obrigatorios: [
          "id", "disciplineId", "subjectId", "modelId", "questionType",
          "nivelCognitivo", "dificuldade", "texto_com_lacunas", "enunciado",
          "lacunas", "alternativas", "gabarito", "justificativa_gabarito",
        ],
        opcionais: [
          "banca", "ano", "instituicao", "cargo", "tags",
          "imageUrl", "justificativas_distratores",
        ],
      },
      validacoes_automaticas_sugeridas: [
        "existe_apenas_um_gabarito",
        "lacunas_marcadas_no_texto_base",
        "numero_de_termos_nas_alternativas_igual_ao_numero_de_lacunas",
        "contexto_restringe_lacuna_a_unica_resposta",
      ],
      exemplo_minimo_item: {
        id: "EX_M6_001",
        tipo_item: "M6",
        texto_base:
          "A fase de [1] do ciclo celular é caracterizada pela replicação do DNA, enquanto a fase [2] corresponde à divisão nuclear e separação dos cromossomos.",
        enunciado:
          "Assinale a alternativa que preenche CORRETAMENTE as lacunas [1] e [2] do texto acima, nessa ordem:",
        alternativas: {
          A: "G1 — G2.",
          B: "S — M.",
          C: "M — S.",
          D: "G2 — S.",
          E: "G0 — G1.",
        },
        gabarito: "B",
        justificativa_gabarito:
          "A fase S (síntese) é definida pela replicação do DNA. A fase M (mitótica) corresponde à divisão nuclear (mitose ou meiose) e separação dos cromossomos.",
        justificativas_distratores: {
          A: "G1 é fase de crescimento pré-S; G2 é fase pós-S — nenhum dos dois corresponde às descrições.",
          B: "Correta: S = replicação do DNA; M = divisão nuclear.",
          C: "Inversão: M precede S nesta alternativa, o que é biologicamente incorreto.",
          D: "G2 é fase pós-replicação; não corresponde à replicação do DNA descrita em [1].",
          E: "G0 é fase de quiescência; G1 é crescimento — nenhum corresponde às definições dadas.",
        },
      },
    },

    // ─── M7 ────────────────────────────────────────────────────────────────────
    {
      modelo_id: "M7",
      db_question_type: "interpretation",
      nome_modelo: "Interpretação (Texto / Gráfico / Tabela / Imagem)",
      sinonimos_comuns: [
        "item de leitura e interpretação",
        "análise de dados",
        "compreensão de texto científico",
        "item situacional",
      ],
      descricao:
        "Apresenta um texto científico, gráfico, tabela de dados ou imagem como texto-base. O enunciado requer inferência, análise ou aplicação do conteúdo apresentado — não apenas memorização. O candidato deve integrar informações do texto-base com o conhecimento da área.",
      quando_usar: [
        "Avaliar nível cognitivo de análise, síntese e avaliação.",
        "Quando habilidades de leitura científica são objetivos da avaliação.",
        "Para contextualizar conteúdo em situações reais de prática profissional.",
      ],
      quando_evitar: [
        "Quando a resposta puder ser obtida apenas pelo conhecimento prévio, sem necessidade do texto-base.",
        "Com textos/tabelas muito extensos que aumentem o tempo de leitura além do proposto.",
        "Quando a imagem ou gráfico não estiver em resolução adequada para avaliação.",
      ],
      estrutura: {
        texto_base: {
          obrigatorio: true,
          observacao:
            "Pode ser: excerto de artigo científico, relatório de caso, tabela de dados, gráfico (imageUrl), fotografia (imageUrl). Deve ser autossuficiente para responder a questão.",
        },
        enunciado: {
          padrao:
            "Comando que direciona a análise do texto-base, solicitando inferência ou julgamento.",
          exemplos_de_comando: [
            "Com base nos dados da tabela acima, é CORRETO concluir que:",
            "De acordo com o gráfico, a variável X apresentou maior valor no período:",
            "O texto sugere que a principal limitação do método descrito é:",
            "Com base no caso clínico apresentado, o diagnóstico mais provável é:",
          ],
        },
        alternativas: {
          quantidade: 5,
          rotulos: ["A", "B", "C", "D", "E"],
          regras_de_forma: [
            "As alternativas devem ser inferências ou conclusões deriváveis do texto-base.",
            "Distratores devem ser conclusões plausíveis mas incorretas à luz do texto-base.",
            "Evitar alternativas que requeiram conhecimento externo não presente no texto-base (a menos que seja o objetivo).",
          ],
        },
      },
      regras_de_qualidade: {
        unicidade_resposta: [
          "A resposta correta deve ser suportada por evidência explícita ou implícita no texto-base.",
          "Confirmar que nenhum distrator seja defensável pela leitura do texto-base.",
        ],
        distratores: [
          "Usar informações parciais ou mal interpretadas do texto-base.",
          "Incluir conclusões corretas em geral mas não suportadas pelo texto-base específico.",
        ],
        linguagem: [
          "Enunciado deve referenciar claramente o texto-base ('De acordo com o texto...', 'Segundo os dados...').",
          "Evitar questões que o candidato possa responder sem ler o texto-base.",
        ],
        pistas_a_evitar: [
          "Alternativa correta que parafraseia diretamente uma frase do texto (sem necessidade de inferência).",
          "Texto-base com pistas visuais que apontem para o gabarito.",
        ],
      },
      campos_dataset: {
        obrigatorios: [
          "id", "disciplineId", "subjectId", "modelId", "questionType",
          "nivelCognitivo", "dificuldade", "texto_base", "enunciado",
          "alternativas", "gabarito", "justificativa_gabarito",
        ],
        opcionais: [
          "imageUrl", "banca", "ano", "instituicao", "cargo",
          "tags", "fonte_texto_base", "justificativas_distratores",
        ],
      },
      validacoes_automaticas_sugeridas: [
        "existe_apenas_um_gabarito",
        "texto_base_preenchido",
        "gabarito_suportado_pelo_texto_base",
        "distratores_nao_suportados_pelo_texto_base",
      ],
      exemplo_minimo_item: {
        id: "EX_M7_001",
        tipo_item: "M7",
        texto_base:
          "Estudo avaliou 120 animais divididos em dois grupos: Grupo A (n=60) recebeu suplementação com o composto X durante 30 dias; Grupo B (n=60) recebeu placebo. Ao final, 45 animais do Grupo A e 20 do Grupo B atingiram o desfecho desejado. A diferença foi estatisticamente significativa (p < 0,001).",
        enunciado:
          "Com base nos dados do estudo acima, é CORRETO afirmar que:",
        alternativas: {
          A: "O composto X não influenciou o desfecho, pois ambos os grupos tiveram resultado positivo.",
          B: "O composto X aumentou a taxa de desfecho desejado em comparação ao placebo, com diferença estatisticamente significativa.",
          C: "O estudo não permite comparação entre os grupos por causa do tamanho amostral desigual.",
          D: "O resultado indica que o placebo foi mais eficaz que o composto X.",
          E: "A diferença observada pode ser atribuída ao acaso, pois p < 0,001 indica baixa significância.",
        },
        gabarito: "B",
        justificativa_gabarito:
          "O Grupo A teve 45/60 (75%) de desfecho versus 20/60 (33%) no Grupo B, diferença estatisticamente significativa (p < 0,001), indicando que o composto X aumentou a taxa de desfecho desejado.",
        justificativas_distratores: {
          A: "Incorreta: a diferença entre os grupos é substancial (75% vs 33%); não se pode afirmar ausência de efeito.",
          B: "Correta: 75% vs 33% com p < 0,001 sustenta a afirmação.",
          C: "Incorreta: os grupos são iguais em tamanho (n=60 cada).",
          D: "Incorreta: o Grupo A (composto X) teve taxa maior, não o Grupo B (placebo).",
          E: "Incorreta: p < 0,001 indica altíssima significância estatística, não baixa.",
        },
      },
    },

    // ─── M8 ────────────────────────────────────────────────────────────────────
    {
      modelo_id: "M8",
      db_question_type: "matching",
      nome_modelo: "Associação / Correspondência",
      sinonimos_comuns: ["item de relacionar colunas", "matching", "associação de pares", "liga colunas"],
      descricao:
        "Apresenta duas listas (Coluna I e Coluna II) com itens a serem associados em pares. As alternativas são combinações de numeração–letra que representam os pares corretos. Pode ser um-para-um ou com itens excedentes em uma das colunas.",
      quando_usar: [
        "Avaliar a capacidade de associar conceitos, estruturas, funções, autores ou classificações.",
        "Quando múltiplas associações corretas precisam ser verificadas simultaneamente.",
        "Nível cognitivo: compreensão e análise.",
      ],
      quando_evitar: [
        "Quando os pares corretos podem ser determinados por eliminação com apenas um par conhecido.",
        "Com mais de 6 itens por coluna (sobrecarga cognitiva).",
        "Quando os itens de uma coluna são muito heterogêneos (dificultam associação real).",
      ],
      estrutura: {
        texto_base: {
          obrigatorio: false,
          observacao: "Opcional; útil para contextualizar as duas colunas em um tema comum.",
        },
        enunciado: {
          padrao:
            "Apresentação das duas colunas (I e II) com instrução de associação, seguida das alternativas de combinação.",
          exemplos_de_comando: [
            "Associe os itens da Coluna I com os respectivos da Coluna II:",
            "Relacione cada estrutura da Coluna I com sua função descrita na Coluna II:",
          ],
        },
        alternativas: {
          quantidade: 5,
          rotulos: ["A", "B", "C", "D", "E"],
          regras_de_forma: [
            "Cada alternativa lista os pares na ordem dos itens da Coluna I (ex.: 1-b, 2-d, 3-a, 4-c).",
            "Pelo menos dois pares devem diferir entre alternativas vizinhas.",
            "Não incluir a mesma letra em todos os pares de uma alternativa (colunas com itens excedentes).",
            "Formato padronizado: '1-X / 2-Y / 3-Z / 4-W'.",
          ],
        },
        campos_especificos: {
          coluna1: "Array de {id: number|string, texto: string}",
          coluna2: "Array de {id: letter, texto: string}",
          pares_corretos: "Array de {col1_id, col2_id} — determina o gabarito",
        },
      },
      regras_de_qualidade: {
        unicidade_resposta: [
          "Verificar que somente uma combinação de pares é totalmente correta.",
          "Confirmar que associações parcialmente corretas (3 de 4 pares) não sejam o gabarito.",
        ],
        distratores: [
          "Cada distrator deve ter no mínimo um par incorreto e no máximo um par correto diferente do gabarito.",
          "Usar associações equivocadas reais (erros conceituais conhecidos do público-alvo).",
        ],
        linguagem: [
          "Itens de cada coluna devem ter extensão e nível de linguagem similares entre si.",
          "Evitar que a extensão ou o estilo dos itens revele os pares corretos.",
        ],
        pistas_a_evitar: [
          "Usar termos iguais ou sinônimos óbvios nas duas colunas.",
          "Deixar apenas um item da Coluna II compatível gramaticalmente com um da Coluna I.",
        ],
      },
      campos_dataset: {
        obrigatorios: [
          "id", "disciplineId", "subjectId", "modelId", "questionType",
          "nivelCognitivo", "dificuldade", "coluna1", "coluna2",
          "enunciado", "alternativas", "gabarito", "justificativa_gabarito",
        ],
        opcionais: [
          "texto_base", "pares_corretos", "banca", "ano",
          "instituicao", "cargo", "tags", "justificativas_distratores",
        ],
      },
      validacoes_automaticas_sugeridas: [
        "existe_apenas_um_gabarito",
        "numero_itens_coluna1_entre_3_e_6",
        "numero_itens_coluna2_igual_ou_maior_que_coluna1",
        "alternativas_com_combinacoes_mutualmente_exclusivas",
      ],
      exemplo_minimo_item: {
        id: "EX_M8_001",
        tipo_item: "M8",
        texto_base:
          "COLUNA I — Estrutura anatômica:\n1. Fígado\n2. Pâncreas\n3. Baço\n4. Rim\n\nCOLUNA II — Função principal:\na. Filtração sanguínea e armazenamento de eritrócitos\nb. Produção de bile e metabolismo de lipídios\nc. Síntese de enzimas digestivas e hormônios (insulina/glucagon)\nd. Filtração do plasma e formação de urina",
        enunciado:
          "Associe cada estrutura da Coluna I com sua função principal descrita na Coluna II e assinale a alternativa CORRETA:",
        alternativas: {
          A: "1-b / 2-c / 3-a / 4-d.",
          B: "1-c / 2-b / 3-d / 4-a.",
          C: "1-b / 2-a / 3-c / 4-d.",
          D: "1-d / 2-c / 3-a / 4-b.",
          E: "1-a / 2-d / 3-b / 4-c.",
        },
        gabarito: "A",
        justificativa_gabarito:
          "Fígado (1-b): produz bile e metaboliza lipídios. Pâncreas (2-c): produz enzimas digestivas e hormônios. Baço (3-a): filtra sangue e armazena eritrócitos. Rim (4-d): filtra plasma e forma urina.",
        justificativas_distratores: {
          A: "Correta: todos os pares correspondem corretamente.",
          B: "Incorreta: Fígado está associado à função do Pâncreas e vice-versa.",
          C: "Incorreta: Pâncreas (2) está associado à função do Baço (a); Baço (3) à função do Pâncreas (c).",
          D: "Incorreta: Fígado (1) está associado à função do Rim (d).",
          E: "Incorreta: todas as associações estão invertidas ou erradas.",
        },
      },
    },

    // ─── M9 ────────────────────────────────────────────────────────────────────
    {
      modelo_id: "M9",
      db_question_type: "ordering",
      nome_modelo: "Ordenação / Seriação",
      sinonimos_comuns: [
        "item de sequenciamento",
        "ordenar etapas",
        "colocar em ordem",
        "seriação lógica",
      ],
      descricao:
        "Apresenta um conjunto de itens, etapas ou eventos (numerados I–V) que devem ser colocados na ordem correta segundo um critério definido (cronológico, lógico, de procedimento, causal etc.). As alternativas são sequências diferentes dos mesmos itens.",
      quando_usar: [
        "Avaliar conhecimento de protocolos, processos, procedimentos e sequências lógicas.",
        "Quando a ordem de execução é clinicamente ou tecnicamente crítica.",
        "Nível cognitivo: compreensão, aplicação e análise.",
      ],
      quando_evitar: [
        "Quando a sequência não tiver uma ordem objetivamente única e inquestionável.",
        "Com menos de 3 ou mais de 6 itens a ordenar.",
        "Quando etapas puderem ocorrer simultaneamente (ordem não determinada).",
      ],
      estrutura: {
        texto_base: {
          obrigatorio: false,
          observacao: "Útil para contextualizar o procedimento ou processo a ser ordenado.",
        },
        enunciado: {
          padrao:
            "Apresentação dos itens em ordem aleatória (I, II, III... não na ordem correta), seguida do comando de sequenciamento.",
          exemplos_de_comando: [
            "Numere as etapas do procedimento X na ordem CORRETA de execução, de acordo com o protocolo padrão:",
            "Ordene os eventos do processo Y de forma CRONOLÓGICA, do mais antigo ao mais recente:",
            "Assinale a sequência CORRETA para a realização do procedimento Z:",
          ],
        },
        alternativas: {
          quantidade: 5,
          rotulos: ["A", "B", "C", "D", "E"],
          regras_de_forma: [
            "Cada alternativa é uma sequência completa dos itens (ex.: 'III – I – IV – II – V').",
            "As alternativas devem diferir em pelo menos dois itens de posição.",
            "Evitar que a eliminação de uma alternativa óbvia revele o gabarito por dedução fácil.",
            "A sequência correta deve ser a única defensável pela literatura/protocolo de referência.",
          ],
        },
        campos_especificos: {
          itens_para_ordenar: "Array de {id: 'I'|'II'|..., texto: string} — em ordem aleatória no enunciado",
          sequencia_correta: "Array de IDs na ordem correta, ex.: ['III', 'I', 'IV', 'II']",
        },
      },
      regras_de_qualidade: {
        unicidade_resposta: [
          "A sequência correta deve ser única e suportada por referência técnica ou protocolo oficial.",
          "Verificar se alguma etapa pode ser trocada de posição sem alterar o resultado.",
        ],
        distratores: [
          "Distratores devem representar erros de ordenação plausíveis (ex.: sequência invertida de duas etapas).",
          "Incluir sequências que erroneamente antecipam ou postergam etapas críticas.",
        ],
        linguagem: [
          "Itens a ordenar devem ser redigidos no mesmo tempo verbal e estrutura gramatical.",
          "Evitar pistas temporais nos textos dos itens (ex.: 'em seguida', 'finalmente') que revelem a ordem.",
        ],
        pistas_a_evitar: [
          "Item inicial ou final óbvio que permita eliminar rapidamente alternativas.",
          "Sequência correta com número de itens diferente das demais alternativas.",
        ],
      },
      campos_dataset: {
        obrigatorios: [
          "id", "disciplineId", "subjectId", "modelId", "questionType",
          "nivelCognitivo", "dificuldade", "itens_para_ordenar",
          "enunciado", "alternativas", "gabarito", "justificativa_gabarito",
        ],
        opcionais: [
          "texto_base", "sequencia_correta", "banca", "ano",
          "instituicao", "cargo", "tags", "justificativas_distratores",
        ],
      },
      validacoes_automaticas_sugeridas: [
        "existe_apenas_um_gabarito",
        "numero_itens_entre_3_e_6",
        "alternativas_sao_permutacoes_diferentes",
        "sequencia_correta_suportada_por_referencia",
      ],
      exemplo_minimo_item: {
        id: "EX_M9_001",
        tipo_item: "M9",
        texto_base: null,
        enunciado:
          "Assinale a sequência CORRETA das fases da resposta inflamatória aguda, da primeira à última:\n\nI. Chegada de macrófagos e início da resolução\nII. Vasodilatação e aumento da permeabilidade vascular\nIII. Reconhecimento do estímulo lesivo pelos tecidos\nIV. Marginação e diapedese de neutrófilos\nV. Liberação de mediadores químicos (histamina, prostaglandinas)",
        alternativas: {
          A: "III – V – II – IV – I.",
          B: "II – III – V – I – IV.",
          C: "I – III – II – V – IV.",
          D: "V – II – IV – III – I.",
          E: "III – II – IV – V – I.",
        },
        gabarito: "A",
        justificativa_gabarito:
          "Sequência fisiológica: (III) reconhecimento → (V) liberação de mediadores → (II) vasodilatação/permeabilidade → (IV) diapedese de neutrófilos → (I) chegada de macrófagos e resolução.",
        justificativas_distratores: {
          A: "Correta: sequência fisiológica da inflamação aguda.",
          B: "Incorreta: a vasodilatação (II) antecede a liberação de mediadores (V), o que é biologicamente invertido.",
          C: "Incorreta: coloca a resolução (I) antes do reconhecimento (III), o que é impossível.",
          D: "Incorreta: inicia com liberação de mediadores (V) antes do reconhecimento (III).",
          E: "Incorreta: posiciona vasodilatação (II) antes da liberação de mediadores (V).",
        },
      },
    },

    // ─── M10 ───────────────────────────────────────────────────────────────────
    {
      modelo_id: "M10",
      db_question_type: "multiple_choice",
      nome_modelo: "Alternativas Constantes (Bloco de Enunciados)",
      sinonimos_comuns: [
        "questão de bloco",
        "alternativas compartilhadas",
        "item com tronco múltiplo",
        "série de enunciados",
      ],
      descricao:
        "Um único conjunto de 5 alternativas serve para múltiplos enunciados (stems) relacionados ao mesmo tema ou texto-base. Cada enunciado é uma questão independente que tem como resposta uma das mesmas 5 alternativas. Vinculados pelo campo grupo_id no banco de dados.",
      quando_usar: [
        "Avaliar múltiplos aspectos de um mesmo caso clínico, texto ou situação-problema.",
        "Quando as alternativas representam categorias fixas aplicáveis a diferentes perguntas (ex.: diagnósticos diferenciais, fases de tratamento).",
        "Economizar espaço em provas com texto-base longo compartilhado.",
      ],
      quando_evitar: [
        "Quando a resposta de um enunciado revelar a resposta de outro (interdependência).",
        "Com mais de 5 enunciados por bloco (leitura excessiva).",
        "Quando as alternativas fixas não se aplicarem naturalmente a todos os enunciados do bloco.",
      ],
      estrutura: {
        texto_base: {
          obrigatorio: true,
          observacao:
            "O texto-base é compartilhado por todos os enunciados do bloco. Deve ser autossuficiente. Armazenar uma vez e referenciar via grupo_id.",
        },
        enunciado: {
          padrao:
            "Cada enunciado é uma pergunta independente referenciando o texto-base do bloco.",
          exemplos_de_comando: [
            "Com base no caso acima, qual é o diagnóstico mais provável?",
            "O exame complementar de escolha para o caso descrito é:",
            "A conduta inicial MAIS ADEQUADA para o paciente é:",
          ],
        },
        alternativas: {
          quantidade: 5,
          rotulos: ["A", "B", "C", "D", "E"],
          regras_de_forma: [
            "As 5 alternativas são IDÊNTICAS para todos os enunciados do bloco.",
            "As alternativas devem ser categorias ou opções mutuamente exclusivas e exaustivas para o contexto.",
            "Cada enunciado deve ter exatamente uma resposta correta entre as 5 alternativas.",
            "As alternativas devem ser aplicáveis a todos os enunciados do bloco sem ambiguidade.",
          ],
        },
        campos_especificos: {
          grupo_id: "string — identificador único do bloco (ex.: 'BLOCO_ENADE2023_Q42')",
          posicao_no_bloco: "integer — número da questão dentro do bloco (1, 2, 3...)",
          alternativas_do_bloco:
            "Armazenadas uma única vez no bloco; referenciadas por cada enunciado.",
        },
      },
      regras_de_qualidade: {
        unicidade_resposta: [
          "Cada enunciado do bloco deve ter exatamente uma das 5 alternativas como correta.",
          "A resposta de um enunciado NÃO deve ser a mesma de todos os outros (evitar repetição óbvia).",
        ],
        distratores: [
          "As alternativas devem ser igualmente plausíveis para cada enunciado do bloco.",
          "Evitar alternativas que sejam óbvia para um enunciado mas impossíveis para outro.",
        ],
        linguagem: [
          "Alternativas devem ser formuladas em nível de abstração compatível com todos os enunciados.",
          "Cada enunciado deve ser compreensível sem conhecer a resposta dos outros.",
        ],
        pistas_a_evitar: [
          "Gabarito sempre na mesma posição para todos os enunciados do bloco.",
          "Alternativas que se referem ao conteúdo de apenas um enunciado (falta de universalidade).",
        ],
      },
      campos_dataset: {
        obrigatorios: [
          "id", "disciplineId", "subjectId", "modelId", "questionType",
          "grupo_id", "posicao_no_bloco", "nivelCognitivo", "dificuldade",
          "texto_base_grupo", "enunciado", "alternativas_grupo",
          "gabarito", "justificativa_gabarito",
        ],
        opcionais: [
          "banca", "ano", "instituicao", "cargo", "tags",
          "justificativas_distratores",
        ],
      },
      validacoes_automaticas_sugeridas: [
        "existe_apenas_um_gabarito_por_enunciado",
        "alternativas_identicas_em_todos_os_enunciados_do_grupo",
        "enunciados_independentes_sem_interdependencia_de_respostas",
        "numero_enunciados_no_bloco_entre_2_e_5",
      ],
      exemplo_minimo_item: {
        id: "EX_M10_001",
        tipo_item: "M10",
        texto_base:
          "[BLOCO_EX_001 — Alternativas compartilhadas]\nA) Procedimento cirúrgico de emergência.\nB) Tratamento clínico com antibioticoterapia.\nC) Exame complementar de imagem (ultrassonografia).\nD) Internação para suporte intensivo e monitoração.\nE) Alta com tratamento ambulatorial e reavaliação em 48h.\n\n[Caso clínico — Enunciado 1]\nAnimal de espécie X, fêmea, 5 anos, apresenta dor abdominal aguda, vômito e taquicardia. Ao exame físico, distensão abdominal e mucosas hipocoradas. A conduta imediata MAIS ADEQUADA é:",
        enunciado:
          "Assinale a conduta imediata MAIS ADEQUADA para o caso descrito (Enunciado 1 do bloco):",
        alternativas: {
          A: "Procedimento cirúrgico de emergência.",
          B: "Tratamento clínico com antibioticoterapia.",
          C: "Exame complementar de imagem (ultrassonografia).",
          D: "Internação para suporte intensivo e monitoração.",
          E: "Alta com tratamento ambulatorial e reavaliação em 48h.",
        },
        gabarito: "A",
        justificativa_gabarito:
          "O quadro de dor abdominal aguda com distensão, taquicardia e mucosas hipocoradas é sugestivo de emergência cirúrgica abdominal (ex.: torção de órgão, peritonite). A intervenção cirúrgica imediata é a conduta mais adequada.",
        justificativas_distratores: {
          A: "Correta: emergência cirúrgica indicada pelo quadro clínico.",
          B: "Incorreta: antibioticoterapia isolada não resolve causa cirúrgica aguda.",
          C: "Incorreta: embora útil, a imagem pode atrasar intervenção crítica; quadro já sugere cirurgia.",
          D: "Incorreta: suporte intensivo é adjuvante; não substitui a cirurgia indicada.",
          E: "Incorreta: alta ambulatorial é contraindicada em emergência cirúrgica com instabilidade.",
        },
      },
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const MODEL_MAP = Object.fromEntries(
  QUESTION_MODELS_CATALOG.modelos.map(m => [m.modelo_id, m])
) as Record<ModelId, QuestionModelDef>;

export const MODEL_OPTIONS = QUESTION_MODELS_CATALOG.modelos.map(m => ({
  value: m.modelo_id,
  label: `${m.modelo_id} — ${m.nome_modelo}`,
  dbType: m.db_question_type,
}));

export function getModelById(id: ModelId | string): QuestionModelDef | undefined {
  return MODEL_MAP[id as ModelId];
}

export function getDbTypeForModel(modelId: ModelId | string): string {
  return MODEL_MAP[modelId as ModelId]?.db_question_type ?? "multiple_choice";
}
