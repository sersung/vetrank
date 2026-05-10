# VetRank

**VetRank** é uma plataforma de estudos e preparação para provas de Medicina Veterinária, voltada para estudantes de graduação e profissionais formados que buscam aprimoramento contínuo, residência ou especialização.

---

## Visão Geral

A plataforma oferece banco de questões de múltipla escolha e discursivas organizadas por grande área, disciplina e assunto, seguindo a estrutura do CFMV. Os usuários podem praticar questões, realizar simulados cronometrados, acompanhar seu desempenho via dashboard, subir no ranking e percorrer trilhas de aprendizado estruturadas.

Coordenadores e professores têm acesso a painéis dedicados para gerenciar o banco de questões, importar questões em lote (CSV, XLSX, JSON ou PDF/Word via IA), validar questões e atribuir tarefas de revisão. Administradores gerenciam usuários, planos de assinatura, pagamentos e comunicações.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 19, Tailwind CSS 4, shadcn/ui, Radix UI, Wouter (roteamento) |
| **Backend** | Node.js 22, Express 4, tRPC 11 |
| **Banco de dados** | MySQL 8 / TiDB (compatível com MySQL) |
| **ORM** | Drizzle ORM com drizzle-kit para migrações |
| **Autenticação** | Manus OAuth 2.0 (JWT em cookie HttpOnly) |
| **Armazenamento de arquivos** | AWS S3 (via `@aws-sdk/client-s3`) |
| **Pagamentos** | Mercado Pago (`mercadopago` SDK) |
| **E-mail** | Resend (`resend` SDK) |
| **IA / LLM** | Google Gemini (`@google/generative-ai`), Anthropic Claude (`@anthropic-ai/sdk`) |
| **Processamento de imagens** | Sharp (WebP, resize) |
| **Extração de documentos** | pdf-parse (PDF), mammoth (DOCX) |
| **Build** | Vite 7, esbuild, TypeScript 5.9 |
| **Testes** | Vitest |
| **Gerenciador de pacotes** | pnpm 10 |

---

## Banco de Dados

O projeto usa **MySQL 8** (ou TiDB, que é compatível com MySQL). A conexão é configurada via variável de ambiente `DATABASE_URL`.

### Tabelas Principais

| Tabela | Descrição |
|---|---|
| `users` | Usuários com perfil, role (admin/coordinator/teacher/user), plano (free/trial/premium/expired) e datas de assinatura |
| `disciplines` | Grandes Áreas do CFMV (ex: Ciências Biológicas e Ciclo Básico) |
| `subjects` | Disciplinas dentro de cada grande área (ex: Anatomia Veterinária) |
| `questions` | Questões de múltipla escolha com alternativas A–E, gabarito, dificuldade, fonte e imageUrl |
| `discursive_questions` | Questões discursivas com enunciado, resposta modelo e critérios de avaliação |
| `exams` | Simulados criados pelos usuários com configuração de tempo e filtros |
| `exam_answers` | Respostas dos usuários por questão em cada simulado |
| `practice_sessions` | Sessões de prática livre com histórico de respostas |
| `badges` | Conquistas desbloqueáveis por desempenho |
| `user_badges` | Relação usuário ↔ badge com data de conquista |
| `xp_events` | Histórico de XP ganho por ação |
| `weekly_xp` / `monthly_xp` | Agregados de XP para o ranking |
| `trails` | Trilhas de aprendizado estruturadas por tema |
| `trail_modules` | Módulos dentro de cada trilha |
| `trail_module_questions` | Questões associadas a cada módulo |
| `trail_enrollments` | Inscrições de usuários em trilhas |
| `trail_module_progress` | Progresso por módulo por usuário |
| `trail_module_answers` | Respostas dentro de trilhas |
| `teacher_permissions` | Permissões de professores por grande área (criar/validar/simulados) |
| `question_assignments` | Atribuições de validação de questões para professores |
| `announcements` | Comunicados do sistema para usuários |
| `question_reports` | Reportes de problemas em questões pelos usuários |
| `activity_log` | Log de ações administrativas |
| `referrals` | Indicações de novos usuários |
| `referral_bonuses` | Bônus concedidos por indicações bem-sucedidas |
| `payments` | Histórico de pagamentos com status, método, motivo de recusa e recibo |

---

## Estrutura de Diretórios

```
vetrank/
├── client/                  # Frontend React
│   ├── src/
│   │   ├── pages/           # Páginas da aplicação
│   │   ├── components/      # Componentes reutilizáveis (shadcn/ui + customizados)
│   │   ├── contexts/        # React contexts (Auth, Language, Theme)
│   │   ├── hooks/           # Hooks customizados
│   │   ├── lib/trpc.ts      # Cliente tRPC
│   │   ├── App.tsx          # Roteamento principal
│   │   └── index.css        # Variáveis CSS e tema global
├── server/
│   ├── _core/               # Infraestrutura (OAuth, tRPC, rate-limit, LLM, env)
│   ├── routers/             # Procedures tRPC por domínio
│   │   ├── questions.ts     # Banco de questões + upload de imagem
│   │   ├── validation.ts    # Validação e atribuição de questões
│   │   ├── plans.ts         # Gestão de planos e pagamentos
│   │   ├── coordinator.ts   # Painel do coordenador
│   │   └── ...
│   ├── db.ts                # Query helpers (Drizzle)
│   ├── routers.ts           # Registro de todos os routers
│   └── storage.ts           # Helpers S3
├── drizzle/
│   ├── schema.ts            # Definição de todas as tabelas
│   └── migrations/          # Arquivos SQL gerados pelo drizzle-kit
├── shared/                  # Constantes e tipos compartilhados
├── package.json
├── tsconfig.json
├── vite.config.ts
└── drizzle.config.ts
```

---

## Configuração do Ambiente

### Pré-requisitos

- Node.js >= 22
- pnpm >= 10
- MySQL 8 ou TiDB

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Banco de dados (MySQL/TiDB)
DATABASE_URL=mysql://user:password@host:3306/vetrank

# Autenticação Manus OAuth
JWT_SECRET=seu_jwt_secret_aqui
VITE_APP_ID=seu_app_id_manus
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://login.manus.im
OWNER_OPEN_ID=seu_open_id
OWNER_NAME=Seu Nome

# AWS S3 (armazenamento de arquivos)
AWS_ACCESS_KEY_ID=sua_access_key
AWS_SECRET_ACCESS_KEY=sua_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=seu_bucket

# LLM (pelo menos um é necessário para extração de questões via IA)
GEMINI_API_KEY=sua_chave_gemini
ANTHROPIC_API_KEY=sua_chave_anthropic

# Pagamentos (Mercado Pago)
MP_ACCESS_TOKEN=seu_token_mp
MP_WEBHOOK_SECRET=seu_webhook_secret

# E-mail (Resend)
RESEND_API_KEY=sua_chave_resend
EMAIL_FROM=noreply@vetrank.com.br

# App
VITE_APP_TITLE=VetRank
VITE_APP_LOGO=https://url-do-seu-logo.png

# APIs internas Manus (preenchidas automaticamente na plataforma Manus)
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
```

### Instalação

```bash
# Instalar dependências
pnpm install

# Gerar e aplicar migrações do banco de dados
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# Iniciar em modo de desenvolvimento
pnpm dev

# Build para produção
pnpm build

# Iniciar em produção
pnpm start
```

### Testes

```bash
pnpm test
```

---

## Roles de Usuário

| Role | Acesso |
|---|---|
| `user` | Prática, simulados, dashboard pessoal, trilhas, ranking |
| `teacher` | Tudo do `user` + painel de professor (criar/importar/validar questões por grande área autorizada) |
| `coordinator` | Tudo do `teacher` + painel do coordenador (gerenciar professores, permissões, atribuições de validação) |
| `admin` | Acesso total + painel administrativo (usuários, planos, pagamentos, conteúdo, e-mails) |

---

## Planos de Assinatura

| Plano | Descrição |
|---|---|
| `trial` | 7 dias gratuitos com acesso completo (atribuído automaticamente ao cadastro) |
| `free` | Acesso limitado (após expirar o trial) |
| `premium` | Acesso ilimitado (mensal ou anual via Mercado Pago) |
| `expired` | Assinatura premium expirada |

---

## Funcionalidades Principais

**Para Estudantes e Profissionais:**
Banco de questões com filtros por grande área, disciplina, assunto, dificuldade e banca. Modo de prática livre e simulados cronometrados com configuração personalizada. Dashboard de desempenho com gráficos de acerto por área. Trilhas de aprendizado estruturadas. Ranking semanal e mensal com sistema de XP e conquistas. Banco de questões discursivas com resposta modelo.

**Para Professores:**
Criação e edição de questões de múltipla escolha e discursivas. Importação em lote via CSV, XLSX, JSON ou extração automática de PDF/Word via IA (Gemini). Upload de imagens otimizadas (WebP via Sharp). Fila de validação de questões atribuídas pelo coordenador.

**Para Coordenadores:**
Gerenciamento de permissões de professores por grande área (checkboxes). Atribuição de questões para validação. Monitoramento de atribuições e desempenho dos professores. Importação em lote com pré-visualização.

**Para Administradores:**
Gestão completa de usuários, planos e pagamentos. Aba de Assinantes com alertas de expiração. Painel de comunicados e e-mails em massa. Gerenciamento de conteúdo (questões, trilhas, badges, disciplinas).

---

## Licença

MIT
