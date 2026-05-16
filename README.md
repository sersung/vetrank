# VetRank

Plataforma educacional gamificada para estudantes de Medicina Veterinária no Brasil.

## O que é

VetRank é um banco de questões e sistema de aprendizado para concursos e residências de Medicina Veterinária. Oferece questões de múltipla escolha, casos clínicos, questões discursivas e trilhas de aprendizado estruturadas, com sistema de XP, rankings e planos de assinatura.

## Funcionalidades

- **Banco de questões** — múltipla escolha, asserção-razão, casos clínicos, discursivas e análise de imagem
- **Simulados** — provas cronometradas com gabarito e desempenho
- **Modo prático** — treino livre filtrado por área, disciplina, dificuldade
- **Trilhas de aprendizado** — módulos sequenciais com progresso e XP
- **Gamificação** — nível, XP, badges, ranking semanal/mensal
- **Planos** — Free, Trial e Premium (Mercado Pago)
- **Programa de indicação** — bônus para usuários que indicam outros
- **Extração de questões por IA** — upload de PDF/Word e geração automática
- **Painel admin** — gestão de usuários, conteúdo, pagamentos e estatísticas
- **Painel coordenador/professor** — validação de questões, atribuições, permissões

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19, Vite, TailwindCSS 4, Radix UI, Wouter |
| Backend | Node.js, Express, tRPC 11 |
| Banco de dados | PostgreSQL (Supabase) + DrizzleORM |
| Autenticação | Supabase Auth (OAuth Google/GitHub) |
| Storage | Supabase Storage + AWS S3 |
| Pagamentos | Mercado Pago |
| E-mail | Resend |
| IA/LLM | OpenAI, Google Gemini, Anthropic Claude |
| Deploy | Vercel (serverless) |

## Pré-requisitos

- Node.js >= 20.x
- pnpm >= 10.x
- Conta Supabase (PostgreSQL)
- Conta Vercel

## Variáveis de ambiente

Crie um arquivo `.env` na raiz com:

```env
# Supabase
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Banco de dados (PostgreSQL direto)
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres

# Administradores (separados por vírgula)
OWNER_EMAIL=admin1@email.com,admin2@email.com

# LLM
OPENAI_API_KEY=sk-...

# Pagamentos
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...

# E-mail
RESEND_API_KEY=re_...
```

## Instalação local

```bash
# Instalar dependências
pnpm install

# Subir banco (após configurar DATABASE_URL)
pnpm db:push

# Iniciar em desenvolvimento
pnpm dev
```

## Deploy (Vercel)

O projeto já está configurado via `vercel.json`. Basta conectar o repositório e adicionar as variáveis de ambiente no painel da Vercel.

Após o deploy, configure o webhook do Mercado Pago:
```
https://<seu-dominio>/api/mp/webhook
```

## Estrutura do projeto

```
vetrank2/
├── api/              # Entrada serverless (Vercel)
├── client/           # Frontend React
│   └── src/
│       ├── pages/    # 24 páginas
│       └── components/
├── server/           # Backend Express + tRPC
│   ├── routers/      # 18 routers de negócio
│   ├── _core/        # Auth, contexto, SDK
│   └── db.ts         # Queries do banco
├── drizzle/          # Schema e migrações
└── shared/           # Tipos compartilhados
```

## Banco de dados

PostgreSQL via Supabase com DrizzleORM. O schema define 27 tabelas principais incluindo: `users`, `questions`, `exams`, `trails`, `payments`, `referrals`, entre outras.

RLS (Row Level Security) habilitado em todas as tabelas. O servidor usa a `SUPABASE_SERVICE_ROLE_KEY` que bypassa o RLS.
