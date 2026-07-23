---
title: "Business Requirements Document"
subtitle: "FitAI X — AI-Powered Adaptive Fitness Intelligence Platform"
author: "Prepared for: FitAI X Product & Engineering Team"
date: "July 23, 2026"
toc: true
toc-depth: 2
numbersections: false
geometry: margin=0.9in
mainfont: "DejaVu Sans"
monofont: "DejaVu Sans Mono"
fontsize: 10pt
header-includes: |
  \usepackage{fvextra}
  \DefineVerbatimEnvironment{Highlighting}{Verbatim}{breaklines,breakanywhere,fontsize=\small}
  \usepackage{fancyhdr}
  \pagestyle{fancy}
  \fancyhead[L]{FitAI X — BRD}
  \fancyhead[R]{\thepage}
  \fancyfoot[C]{}
---

# Document Control

| Field | Value |
|---|---|
| Document Title | FitAI X — Business Requirements Document (BRD) |
| Version | 1.0 |
| Status | Draft — For Review |
| Date | July 23, 2026 |
| Primary Platform | Mobile (iOS & Android) — ~99% of usage |
| Secondary Platform | Web / Desktop — ~1% of usage |
| Prepared Based On | Product Feature Specification + Reference Folder Structure (source documents) |

**Revision Note:** The source folder-structure reference used Python-style file naming purely as a *structural template*. This BRD translates that structure 1:1 into the agreed technology stack (Node.js, TypeScript, PostgreSQL) — no folders were added or removed beyond the explicit architecture decisions recorded in Section 6.

---

# 1. Executive Summary

FitAI X is an AI-driven adaptive fitness platform, not a static workout tracker. Its core differentiator is that it **re-evaluates the user's entire fitness journey continuously** — factoring in sleep, recovery, missed sessions, injuries, travel, equipment access, and shifting goals — rather than pushing a fixed weekly plan regardless of real life.

The platform is being built primarily as a **mobile application (React Native, ~99% of expected usage)** with a **companion web/desktop application (React.js, ~1% of usage)** that offers a richer, desktop-optimized experience (command palette, multi-panel dashboards, drag-and-drop workout builder) for power users and situations where a larger screen adds value.

The backend is a **Node.js + TypeScript** system exposing **versioned RESTful APIs** (`/api/v1`), backed by **PostgreSQL**, structured as a **modular monolith with two purpose-extracted microservices** (AI Engine, Realtime) — chosen to balance engineering simplicity with the genuine scaling needs of AI inference and live WebSocket traffic.

This document defines the business problem, scope, functional and non-functional requirements, system architecture, folder structure, data considerations, and deliverables required to build FitAI X.

---

# 2. Business Problem & Opportunity

Existing fitness apps largely assume the user will follow a fixed, pre-set plan (e.g., "Monday = Chest, Tuesday = Back"). Real life does not cooperate with fixed plans. Common breakdowns include:

- The user sleeps only 4 hours the night before a heavy session.
- The user misses 3 workouts in a row.
- The user gets injured mid-program.
- The user travels and loses gym access.
- The user only has 20 minutes instead of 60.
- Gym equipment is unavailable or occupied.
- The user changes their goal mid-program (e.g., weight loss → muscle gain → half marathon).
- The user gains weight instead of losing it, and the plan doesn't adapt.
- The user's motivation drops and adherence slips.

Most competing apps simply continue the original static plan regardless of these events. **FitAI X's core business opportunity is an AI engine that rethinks the fitness plan every day**, based on real signals about the user's life, and **explains its reasoning** rather than acting as a black box.

---

# 3. Goals & Objectives

1. Replace static weekly workout templates with a **daily-adaptive AI planning engine**.
2. Make every AI decision **explainable** — no silent plan changes.
3. Support **goal changes at any point** without losing historical progress data.
4. Maintain a **long-term memory** of the user's fitness journey (injuries, goal changes, milestones).
5. Detect and prevent **unsafe or conflicting workout sequencing** automatically.
6. Provide a **real-time, live-updating dashboard** experience (not static cards).
7. Support **offline usage** with reliable conflict resolution on reconnect.
8. Deliver a **best-in-class mobile experience** as the primary product, with a fully capable, desktop-optimized web experience as a secondary surface — not a stripped-down afterthought.
9. Build on an architecture that can **scale by domain** (Auth, AI, Workouts, Nutrition, Analytics, Realtime) without a rewrite.

---

# 4. Project Scope

## 4.1 In Scope

- Mobile application (iOS + Android) via React Native — primary product surface.
- Web/desktop application via React.js — secondary product surface with an enhanced desktop UI (command palette, multi-panel dashboard, drag-and-drop builder, advanced analytics).
- Node.js + TypeScript backend exposing versioned RESTful APIs.
- PostgreSQL as the system of record.
- All 20 core AI/product features listed in Section 8 (Adaptive Planning Engine through Real-Time Dashboard).
- Supporting platform services: Authentication, User Profiles, Analytics, Notifications, AI Coach ("Rachel"), Realtime/WebSocket layer.
- Backend infrastructure: event-driven pipeline, background job processing, optimistic UI support, offline sync, AI processing queue, medical/progress document storage and analysis.
- API endpoints with seed/test datasets, a deployed environment, a GitHub repository, and feature-wise documentation (flowchart-preferred).

## 4.2 Out of Scope (for this phase)

- Native desktop installers (the "desktop" surface is a responsive web application, not an Electron/native app, unless a future phase requires it).
- Wearable-device firmware or direct integrations with third-party wearables (heart rate is manually entered per the source specification).
- Payment/subscription billing (not mentioned in source material — to be scoped separately if required).
- Multi-language localization (assumed English-first unless stated otherwise).

## 4.3 Platform Usage Split

| Platform | Technology | Expected Usage | Role |
|---|---|---|---|
| Mobile (iOS/Android) | React Native | ~99% | Primary daily-use product |
| Web/Desktop | React.js | ~1% | Power-user / larger-screen companion experience, full feature parity |

---

# 5. Stakeholders (Recommended — to be confirmed by Project Sponsor)

| Role | Responsibility |
|---|---|
| Product Owner / Sponsor | Final authority on scope, priority, and acceptance |
| Project Manager | Timeline, coordination, risk tracking |
| Engineering Lead / Architect | Owns technical architecture decisions (Section 6) |
| Mobile Developers (React Native) | Primary app build |
| Web Developers (React.js) | Companion app build |
| Backend Developers (Node.js/TypeScript) | Core API, microservices, data layer |
| AI/ML Engineer | Llama integration, prompt design, explainability logic |
| UI/UX Designer | Design system, dashboard, workout builder, analytics UI |
| QA/Test Engineer | Test plans, API test datasets, regression |
| DevOps/SRE | CI/CD, deployment, monitoring, scaling |
| End Users | Primary: mobile fitness users. Secondary: desktop/power users |

---

# 6. System Architecture

## 6.1 Architectural Style: Modular Monolith + Purpose-Extracted Microservices

The source specification calls for "Microservices along with Modular Folder Design." Splitting every one of the 20 features into its own independently-deployed microservice would require abandoning the given folder structure (each service would need its own repo, entry point, and database). Instead, this BRD adopts a **hybrid model**, which is standard practice for teams that want microservice benefits without premature operational overhead:

- **Core App (Modular Monolith):** A single deployable Node.js/TypeScript service that contains the exact folder structure supplied (Section 7), covering all numbered feature modules (01–18), Authentication, Users, Analytics, and Notifications. One codebase, one database connection pool, one deployment pipeline — but strictly separated internally by domain, so any module can be extracted later with minimal rework.
- **AI Engine Service (Microservice):** Extracted because AI inference calls (Llama) are long-running, computationally heavy, and need independent scaling/rate-limiting separate from normal CRUD traffic. Hosts the AI Coach ("Rachel"), explanation generation, and AI-heavy prediction logic.
- **Realtime Service (Microservice):** Extracted because WebSocket connections (Socket.IO) are long-lived and scale differently (by concurrent connections, not requests/sec) from REST traffic. Hosts the live dashboard, presence, and offline-sync event stream.

This means: **the folder structure you provided is preserved exactly** — the only change is that two of its existing folders (`ai_coach/`, `realtime/`) become independently deployable services rather than in-process modules.

## 6.2 High-Level Architecture

```
                      ┌───────────────────────────────────────┐
                      │              Client Layer               │
                      │  React Native App (iOS / Android)       │  ~99% usage
                      │  React.js Web / Desktop App             │  ~1% usage
                      └───────────────────┬─────────────────────┘
                                          │  HTTPS REST (/api/v1)  +  WebSocket
                      ┌───────────────────▼─────────────────────┐
                      │      API Gateway / BFF (Node.js)          │
                      │  Auth verification, rate limiting,        │
                      │  request routing, API versioning           │
                      └───┬───────────────────┬───────────────────┘
                          │                   │
          ┌───────────────▼───┐   ┌───────────▼──────────────┐
          │     Core App        │   │    AI Engine Service       │
          │ (Modular Monolith)  │   │      (Microservice)        │
          │  Node.js + TS       │   │      Node.js + TS          │
          │  - Auth              │   │  - AI Coach ("Rachel")     │
          │  - Users             │   │  - Adaptive Planning calls  │
          │  - Workouts (01-18)  │   │  - Explainability engine    │
          │  - Analytics         │   │  - Fatigue / Injury models   │
          │  - Notifications     │   │  - Llama inference client    │
          │  - Jobs (BullMQ)     │   └───────────┬─────────────────┘
          └──────────┬────────────┘               │
                     │             ┌───────────────▼─────────────┐
                     │             │      Realtime Service         │
                     │             │       (Microservice)          │
                     │             │   Socket.IO Gateway            │
                     │             │   Live Dashboard / Presence     │
                     │             │   Offline Sync Event Stream      │
                     │             └───────────────┬─────────────────┘
                     │                             │
          ┌──────────▼─────────────────────────────▼───────────┐
          │                Shared Infrastructure                  │
          │   PostgreSQL   |   Redis (BullMQ + Pub/Sub)   |  S3    │
          │   (system of record)  (jobs, cache, events)  (documents)│
          └────────────────────────────────────────────────────────┘
```

## 6.3 Communication Between Services

- **Core App → AI Engine Service:** Internal REST call or message queue (Redis/BullMQ) when a workout needs AI-generated content, an explanation, or a prediction. Async where possible to avoid blocking the main request thread.
- **Core App → Realtime Service:** Publishes domain events (workout completed, streak updated, recovery score changed) to a Redis pub/sub channel; Realtime Service consumes and pushes to connected clients via Socket.IO.
- **All services → PostgreSQL:** Single shared database in this phase (schema-separated by domain) to avoid distributed-transaction complexity; can be split into per-service databases in a later phase if load requires it.

## 6.4 Technology Stack Summary

| Layer | Technology |
|---|---|
| Mobile Frontend | React Native, TypeScript |
| Web/Desktop Frontend | React.js (Vite or Next.js), TypeScript |
| Shared Frontend Code | Monorepo packages (`shared-types`, `ui-kit`) — Turborepo or Nx |
| Backend Runtime | Node.js, TypeScript |
| API Style | RESTful, versioned (`/api/v1`) |
| Database | PostgreSQL |
| ORM/Migrations | Prisma (or TypeORM) — replaces the `alembic/` folder shown in the reference structure |
| Background Jobs | BullMQ (Redis-backed) |
| Realtime | Socket.IO |
| AI/LLM | Llama (self-hosted via vLLM, or hosted inference provider — final choice is a deployment/cost decision) |
| Object Storage | S3-compatible storage for medical reports, DEXA scans, progress photos |
| Containerization | Docker; Docker Compose for local dev |

---

# 7. Backend Folder Structure (Node.js / TypeScript)

This mirrors the reference structure supplied, translated file-for-file into the agreed stack. `01`–`18` map directly to Features 1–18 in Section 8 (Feature 19, Workout Dependency Graph, is implemented inside `09-ai-exercise-graph/dependencies.ts` and `propagate.ts`, consistent with the reference structure, which did not allocate it a separate numbered folder). Feature 20 (Real-Time Dashboard) is implemented by the `realtime/` module, extracted as its own service per Section 6.

```
fitaix/
│
├── backend/
│   │
│   ├── core-api/                              # Modular Monolith — Node.js + TypeScript
│   │   ├── src/
│   │   │   ├── services/
│   │   │   │   ├── 01-adaptive-planning-engine/
│   │   │   │   │   ├── signals/
│   │   │   │   │   │   ├── sleep.ts
│   │   │   │   │   │   ├── calories.ts
│   │   │   │   │   │   ├── missed-workouts.ts
│   │   │   │   │   │   ├── equipment.ts
│   │   │   │   │   │   ├── injury-history.ts
│   │   │   │   │   │   └── schedule.ts
│   │   │   │   │   ├── generator.ts
│   │   │   │   │   ├── rules.ts
│   │   │   │   │   └── recommend.ts
│   │   │   │   │
│   │   │   │   ├── 02-workout-version-control/
│   │   │   │   │   ├── actions/
│   │   │   │   │   │   ├── create.ts
│   │   │   │   │   │   ├── compare.ts
│   │   │   │   │   │   └── rollback.ts
│   │   │   │   │   ├── history.ts
│   │   │   │   │   └── explanation-link.ts
│   │   │   │   │
│   │   │   │   ├── 03-ai-decision-explanation/
│   │   │   │   │   ├── templates/
│   │   │   │   │   │   ├── remove.txt
│   │   │   │   │   │   └── replace.txt
│   │   │   │   │   ├── generator.ts
│   │   │   │   │   └── logger.ts
│   │   │   │   │
│   │   │   │   ├── 04-dynamic-goal-engine/
│   │   │   │   │   ├── switch/
│   │   │   │   │   │   └── input.ts
│   │   │   │   │   ├── recalculate.ts
│   │   │   │   │   └── history.ts
│   │   │   │   │
│   │   │   │   ├── 05-ai-memory-timeline/
│   │   │   │   │   ├── write.ts
│   │   │   │   │   ├── read.ts
│   │   │   │   │   ├── search.ts
│   │   │   │   │   ├── resolve-conflicts.ts
│   │   │   │   │   ├── visibility.ts
│   │   │   │   │   └── correct.ts
│   │   │   │   │
│   │   │   │   ├── 06-smart-habit-engine/
│   │   │   │   │   ├── detect.ts
│   │   │   │   │   ├── auto-adjust.ts
│   │   │   │   │   └── confidence.ts
│   │   │   │   │
│   │   │   │   ├── 07-ai-recovery-score/
│   │   │   │   │   ├── inputs/
│   │   │   │   │   │   ├── sleep.ts
│   │   │   │   │   │   ├── hydration.ts
│   │   │   │   │   │   ├── workout-load.ts
│   │   │   │   │   │   ├── heart-rate.ts
│   │   │   │   │   │   └── stress-soreness.ts
│   │   │   │   │   ├── score.ts
│   │   │   │   │   └── modify-workout.ts
│   │   │   │   │
│   │   │   │   ├── 08-workout-conflict-detection/
│   │   │   │   │   ├── muscle-group.ts
│   │   │   │   │   └── injury-exercise.ts
│   │   │   │   │
│   │   │   │   ├── 09-ai-exercise-graph/            # also implements Feature 19 (Dependency Graph)
│   │   │   │   │   ├── node.ts
│   │   │   │   │   ├── dependencies.ts
│   │   │   │   │   ├── propagate.ts
│   │   │   │   │   └── build.ts
│   │   │   │   │
│   │   │   │   ├── 10-progressive-overload-engine/
│   │   │   │   │   ├── workout-progress/
│   │   │   │   │   │   ├── reps.ts
│   │   │   │   │   │   ├── sets.ts
│   │   │   │   │   │   └── weight.ts
│   │   │   │   │   ├── rest.ts
│   │   │   │   │   ├── tempo.ts
│   │   │   │   │   └── deload.ts
│   │   │   │   │
│   │   │   │   ├── 11-fatigue-prediction/
│   │   │   │   │   ├── model.ts
│   │   │   │   │   ├── risk.ts
│   │   │   │   │   └── factors.ts
│   │   │   │   │
│   │   │   │   ├── 12-workout-simulator/
│   │   │   │   │   ├── modes/
│   │   │   │   │   │   ├── duration.ts
│   │   │   │   │   │   └── location.ts
│   │   │   │   │   └── regenerate.ts
│   │   │   │   │
│   │   │   │   ├── 13-scenario-planner/
│   │   │   │   │   ├── templates/
│   │   │   │   │   │   ├── travel.ts
│   │   │   │   │   │   └── low-equipment.ts
│   │   │   │   │   ├── detect.ts
│   │   │   │   │   └── hotel-workout.ts
│   │   │   │   │
│   │   │   │   ├── 14-meal-planner-budget/
│   │   │   │   │   ├── filters/
│   │   │   │   │   │   ├── budget.ts
│   │   │   │   │   │   ├── region.ts
│   │   │   │   │   │   ├── diet.ts
│   │   │   │   │   │   └── cooking-skill.ts
│   │   │   │   │   └── generate.ts
│   │   │   │   │
│   │   │   │   ├── 15-ai-grocery-generator/
│   │   │   │   │   ├── weekly-aggregate.ts
│   │   │   │   │   ├── list-builder.ts
│   │   │   │   │   ├── cost.ts
│   │   │   │   │   └── reuse-optimizer.ts
│   │   │   │   │
│   │   │   │   ├── 16-streak-protection/
│   │   │   │   │   ├── busy-day.ts
│   │   │   │   │   ├── micro-workout.ts
│   │   │   │   │   └── tracker.ts
│   │   │   │   │
│   │   │   │   ├── 17-smart-calendar/
│   │   │   │   │   ├── dependencies/
│   │   │   │   │   │   ├── recovery-shift.ts
│   │   │   │   │   │   └── calorie-shift.ts
│   │   │   │   │   ├── reschedule.ts
│   │   │   │   │   └── recalculate.ts
│   │   │   │   │
│   │   │   │   ├── 18-ai-injury-predictor/
│   │   │   │   │   ├── load.ts
│   │   │   │   │   ├── sleep-correlation.ts
│   │   │   │   │   ├── history-match.ts
│   │   │   │   │   └── warning.ts
│   │   │   │   │
│   │   │   │   ├── authentication/
│   │   │   │   │   ├── google.ts
│   │   │   │   │   ├── email.ts
│   │   │   │   │   ├── signup.ts
│   │   │   │   │   ├── jwt.ts
│   │   │   │   │   └── logout.ts
│   │   │   │   │
│   │   │   │   ├── users/
│   │   │   │   │   ├── profile.ts
│   │   │   │   │   ├── equipment.ts
│   │   │   │   │   ├── preferences.ts
│   │   │   │   │   └── settings.ts
│   │   │   │   │
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── adherence.ts
│   │   │   │   │   ├── missed-workouts.ts
│   │   │   │   │   ├── weekly-summary.ts
│   │   │   │   │   └── injury-memory-model.ts
│   │   │   │   │
│   │   │   │   └── notifications/
│   │   │   │       ├── streak-reminder.ts
│   │   │   │       └── plan-change.ts
│   │   │   │
│   │   │   ├── jobs/
│   │   │   │   ├── memory-extract.job.ts
│   │   │   │   ├── plan-generate.job.ts
│   │   │   │   └── notification.job.ts
│   │   │   │
│   │   │   ├── core/
│   │   │   │   ├── config.ts
│   │   │   │   ├── database.ts
│   │   │   │   ├── security.ts
│   │   │   │   ├── events.ts
│   │   │   │   └── exceptions.ts
│   │   │   │
│   │   │   ├── models/                          # Prisma / TypeORM entities
│   │   │   ├── schemas/                         # Zod / class-validator DTOs
│   │   │   ├── routes/                          # /api/v1 route definitions, one per module
│   │   │   └── index.ts                         # app entry point (replaces main.py)
│   │   │
│   │   ├── prisma/                              # migrations (replaces alembic/)
│   │   ├── tests/
│   │   ├── .env
│   │   ├── package.json                         # replaces requirements.txt
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   │
│   ├── ai-engine-service/                       # Extracted Microservice #1
│   │   ├── src/
│   │   │   ├── ai-coach/                        # "Rachel" — AI live coach
│   │   │   │   ├── templates/
│   │   │   │   │   └── reply.txt
│   │   │   │   ├── chat.ts
│   │   │   │   ├── voice.ts
│   │   │   │   └── actions.ts
│   │   │   ├── inference/
│   │   │   │   └── llama-client.ts              # Llama inference wrapper
│   │   │   ├── queue/
│   │   │   │   └── ai-queue.consumer.ts         # AI Queue worker
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── .env
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── realtime-service/                        # Extracted Microservice #2
│   │   ├── src/
│   │   │   ├── realtime/
│   │   │   │   ├── socket.ts
│   │   │   │   ├── live-events.ts
│   │   │   │   └── offline-sync.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── .env
│   │   ├── package.json
│   │   └── Dockerfile
│   │
├── frontend/
│   ├── mobile/                                  # React Native — primary app (~99% usage)
│   │   ├── src/
│   │   │   ├── app/                             # screens / navigation
│   │   │   ├── components/
│   │   │   │   ├── constellation/               # AI Memory Timeline visualization
│   │   │   │   ├── timeline/
│   │   │   │   ├── charts/
│   │   │   │   ├── coach-chat/
│   │   │   │   └── user-switcher/
│   │   │   ├── lib/
│   │   │   ├── hooks/
│   │   │   └── store/                           # client state (server state via React Query)
│   │   ├── android/
│   │   ├── ios/
│   │   ├── app.json
│   │   └── package.json
│   │
│   └── web/                                     # React.js — companion app (~1% usage)
│       ├── src/
│       │   ├── app/                             # routes
│       │   ├── components/
│       │   │   ├── constellation/
│       │   │   ├── timeline/
│       │   │   ├── charts/
│       │   │   ├── coach-chat/
│       │   │   └── user-switcher/
│       │   └── lib/
│       ├── public/
│       └── package.json
│
├── packages/                                    # shared across frontend & backend
│   ├── shared-types/                            # TS interfaces/DTOs shared FE + BE
│   ├── ui-kit/                                  # shared design tokens/components
│   └── config/                                  # shared eslint/tsconfig
│
├── docker/
├── docker-compose.yml
├── turbo.json                                   # monorepo build orchestration (or Nx)
└── package.json                                 # root workspace
```

---

# 8. Functional Requirements

Each requirement below is written for direct hand-off into feature-level design/development tickets. Priority is a recommended MoSCoW rating based on the source specification's emphasis and is subject to product-owner validation.

### FR-001 — Adaptive AI Planning Engine
**Description:** Generate "Today's Best Workout" dynamically every day rather than serving a fixed weekly template.
**Inputs:** Yesterday's workout, sleep data, calorie intake, missed-workout count, available equipment (from user profile), injury history, workout schedule.
**Behavior:** AI + rule engine + recommendation engine combine these signals to produce a single recommended session per day.
**Priority:** Must Have

### FR-002 — Workout Version Control
**Description:** Every AI-generated workout is stored as an immutable version (Git-like).
**Behavior:** Users can view workout history, compare versions, roll back to a prior version, and see the AI explanation tied to each version change.
**Priority:** Must Have

### FR-003 — AI Decision Explanation
**Description:** Every AI recommendation must include a human-readable reason (e.g., "Removed Squats — knee pain reported yesterday, recovery score 48%, replaced with Leg Press").
**Behavior:** Explanations are generated via prompt-engineered templates and logged alongside the decision for auditability.
**Priority:** Must Have

### FR-004 — Dynamic Goal Engine
**Description:** Users can change their fitness goal at any time (e.g., Lose Weight → Gain Muscle → Half Marathon → Powerlifting).
**Behavior:** Workout, nutrition, calorie targets, recovery model, progress tracking, and analytics all recalculate automatically without discarding historical data.
**Priority:** Must Have

### FR-005 — AI Memory Timeline
**Description:** A persistent, chronological memory of the user's journey (e.g., "January: wanted weight loss → March: shoulder injury → April: changed goal → June: completed challenge").
**Behavior:** Supports write, read, search, conflict resolution (e.g., contradictory user statements over time), visibility controls, and correction of past entries.
**Priority:** Must Have

### FR-006 — Smart Habit Engine
**Description:** Detects recurring behavioral patterns (e.g., "workout missed every Friday").
**Behavior:** Instead of sending a passive reminder, the system proactively reschedules the plan around the detected pattern, with a confidence score attached to each detection.
**Priority:** Should Have

### FR-007 — AI Recovery Score
**Description:** A composite recovery percentage calculated from sleep, hydration, workout load, heart rate (manual entry), and stress/soreness inputs.
**Behavior:** Recovery score directly modifies the day's recommended workout intensity.
**Priority:** Must Have

### FR-008 — Workout Conflict Detection
**Description:** Prevents unsafe or redundant sequencing — e.g., two heavy-leg days back to back, or a Military Press recommendation following a reported shoulder injury.
**Behavior:** Rule-based dependency checking runs before any workout is finalized.
**Priority:** Must Have

### FR-009 — AI Exercise Graph
**Description:** Every exercise is modeled as a graph node connected to the muscle groups it trains (e.g., Bench Press → Chest → Front Delts → Triceps).
**Behavior:** Changing one exercise automatically recalculates total workload across connected muscle groups.
**Priority:** Should Have

### FR-010 — Progressive Overload Engine
**Description:** Replaces naive "week++, weight++" progression with AI-predicted adjustments across reps, sets, weight, rest, tempo, and scheduled deloads.
**Priority:** Must Have

### FR-011 — Fatigue Prediction
**Description:** Predicts the likelihood the user will fail their next workout, based on recovery, sleep, calories, and recent training intensity, with the contributing factors surfaced to the user.
**Priority:** Should Have

### FR-012 — Workout Simulator
**Description:** Before accepting a workout, users can simulate alternate constraints (20/30/45 minutes; home/gym) and get an instantly regenerated plan.
**Priority:** Should Have

### FR-013 — Scenario Planner
**Description:** Detects upcoming scenarios (e.g., "traveling next week") and proactively generates an adapted plan (e.g., hotel-room workouts) ahead of time.
**Priority:** Should Have

### FR-014 — Meal Planner with Budget
**Description:** Generates meal plans considering budget, living situation (e.g., hostel), country/region, dietary restriction, religion, and cooking skill — rather than generic "eat chicken" advice.
**Priority:** Must Have

### FR-015 — AI Grocery Generator
**Description:** Converts a week's meal plan into a shopping list with cost estimation and ingredient-reuse optimization to minimize waste and spend.
**Priority:** Should Have

### FR-016 — Streak Protection
**Description:** On detecting a "busy day" signal, the system offers a 5-minute micro-workout instead of allowing the user's streak to break.
**Priority:** Should Have

### FR-017 — Smart Calendar
**Description:** Drag-and-drop workout rescheduling; moving a session automatically recalculates dependent recovery windows and calorie targets.
**Priority:** Must Have

### FR-018 — AI Injury Predictor
**Description:** Analyzes workout load, sleep, recovery trends, and injury history to proactively warn the user of elevated injury risk.
**Priority:** Should Have

### FR-019 — Workout Dependency Graph
**Description:** Models cause-and-effect chains between exercises (e.g., Deadlift → lower-back fatigue → avoid Rows → recommend Pull-ups instead).
**Priority:** Must Have

### FR-020 — Real-Time Dashboard
**Description:** A live, Socket.IO-powered dashboard (not static cards) showing current workout, calories, water, heart rate, active users, leaderboard, workout feed, and AI suggestions in real time.
**Priority:** Must Have

### FR-021 — AI Coach ("Rachel")
**Description:** A conversational AI coach supporting chat and voice interaction, capable of taking direct actions in the app (e.g., adjusting a workout) on the user's behalf.
**Priority:** Must Have

### FR-022 — Authentication & Account Management
**Description:** Google OAuth and email/password sign-up, JWT-based session management, and logout.
**Priority:** Must Have

### FR-023 — User Profile, Equipment & Preferences
**Description:** Stores user profile data, available equipment, dietary/workout preferences, and app settings — the primary source of "available equipment" and "profile" signals feeding FR-001.
**Priority:** Must Have

### FR-024 — Analytics & Reporting
**Description:** Tracks adherence rate, missed-workout patterns, weekly summaries, and an injury-memory model correlating past injuries with training decisions.
**Priority:** Must Have

### FR-025 — Notifications
**Description:** Streak reminders and plan-change notifications, triggered by the event-driven pipeline (FR-026).
**Priority:** Must Have

### FR-026 — Event-Driven Workout Completion Pipeline
**Description:** On workout completion, an event flows through a queue to update analytics, progress, streaks, generate AI feedback, and notify the user — asynchronously, not as one blocking request.
**Priority:** Must Have

### FR-027 — Background Job Scheduling
**Description:** Scheduled jobs (via BullMQ) generate tomorrow's workout, generate the grocery list, compute weekly analytics, and run backups — e.g., nightly at midnight.
**Priority:** Must Have

### FR-028 — Optimistic UI Updates
**Description:** The frontend updates instantly on user action and rolls back automatically if the backend request fails.
**Priority:** Should Have

### FR-029 — Offline Support & Conflict Resolution
**Description:** Workouts can continue fully offline; data syncs back to the server when connectivity returns, with defined conflict-resolution rules for data changed in both places.
**Priority:** Must Have

### FR-030 — Asynchronous AI Processing Queue
**Description:** AI generation requests (workout generation, explanations, coaching responses) are queued and processed by workers rather than blocking the request thread, with the result delivered via notification/websocket push.
**Priority:** Must Have

### FR-031 — Medical Document Storage & AI Analysis
**Description:** Users can upload blood reports, medical reports, DEXA scans, and progress photos; the AI Engine Service analyzes these to inform recovery, nutrition, and planning decisions.
**Priority:** Should Have

---

# 9. Non-Functional Requirements

## 9.1 Frontend Scalability
- Feature-based folder architecture on both mobile and web apps.
- Lazy-loaded routes/screens and code splitting.
- Shared, reusable component library (`packages/ui-kit`) used by both apps.
- Clear separation of server state (e.g., React Query/TanStack Query) from client-only UI state.

## 9.2 Backend Scalability
- Modular architecture with clear domain boundaries: Auth, Users, AI, Workouts, Nutrition, Analytics (matches Section 7 folder structure).
- Service and repository layers separating business logic from data access.
- Centralized error handling and request validation middleware.
- Background workers (BullMQ) decoupled from the request/response cycle.
- Event-emitter pattern for internal domain events (workout completed, goal changed, etc.).
- API versioning from day one (`/api/v1`), so breaking changes don't require a big-bang migration.

## 9.3 Database
- PostgreSQL as the system of record. The reference structure's NoSQL-style "collections" language (version collections, audit collections) translates to relational patterns:
  - **Versioning:** version tables carry `version_number`, `parent_version_id`, and `is_current` columns (e.g., `workout_versions`).
  - **Soft deletes:** `deleted_at` timestamp columns rather than hard deletes, on all user-facing entities.
  - **Audit trail:** a dedicated `audit_log` table (or trigger-based logging) capturing who changed what, when.
  - **Indexing:** composite indexes on `(user_id, created_at)` for time-series-style queries (workouts, recovery scores, memory timeline); adjacency-style indexes for the exercise/dependency graph (FR-009, FR-019).
  - **Pagination:** cursor-based pagination on all list endpoints to keep performance consistent as data grows.

## 9.4 Security & Compliance
- JWT-based authentication; OAuth (Google) as an alternative sign-in method.
- Encryption at rest for medical documents (blood reports, DEXA scans) and encryption in transit (HTTPS/TLS) everywhere.
- Because the platform stores health-adjacent data (medical reports, injury history), the team should evaluate applicable data-privacy obligations (e.g., HIPAA-like handling practices, regional data-protection law such as GDPR/DPDP depending on target markets) even though this was not explicitly specified in the source material — flagged here as a recommended safeguard, to be confirmed with legal/compliance.

## 9.5 Performance & Availability
- Real-time dashboard updates delivered via WebSocket with sub-second latency target.
- AI generation requests should not block the main request thread; long-running AI calls are queued and pushed to the client asynchronously.
- Target uptime and latency SLAs to be defined by the Product Owner in a follow-up technical SLA document.

## 9.6 Offline & Resilience
- Core workout-logging functionality must remain usable with no network connection.
- Defined, deterministic conflict-resolution rules when offline-recorded data reaches the server after other changes occurred (Section 8, FR-029).

---

# 10. UI/UX Requirements

## 10.1 Design Language
- Modern dark/light themes with persisted user preference.
- Responsive layout across mobile, tablet, and desktop (desktop being the React.js companion app).
- Glassmorphism or minimal, modern card-based visual style.
- A single consistent design system (spacing, typography, color, reusable components) shared between mobile and web via `packages/ui-kit`.

## 10.2 Core Layout
- Persistent, collapsible left sidebar for navigation (primarily on the web/desktop app, where screen space allows it).
- Top navigation bar with search, notifications, AI Coach access, and profile.
- Right-side contextual AI assistant panel (collapsible) — a natural fit for the desktop app's wider layout; on mobile, implemented as a bottom-sheet or full-screen coach view.
- Breadcrumb navigation for deep pages (primarily desktop).
- Global command palette (`Ctrl+K`) — a desktop-only pattern; on mobile this is replaced by a search/quick-actions entry point.

## 10.3 Dashboard
- Draggable, resizable widgets (desktop app; mobile app uses a fixed, optimized single-column layout for the same widgets).
- Live charts updating via WebSocket.
- Calendar timeline showing workouts, meals, and recovery together.
- Goal progress rings and streak indicators.
- AI recommendation card with an inline explanation (ties directly to FR-003).

## 10.4 Workout Builder
- Drag-and-drop workout editor.
- Exercise cards with embedded video previews.
- Real-time muscle-group visualization (ties to FR-009, the Exercise Graph).
- Instant conflict warnings as the user edits (ties to FR-008).
- Version history drawer (ties to FR-002).

## 10.5 Analytics
- Interactive charts filterable by week/month/year.
- Heatmap of workout consistency.
- Muscle-balance radar chart.
- Recovery trend graphs.
- Nutrition compliance charts.

## 10.6 AI Experience
- Streaming AI responses (token-by-token rendering) in the coach chat.
- Conversation history grouped by topic.
- An explanation panel attached to every AI recommendation, everywhere in the app.
- Side-by-side comparison of the previous AI-generated plan vs. the current one.

---

# 11. API Standards

- All endpoints are versioned under `/api/v1/...` from launch.
- REST conventions: resource-oriented URLs, standard HTTP verbs and status codes, consistent error-response envelope across all services (Core App, AI Engine Service, Realtime Service).
- Pagination, filtering, and sorting conventions applied consistently across all list endpoints.
- Each delivered endpoint must ship with a seed/test dataset sufficient to exercise it end-to-end (see Deliverables, Section 13).

---

# 12. Engineering Challenges (Assessment Focus Areas)

| Challenge | Purpose |
|---|---|
| Adaptive Workout Engine | Dynamic business logic |
| Workout Version Control | Data versioning |
| Conflict Detection Engine | Rule-based validation |
| Dependency Graph | Graph algorithms |
| AI Memory Timeline | Context management |
| Offline Sync & Conflict Resolution | Distributed state handling |
| Event-Driven Notifications | Asynchronous architecture |
| Background Job Processing | Queue management |
| Real-Time Dashboard | WebSocket integration |
| Explainable AI | Prompt engineering & transparency |
| Dynamic Goal Recalculation | Complex business logic |
| Grocery Optimization | Algorithmic thinking |
| Optimistic UI Updates | Advanced frontend architecture |
| AI Recommendation Caching | Performance optimization |
| Modular & Scalable Architecture | Maintainability and extensibility |

---

# 13. Deliverables

1. **Deployed Link** — a live, publicly accessible environment (mobile build distribution + web app URL).
2. **API Endpoints with Datasets** — full `/api/v1` surface with seed/test data sufficient to exercise every endpoint.
3. **GitHub Repository** — full source, matching the folder structure in Section 7, with clear commit history.
4. **Feature-Wise Documentation** — one flowchart/diagram per major feature (preferred format), covering the 20 core features plus supporting platform services.

---

# 14. Assumptions & Constraints

- The reference folder structure's Python file naming was a structural template only; no business logic, library, or framework choice was implied by it. All logic is implemented in TypeScript per the agreed stack.
- Heart-rate data is manually entered by the user; no wearable-device integration is assumed in this phase.
- "Desktop" refers to a responsive React.js web application, not a native desktop installer, unless a future phase specifies otherwise.
- A single shared PostgreSQL database is used across all three backend services in this phase; splitting into per-service databases is a future scaling option, not a Phase 1 requirement.
- Final selection of the Llama hosting approach (self-hosted vLLM vs. a managed inference provider) is a deployment/cost decision to be made during technical design, not fixed by this BRD.
- Stakeholder list in Section 4 is a recommended default and should be confirmed/adjusted by the project sponsor.

---

# 15. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| AI inference latency degrades core app responsiveness | AI Engine Service is isolated as its own microservice with its own queue (FR-030), so slow inference never blocks the main request/response cycle |
| Offline-sync conflicts corrupt user data | Deterministic, documented conflict-resolution rules (FR-029); server remains source of truth for conflicting writes |
| Single shared Postgres database becomes a scaling bottleneck | Modular schema separation by domain from day one, enabling a future split into per-service databases without a full rewrite |
| Scope creep across 20+ AI features delays delivery | MoSCoW prioritization in Section 8 to sequence Must Have features first |
| Medical document storage creates compliance exposure | Encryption at rest/in transit and a compliance review flagged in Section 9.4 before launch |
| React Native / React.js code divergence increases maintenance cost | Shared `packages/shared-types` and `packages/ui-kit` in a single monorepo |

---

# 16. Success Metrics / KPIs (Recommended)

- Daily plan-adaptation rate (% of days the AI plan differs from a naive static template, showing genuine adaptivity).
- Workout completion / adherence rate.
- Streak-retention rate after Streak Protection (FR-016) intervention vs. without it.
- AI explanation view rate (are users actually engaging with the "why," validating FR-003's value).
- Time-to-recovery-plan-update after a reported injury (validating FR-018 responsiveness).
- Mobile vs. web usage split, tracked against the assumed 99%/1% baseline.

---

# Appendix A — Glossary

| Term | Meaning |
|---|---|
| BFF | Backend-for-Frontend — a thin API gateway layer tailored to client needs |
| BullMQ | Redis-backed background job/queue library for Node.js |
| MoSCoW | Prioritization method: Must have, Should have, Could have, Won't have |
| Modular Monolith | A single deployable application with strict internal domain boundaries, structured so modules can be extracted into services later |
| Optimistic UI | UI pattern where the interface updates immediately, assuming success, and rolls back only on failure |
| Socket.IO | Library enabling real-time, bidirectional WebSocket communication between client and server |

