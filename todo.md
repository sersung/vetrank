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
