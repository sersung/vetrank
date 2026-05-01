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
- [ ] Deploy (user clicks Publish button in Management UI)

## Pricing Update
- [x] Update Pricing page: Free (30 questões/mês), Premium Mensal R$ 39,90, Premium Anual R$ 299,00 (R$ 24,90/mês equivalente, 37% desconto)
- [x] Add price anchoring: show monthly equivalent on annual plan
- [x] Add "Melhor Custo-Benefício" badge on annual plan
- [x] Update Home.tsx pricing section with same values

## AI Provider & Question Database
- [x] Replace Anthropic Claude with Gemini Flash in ai.ts router (gemini-2.5-flash)
- [x] Add GEMINI_API_KEY to project secrets
- [x] Generate 1,551 questions (Round 1 done); background generation continues to 5,000
- [x] Seed 6 disciplines and 47 subjects into database
- [x] Seed 1,551 questions into database; seed_topup.mjs ready for remaining batches
- [x] Verified via seed output: 6 disciplines, 141 subjects, 1,551 questions in DB
