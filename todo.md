# VetRank TODO

## Phase 1 — Global Styles & Theme
- [x] Configure dark theme with green/teal palette in index.css
- [x] Add Playfair Display + Inter fonts via Google Fonts CDN
- [x] Set ThemeProvider to dark default

## Phase 2 — Database Schema & Backend API
- [x] Schema: users (extend with XP, level, streak, plan, trialEnd)
- [x] Schema: disciplines table
- [x] Schema: subjects table
- [x] Schema: questions table (with options, answer, explanation, difficulty, year)
- [x] Schema: exams table (sessions)
- [x] Schema: exam_answers table
- [x] Schema: badges table
- [x] Schema: user_badges table
- [x] Schema: xp_events table
- [x] Schema: weekly_xp and monthly_xp tables
- [x] Run migration and apply SQL
- [x] DB helpers: questions CRUD, exams, leaderboard, gamification
- [x] tRPC routers: questions, exams, gamification, leaderboard, admin, ai, subscription

## Phase 3 — Landing Page, Navbar & Routing
- [x] Bilingual i18n context (PT/EN) with language selector in navbar
- [x] Navbar with logo, nav links, language toggle, auth button
- [x] Landing page: hero, features, pricing, CTA sections
- [x] Routing: /bank, /exam, /profile, /leaderboard, /admin, /pricing
- [x] LanguageProvider wired in App.tsx

## Phase 4 — Question Bank & Mock Exam Engine
- [x] Question bank page with filters (discipline, subject, difficulty, year)
- [x] Question list with pagination
- [x] Exam generator config modal (discipline, difficulty, count)
- [x] Exam page: timer, question navigation, answer selection
- [x] Exam results page with score, accuracy, XP earned

## Phase 5 — Gamification System
- [x] XP award on exam completion
- [x] 9 levels: Resident → Legend with XP thresholds
- [x] Daily login streak tracking
- [x] 10 badges with unlock conditions
- [x] XP event log
- [x] Level-up notification/toast

## Phase 6 — Leaderboard & User Profile
- [x] Leaderboard: weekly / monthly / all-time tabs
- [x] Visual podium for top 3
- [x] User profile page: XP bar, level, accuracy, streaks
- [x] Exam history table
- [x] Badges/achievements display

## Phase 7 — Admin Panel & SaaS Subscription
- [x] Admin panel: questions CRUD (create, edit, delete)
- [x] Admin: disciplines and subjects management
- [x] Admin: CSV bulk import for questions
- [x] Subscription tiers: Free, Premium (annual), 30-day trial
- [x] Trial activation (no credit card)
- [x] Pricing page
- [x] Plan gate: limit free users to non-premium questions

## Phase 8 — Anthropic Claude AI Integration
- [x] AI explanation endpoint: explain answer after exam
- [x] AI question generator for admin panel
- [x] Server-side Claude API calls via ANTHROPIC_API_KEY

## Phase 9 — SEO & Polish
- [x] Meta tags and Open Graph in index.html
- [x] Twitter Card meta tags
- [x] sitemap.xml in client/public
- [x] robots.txt in client/public
- [x] Favicon SVG
- [x] Seed functions: disciplines (6), badges (10)
- [x] Vitest tests: 22 tests passing across 2 test files
- [x] Zero TypeScript errors

## Pending
- [x] Deploy — READY TO PUBLISH (user clicks Publish button in Management UI)

## Pricing Update
- [x] Update Pricing page: Free (30 questões/mês), Premium Mensal R$ 39,90, Premium Anual R$ 299,00 (R$ 24,90/mês equivalente, 37% desconto)
- [x] Add price anchoring: show monthly equivalent on annual plan
- [x] Add "Melhor Custo-Benefício" badge on annual plan
- [x] Update Home.tsx pricing section with same values

## AI Provider & Question Database
- [x] Replace Anthropic Claude with Gemini Flash in ai.ts router (gemini-2.5-flash)
- [x] Add GEMINI_API_KEY to project secrets
- [x] Generated 5,766 questions via Gemini 2.5 Flash (exceeded 5,000 target)
- [x] Seed 6 disciplines and 47 subjects into database
- [x] Seeded 5,661 questions into database (6 disciplines, 47 subjects)
- [x] Verified per-discipline: Farmacologia 936, Clínica 1216, Herpetologia 861, Ornitologia 840, Anestesiologia 962, Pequenos Mamíferos 846

## Role System Expansion
- [ ] Extend user role enum: user | teacher | coordinator | superuser | admin
- [ ] Schema: teacher_permissions table (coordinator assigns disciplines to teachers)
- [ ] Schema: activity_log table (track teacher/coordinator actions)
- [ ] Schema: announcements table (title, body, date, author, pinned)
- [ ] Schema: question_reports table (user reports errors on questions)
- [ ] Schema: question_images table (image URL per question option or body)
- [ ] Schema: lgpd_consents table (user consent timestamp + version)
- [ ] Backend: coordinator router (manage teachers, assign permissions, view logs)
- [ ] Backend: teacher router (create/edit questions in assigned disciplines, create exams)
- [ ] Backend: announcements router (CRUD for superuser/coordinator/teacher)
- [ ] Backend: question_reports router (submit + admin review)
- [ ] Backend: LGPD consent router (record and check consent)
- [ ] Run migration and apply SQL

## Coordinator & Teacher Panels
- [ ] Coordinator panel: teacher management (invite, assign disciplines, revoke)
- [ ] Coordinator panel: activity monitoring dashboard (logs table)
- [ ] Teacher panel: question creation with image upload
- [ ] Teacher panel: question validation queue (approve/reject pending questions)
- [ ] Teacher panel: exam creation with ENADE template option
- [ ] Teacher panel: question model selector (Standard, ENADE, True/False, Assertion-Reason)

## Student Features
- [ ] Student performance dashboard: accuracy by discipline, XP history, weak areas chart
- [ ] Practice mode: answer questions without exam (select discipline, level, show/hide repeated)
- [ ] Exam: visible countdown timer with warning at <5 min
- [ ] Exam: subject percentage selector (e.g. 40% Pharmacology, 30% Clinics...)
- [ ] Exam: detailed statistics after completion (per-discipline breakdown, time per question)
- [ ] Exam: ENADE-style question display template

## UI Enhancements
- [ ] Dark/light theme toggle in navbar (switchable ThemeProvider)
- [ ] Font size control (small/medium/large) persisted in localStorage
- [ ] Question error report button (small flag icon on each question)
- [ ] Error report modal with category and description fields
- [ ] Announcement board page (/announcements) with pinned + chronological list
- [ ] Announcement widget on dashboard/home

## LGPD Compliance
- [ ] Terms of Use page (/terms)
- [ ] Privacy Policy page (/privacy) with LGPD-compliant content
- [ ] Consent modal on first login (accept terms + privacy policy)
- [ ] Footer links to Terms and Privacy Policy
- [ ] LGPD consent recorded in database with timestamp and version

## Mercado Pago Integration
- [ ] Add MP_ACCESS_TOKEN and MP_WEBHOOK_SECRET to project secrets
- [ ] Install mercadopago SDK
- [ ] Backend: createPreference procedure (monthly R$39,90 + annual R$299,00)
- [ ] Backend: webhook handler at /api/mp/webhook for payment confirmation
- [ ] Backend: activate subscription on approved payment
- [ ] Frontend: checkout button on Pricing page
- [ ] Frontend: success and failure/pending pages
- [ ] Frontend: subscription status and cancel UI in Profile page

## Access Control & New Features (May 2026)
- [ ] Add option E (optionE_pt, optionE_en) to questions schema and migrate DB
- [ ] Update all question forms (Admin, Teacher) to show/handle option E
- [ ] Update exam engine and practice mode to render option E
- [ ] Gate Question Bank: free users see paywall, only premium/trial can access
- [ ] Gate Leaderboard: free users see paywall, only premium/trial can access
- [ ] Set ascalefi@gmail.com as admin (role=admin) in DB via script
- [ ] Add custom admin login with email ascalefi@gmail.com + password Adminvetrank123
- [ ] Build customer info panel in Admin: list all users, plan, XP, last login, email
- [ ] Add support email calefi@csvet.com.br to footer, contact page, and error pages
- [ ] Update LGPD/Terms pages with support email

## Dark/Light Mode & ENADE Format (May 2026)
- [ ] Fix dark/light mode toggle — verify CSS variables for both themes
- [ ] Ensure all page backgrounds, cards, inputs, and text respond to theme switch
- [ ] Persist theme choice in localStorage
- [ ] Reformat all 5,661 questions to ENADE Brazil format
- [ ] Update question display components to render ENADE-style (contexto + enunciado + comando)

## Email Notifications & Admin Upload (May 2026)
- [x] Build email service using Resend API (transactional emails)
- [x] Create email templates: trial expiring (3 days), trial expiring (1 day), premium expiring (7 days), premium expiring (1 day)
- [x] Create newsletter/news email template for admin to send to all users
- [x] Add /api/scheduled/send-expiry-emails endpoint for scheduled task
- [x] Add email sending UI in admin panel (compose + send to all users or filtered segment)
- [x] Add bulk question upload tab in admin panel (CSV + JSON with preview/validation)
- [x] Support JSON format with all 5 options (A-E), discipline, subject, difficulty, year
- [x] Show upload preview table before confirming import
- [x] Show per-row validation errors before import

## Curriculum & Question Format Updates (May 2026)

### Schema & DB
- [x] Add subjectTag (text) and author (text) columns to questions table
- [x] Add questionType enum column: multiple_choice | assertion_reason | discursive
- [x] Add assertion1 and assertion2 text columns (for assertion_reason type)
- [x] Create discursive_questions table (id, disciplineId, subjectId, subjectTag, author, textPt, textEn, expectedAnswerPt, expectedAnswerEn, difficulty, year, active, createdAt)
- [x] Run migration and apply SQL

### Backend
- [x] Update questions router: filter/create/edit with subjectTag, author, questionType, assertion1, assertion2
- [x] Add discursive questions router (CRUD: list, create, update, delete)
- [x] Add bySubject query to performanceDashboard

### Admin Panel
- [x] Question creation form: type selector (multiple_choice / assertion_reason / discursive)
- [x] Assertion-reason form: fixed A-E options shown as read-only preview, editable assertion1 and assertion2 fields
- [x] subjectTag and author inputs added to question creation form
- [x] Correct option selector hidden for discursive type
- [x] Multiple choice options hidden for assertion_reason and discursive types

### Student Dashboard
- [x] Add bySubject data to performanceDashboard backend
- [x] Add "Desempenho por Assunto" section to Dashboard page with progress bars and color coding

### Discursive Bank
- [x] Discursive question bank page (/discursive): list with filters (discipline, difficulty, search)
- [x] Expand/collapse question detail with expected answer (premium/subscriber only)
- [x] Admin CRUD for discursive questions inline in the page
- [x] Add /discursive route to App.tsx
- [x] Add "Discursivas" link to Navbar (PenLine icon)

## All Question Formats (May 2026)

### Schema & DB
- [x] Extend questionType enum: multiple_choice | assertion_reason | complex_multiple_choice | matching | true_false | ordering | cloze | clinical_case | image_analysis | interpretation | discursive
- [x] Add formatData JSON column to questions table (stores format-specific structured data)
- [x] Run migration and apply SQL

### Backend
- [x] Update questions router create/update to accept formatData for each type
- [x] Add type-specific validation per questionType
- [x] Update list/getById to return formatData

### Admin Panel
- [x] Assertion-Reason form: propositions I and II with PORQUE connector, fixed 5 options (1-5 ENADE standard)
- [x] Complex Multiple Choice form: items I/II/III/IV editor + combination options builder
- [x] Matching (Association) form: Column A items + Column B items editor
- [x] True/False Sequential form: list of statements, alternativas with V/F sequences
- [x] Ordering/Sequencing form: list of steps to be ordered
- [x] Cloze (Fill-in-the-blank) form: text with [BLANK] markers + answer options
- [x] Clinical Case / Image Analysis form: case text + image URL + standard 5 options

### Student Renderer
- [x] Render assertion_reason: show propositions I and II with PORQUE, fixed 5 options
- [x] Render complex_multiple_choice: show items I/II/III + combination options
- [x] Render matching: two-column layout with drag/select matching
- [x] Render true_false: list of statements with V/F sequence options
- [x] Render ordering: numbered list with reorder UI or option selection
- [x] Render cloze: text with blanks highlighted + fill options
- [x] Render clinical_case / image_analysis: case text + optional image + options

## Simulado Filters (May 2026)
- [x] Add author, year, subjectId, disciplineIds (multi) filters to exam question query backend
- [x] Add distinct author list query to questions router
- [x] Add distinct year list query to questions router
- [x] Update ExamPage config UI: multi-select disciplines (checkboxes or tags)
- [x] Update ExamPage config UI: subject dropdown (dependent on selected disciplines)
- [x] Update ExamPage config UI: author dropdown (from distinct authors in DB)
- [x] Update ExamPage config UI: year dropdown (from distinct years in DB)
- [x] Ensure filters are combined correctly (AND logic) when fetching exam questions

## Question Fixes & Generation (May 2026)
- [x] Diagnose broken questions: root cause was options stored with label instead of id field
- [x] Fix 1030 questions: migrate options label→id in DB
- [x] Add defensive label→id normalization in QuestionRenderer frontend
- [x] Generate new questions for all 45 subjects via LLM (parallel)
- [x] Insert 226 new questions across all 45 subjects
- [x] Verify all subjects have questions (0 subjects with 0 questions)
- [x] Total: 5887 active questions

## Trilhas do Conhecimento & XP/Níveis (May 2026)

### Schema & DB
- [ ] Add cpf, referralCode, referredBy columns to users table
- [ ] Create trails table (id, disciplineId, title, description, totalHours, passingScore, active, createdBy, createdAt)
- [ ] Create trail_modules table (id, trailId, order, title, summary, difficulty, questionCount, minPassRate, createdAt)
- [ ] Create trail_module_questions table (id, moduleId, questionId, order)
- [ ] Create trail_enrollments table (id, userId, trailId, status, startedAt, completedAt, certificateUrl)
- [ ] Create trail_module_progress table (id, enrollmentId, moduleId, status, attempts, score, completedAt)
- [ ] Create trail_module_answers table (id, progressId, questionId, selectedOption, correct, answeredAt)
- [ ] Create referrals table (id, referrerId, referredEmail, referredUserId, status, paidAt, createdAt)
- [ ] Run migration and apply SQL

### Backend
- [ ] Trails router: list, getById, create, update, delete (coordinator+)
- [ ] Trail modules router: CRUD for modules, assign/remove questions
- [ ] Trail enrollment router: enroll, getProgress, submitModuleAnswers, completeModule, getFinalExam, submitFinalExam
- [ ] Certificate generation: PDF with student name, CPF, trail name, hours, dates, CEO, CNPJ
- [ ] Referral router: getReferralCode, getReferrals, checkBonusEligibility, activateBonus
- [ ] XP system: award XP per correct answer (not just per exam), update level in real-time
- [ ] Level thresholds: exponential XP curve (10 levels)

### Student UI
- [ ] Trails menu page (/trails): list disciplines with trails, status badges, progress bars
- [ ] Trail detail page (/trails/:id): intro, sequential modules, progress, final exam, certificate
- [ ] Module quiz view: show questions one by one, submit, show score, pass/fail
- [ ] Final exam view: timed, mixed questions from all modules
- [ ] Certificate page: display and download PDF certificate
- [ ] Profile page: show current level with XP bar, next level threshold, XP history
- [ ] Referral page (/referral): unique link, referral count, bonus status

### Coordinator UI
- [ ] Coordinator trail panel: create/edit/delete trails per discipline
- [ ] Module editor: add/remove/reorder modules, set question count and pass rate
- [ ] Question selector: filter questions by discipline/subject/difficulty and assign to module
- [ ] Trail preview: see student view of trail

## Terms & Registration Updates (May 2026)
- [ ] Update trial period from 30 days to 7 days
- [ ] Add CPF field to user registration/profile
- [ ] Terms of Service page: CSVET CNPJ 32.645.724/0001-89, 7-day trial, no-refund after trial, MercadoPago notice
- [ ] Privacy Policy: LGPD compliant with CSVET data
- [ ] Consent modal: require acceptance of ToS before activating trial
- [ ] Footer: CNPJ, email adm@csvet.com.br, support email calefi@csvet.com.br

## Auth Guards & Security (May 2026)
- [ ] Add auth guard to ExamPage (Simulados) - redirect unauthenticated to login
- [ ] Add auth guard to Trails page - redirect unauthenticated to login
- [ ] Add auth guard to TrailDetail page - redirect unauthenticated to login
- [ ] Add auth guard to DiscursiveBank page - redirect unauthenticated to login
- [ ] Add rate limiting middleware to /api/trpc question endpoints (max 100 req/min per IP)
- [ ] Filter question correctOption from list/getById responses for unauthenticated users
- [ ] Add server-side access control: questions.list and questions.getById require auth
- [ ] Add request fingerprinting/logging for suspicious bulk access patterns

## Trail Seeding (May 2026)
- [ ] Seed Fisiologia Animal I trail (7 modules: Introdução, Celular, Neurofisiologia, Muscular, Cardíaca, Circulatória, Renal)
- [ ] Seed Fisiologia Animal II trail (4 modules: Digestório, Respiratório, Endócrino, Reprodutor)
- [ ] Seed Fisiologia Geral trail (combines Fisio I + II, 11 modules total)
- [ ] Seed Patologia Geral trail (9 modules from document)
- [ ] Seed Patologia Especial trail (5 modules from document)

## Gamification Visuals - Trails (May 2026)
- [ ] Trails.tsx: XP/level hero banner with animated progress bar to next level
- [ ] Trails.tsx: trail cards with circular progress ring showing % modules completed
- [ ] Trails.tsx: XP reward badge on each trail card (total XP earnable)
- [ ] Trails.tsx: streak/status badges (Em andamento, Concluído, Bloqueado)
- [ ] TrailDetail.tsx: module timeline with lock/unlock visual states
- [ ] TrailDetail.tsx: XP gain indicator per module (e.g. +150 XP)
- [ ] TrailDetail.tsx: animated progress bar across all modules
- [ ] TrailDetail.tsx: level/XP sidebar widget showing current level and XP to next
- [ ] TrailDetail.tsx: completion celebration banner when trail is finished

## Bulk Import & Question Validation System (May 2026)

### Schema & DB
- [ ] Add isValidated (boolean, default false), validatedBy (userId), validatedAt (timestamp) to questions table
- [ ] Add isValidated, validatedBy, validatedAt to discursive_questions table
- [ ] Add question_assignments table: id, assignedTo, assignedBy, questionId, questionType, status, notes, createdAt, updatedAt
- [ ] Generate and apply migration

### Backend
- [ ] Add validateQuestion procedure (coordinator/professor only)
- [ ] Add getValidationStats procedure for coordinator
- [ ] Add assignment CRUD (create by coordinator, list by professor, update status)
- [ ] Add bulk import parse endpoint (CSV/XLSX/JSON → preview rows)
- [ ] Add bulk import confirm endpoint (insert rows into DB)

### QuestionImport Component
- [ ] Create QuestionImportModal.tsx with file drop zone (CSV/XLSX/JSON)
- [ ] Client-side parsing with preview table (first 20 rows, errors highlighted)
- [ ] Download template buttons: CSV (multiple choice), CSV (discursive), XLSX, JSON
- [ ] Confirm import button

### Coordinator Panel
- [ ] Add "Importar Questões" tab with QuestionImportModal
- [ ] Add "Validação" tab: all questions with isValidated badge, filter by discipline/status
- [ ] Add "Atribuições" tab: assign question batches to professors
- [ ] Add monitoring dashboard: stats by professor

### Professor Panel
- [ ] Add "Importar Questões" tab with QuestionImportModal
- [ ] Add "Minhas Atribuições" tab: list assigned questions, approve/reject with notes
- [ ] Show validation badge on question cards in professor view

## Validation & Import System (May 2026)

### DB Schema
- [x] Add isValidated (boolean, default false) to questions table
- [x] Add validatedBy (int, nullable) to questions table
- [x] Add validatedAt (bigint, nullable) to questions table
- [x] Add isValidated, validatedBy, validatedAt to discursive_questions table
- [x] Create question_assignments table (id, questionId, questionType, assignedTo, assignedBy, status, notes, createdAt, updatedAt)
- [x] Apply migration 0006

### Backend
- [x] validation.ts router: validateQuestion, getValidationStats, listForValidation, createAssignment, listMyAssignments, updateAssignment, listAllAssignments, listProfessors
- [x] Register validationRouter in routers.ts
- [x] Install xlsx package (server-side)

### QuestionImport Component
- [x] QuestionImport.tsx: CSV/XLSX/JSON parsing with Papa Parse and xlsx
- [x] Pre-visualization table with per-row validation errors
- [x] Template download buttons (CSV and XLSX) for both multiple_choice and discursive formats
- [x] Import type selector (multiple_choice / discursive)
- [x] Drag-and-drop + click-to-select file upload zone
- [x] Calls trpc.questions.bulkImport on confirmation

### Coordinator Panel (AdminPanel.tsx)
- [x] Add "Importar" tab with QuestionImport component
- [x] Add "Validação" tab with:
  - [x] Stats cards (total MC, validated, pending, active professors)
  - [x] Assign questions to professor (professor selector, discipline filter, checkbox list, assign button)
  - [x] Assignment monitoring table with status filter (all/pending/approved/rejected)
  - [x] Per-professor performance breakdown

### Professor Panel (TeacherPanel.tsx)
- [x] "Minhas Atribuições" tab: list assignments with approve/reject actions, notes field, question detail expand
- [x] "Importar Questões" tab with QuestionImport component
- [x] "Minhas Questões" tab with isValidated badge

### Rate Limiter Fix
- [x] Add ipKeyGenerator to apiLimiter (was missing, causing IPv6 warning)
- [x] Confirm trust proxy is set before rate limiter initialization
- [x] Verify no ValidationError warnings after server restart

## Extração de Questões via IA (PDF/Word) — May 2026

### Backend
- [x] Instalar dependências: pdf-parse, mammoth (DOCX → texto)
- [x] Criar tRPC procedure validation.extractFromFile: recebe base64 + mimeType, extrai texto, chama LLM com prompt estruturado, retorna array de questões no formato padrão
- [x] Prompt LLM: identificar enunciado, alternativas A-E, gabarito, tipo, dificuldade, disciplina sugerida
- [x] Suporte a múltiplos formatos: PDF (.pdf) e Word (.docx, .doc)
- [x] Retornar questões com campo _aiExtracted: true para indicar origem

### Frontend
- [x] Criar componente AIQuestionExtractor.tsx com upload drag-and-drop para PDF/DOCX
- [x] Exibir progresso de extração (spinner + mensagem de status)
- [x] Após extração, passar questões para o QuestionImport como pré-carregadas (mesma tabela de preview)
- [x] Exibir badge "Extraída por IA" em cada linha da preview
- [x] Permitir edição inline de campos antes de importar
- [x] Integrar AIQuestionExtractor na aba Importar do AdminPanel
- [x] Integrar AIQuestionExtractor na aba Importar do TeacherPanel

## Gestão de Planos e Pagamentos (Admin) — May 2026

### Schema & DB
- [x] Schema: adicionar colunas planStatus (free/trial/premium/expired), trialStartedAt, trialEndsAt, subscriptionStartedAt, subscriptionEndsAt, subscriptionPlan na tabela users
- [x] Schema: criar tabela payments (id, userId, amount, currency, status, paymentMethod, externalId, metadata, receiptUrl, failureReason, createdAt, updatedAt)
- [x] Migração SQL aplicada via webdev_execute_sql

### Backend
- [x] procedure admin.listUsersWithPlans: usuários com status, dias restantes, último pagamento
- [x] procedure admin.updateUserPlan: altera planStatus, estende trial (trialEndsAt), ativa/desativa premium, define subscriptionEndsAt
- [x] procedure admin.listPayments: histórico com filtro de status (all/pending/approved/rejected/cancelled)
- [x] procedure admin.updatePaymentStatus: atualizar status manualmente + motivo de recusa
- [x] procedure user.mySubscription: status do plano, dias restantes, último pagamento aprovado, dados do recibo

### AdminPanel
- [x] Nova aba "Planos" no AdminPanel
- [x] Tabela de usuários com colunas: nome, email, status do plano, dias de trial restantes, vencimento do plano pago
- [x] Toggle Premium/Free por usuário (com confirmação)
- [x] Botão "Estender Trial" com seletor de dias (+7, +14, +30 ou personalizado)
- [x] Painel de pagamentos com filtros: todos/pendente/aprovado/recusado/cancelado
- [x] Exibir motivo de recusa quando status=rejected
- [x] Botão para marcar pagamento como aprovado/recusado manualmente

### Página Minha Assinatura (usuário)
- [x] Rota /subscription na App.tsx
- [x] Card de status: plano atual, dias restantes, data de vencimento
- [x] Card de último pagamento: valor, data, método, status
- [x] Recibo HTML imprimível do último pagamento aprovado
- [x] Link para recibo na navbar/perfil

## Imagens em Questões — May 2026

### Schema & DB
- [x] Adicionar campo imageUrl (text, nullable) na tabela questions
- [x] Adicionar campo imageUrl (text, nullable) na tabela discursive_questions
- [x] Migração SQL aplicada

### Backend
- [x] Instalar sharp para processamento de imagens no servidor
- [x] procedure questions.uploadImage: recebe base64, redimensiona para max 1200px, converte para WebP, salva no S3, retorna URL
- [x] Atualizar procedures create/update de questions para aceitar imageUrl
- [x] Atualizar procedures create/update de discursive_questions para aceitar imageUrl

### Frontend
- [x] Componente QuestionImageUpload.tsx: drag-and-drop, preview, indicador de compressão (tamanho antes/depois)
- [ ] Integrar QuestionImageUpload no formulário de criação/edição de questões no AdminPanel
- [ ] Integrar QuestionImageUpload no formulário do TeacherPanel
- [ ] Exibir imagem nas questões durante prática (PracticeMode)
- [ ] Exibir imagem nas questões durante simulado (ExamPage)
- [ ] Exibir imagem no banco de questões (QuestionBank)
- [ ] Exibir imagem no banco de discursivas (DiscursiveBank)
- [x] Suporte a imageUrl em CSV/XLSX/JSON no importador (campo opcional, aceita URL externa)
- [x] Documentar campo imageUrl nos templates de importação (CSV e XLSX)

## Home Page & Assinantes — May 2026

- [x] Home: seção de contadores animados (questões, usuários, simulados, acertos)
- [x] Home: seção de posicionamento para profissionais formados e estudantes de veterinária
- [x] Home: CTAs diferenciados por perfil (profissional vs estudante)
- [x] Verificar fluxo de pagamento (plans.ts procedures, página /subscription)
- [x] AdminPanel: aba Assinantes com tabela de status, dias para expirar, filtros
- [x] AdminPanel: badge de alerta para assinaturas expirando em menos de 7 dias

## Bug Fixes — Trial e Assinatura (May 2026)
- [ ] Corrigir: novo usuário não recebe trial de 7 dias ao se cadastrar (upsertUser não seta plan/trialEndsAt)
- [ ] Corrigir: link "Assinar" retorna 404 (rota /subscription não encontrada ou link incorreto)
- [ ] Verificar: usuários novos aparecem na aba Assinantes do AdminPanel com status trial

## Documentação e Deploy (May 2026)
- [x] Corrigir bug trial: upsertUser deve setar plan=trial, trialStartedAt, trialEndsAt (+7d) ao criar novo usuário
- [x] Corrigir bug 404: MySubscription usa /planos que não existe, deve usar /pricing ou criar rota
- [x] Criar README.md com descrição do projeto, stack, banco de dados, variáveis de ambiente e instruções de setup
- [x] Criar requirements.txt com lista de pacotes Node.js usados
- [x] Push no GitHub via webdev_save_checkpoint
