# 🤖 FitAI X — AI Personal Fitness Coach

**Version:** 1.0.0 | **License:** ISC | **Maintainer:** [@mritunjai-prog](https://github.com/mritunjai-prog)

<p align="center">
  <img src="frontend/mobile/assets/logoforlightmode.png" alt="FitAI X Logo" width="200" />
</p>

<p align="center">
  <strong>An intelligent, AI-powered personal fitness ecosystem that adapts to every user's unique biology, goals, and lifestyle.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-gold?style=for-the-badge" />
  <img src="https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Web-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/license-ISC-green?style=for-the-badge" />
  <img src="https://img.shields.io/badge/AI-Groq%20Llama%203.3--70B-orange?style=for-the-badge" />
  <img src="https://img.shields.io/badge/frontend-React%20Native%20%7C%20Expo-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/backend-Node.js%20%7C%20Express-339933?style=for-the-badge&logo=nodedotjs" />
  <img src="https://img.shields.io/badge/database-PostgreSQL%20%7C%20Prisma-4169E1?style=for-the-badge&logo=postgresql" />
  <img src="https://img.shields.io/badge/realtime-Socket.IO-010101?style=for-the-badge&logo=socket.io" />
  <img src="https://img.shields.io/badge/lang-TypeScript-3178C6?style=for-the-badge&logo=typescript" />
</p>

---

## 📖 Table of Contents

- [Project Overview](#-project-overview)
- [Key Features](#-key-features)
- [Project Statistics](#-project-statistics)
- [Tech Stack](#-complete-tech-stack)
- [Architecture](#-software-architecture)
- [Folder Structure](#-folder-structure)
- [Database Schema](#-database-documentation)
- [API Documentation](#-api-documentation)
- [AI Module](#-ai-module)
- [Frontend Documentation](#-frontend-documentation)
- [Backend Documentation](#-backend-documentation)
- [Installation Guide](#-installation-guide)
- [Environment Variables](#-environment-variables)
- [Scripts](#-scripts)
- [Security](#-security)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [Roadmap](#-roadmap)
- [License](#-license)
- [Acknowledgements](#-acknowledgements)

---

## 🎯 Project Overview

### Vision
To create the world's most intelligent, empathetic, and effective AI personal fitness coach — one that understands you as well as a human trainer but operates 24/7 with data-driven precision.

### Mission
FitAI X transforms fitness tracking from a passive logbook into an active coaching relationship. Every workout, meal, sleep session, and recovery metric feeds into a unified AI engine (Rachel) that learns, adapts, and guides users toward their goals with explainable, personalized recommendations.

### Problem Statement
Traditional fitness apps are **dumb databases** — they log what you did but never tell you *why* or *what to do next*. Users juggle multiple apps for workouts, nutrition, recovery, and progress tracking, with zero integration between them. Human personal trainers are expensive, unavailable 24/7, and cannot process thousands of data points per day.

### Solution
FitAI X is a **unified AI-powered fitness operating system** that:

- 🏋️ Generates **personalized workout plans** using AI
- 🍽️ Creates **meal plans** respecting dietary preferences (Vegetarian, Vegan, Keto, etc.)
- ❤️ Tracks **recovery** with real-time readiness scoring
- 📊 Provides **AI analytics** with natural language insights
- ⚡ Awards **XP and levels** gamifying your fitness journey
- 🤖 Features **Rachel** — an AI coach that knows *everything* about you

### Key Highlights

| Feature | Description |
|---------|-------------|
| **AI Workout Builder** | Generates workouts from your profile, goals, equipment, and recovery state |
| **AI Meal Planner** | Creates Indian cuisine meal plans respecting 9 diet types |
| **XP & Level System** | RPG-style progression with 8 tiers (Iron → Legend) |
| **Recovery Intelligence** | Multi-axis readiness scoring with radar visualization |
| **Real-time Dashboard** | Live vitals, ECG waveform, activity rings, and social feed |
| **Rachel AI Coach** | Context-aware conversational AI with full user history |
| **Smart Calendar** | AI-scheduled workouts adapting to your recovery |
| **Injury Predictor** | AI-powered injury risk detection from workout patterns |
| **Streak Engine** | Intelligent streak tracking with XP bonuses |
| **Cross-Platform** | iOS, Android, and Web via React Native + Expo |

---

## ✨ Key Features

### 🏋️ Workout Tracker
- **Manual workout creation** — Add, edit, reorder, delete exercises with sets/reps/weight/rest
- **AI workout generation** — Uses age, gender, weight, height, BMI, experience, history, injuries, equipment, recovery, diet, sleep, water intake, and more
- **One-exercise-at-a-time execution** with progress tracking
- **Auto-chain** completion → XP → streak → recovery update
- **Version control** — Every workout maintains a version history

### 🍽️ Nutrition & Meal Planner
- **AI meal generation** for all 9 diet types
- **Indian cuisine focused** with locally available ingredients
- **Time-aware display** — hides past meals automatically
- **Per-meal actions** — Log, Regenerate, Swap
- **Weekly plan** with 7-day overview
- **Smart grocery lists** from meal plans
- **Water intake** tracking with visual glass segments
- **Macro tracking** with progress bars and goals

### ❤️ Recovery & Health
- **Recovery Score** — Multi-factor readiness calculation
- **4-tab layout**: Today, Sleep, Body, Trends
- **Sleep tracking** with hypnogram visualization
- **Heart rate monitoring** with live BPM
- **Stress tracking** with trend analysis
- **Hydration tracking**
- **Muscle fatigue map** — BodyMap SVG with per-muscle readiness
- **Recovery protocol** — Actionable AI recommendations
- **Forecast curve** — Predictive recovery timeline

### 📊 Analytics & Progress
- **Fitness Score** — Composite score from consistency, recovery, and streak
- **Activity Rings** — Move, Water, Train goals with visual rings
- **Training analytics** — Workouts completed, missed, completion percentage
- **Calorie tracking** — Total, average, and chart breakdown
- **Body & Strength** — Weight trends, strength radar (Bench, Squat, Deadlift, etc.)
- **Weekly load** — 7-day training volume bars
- **AI Insights** — Expandable coach summary with suggestions
- **Nutrition overview** — Daily macro breakdown

### 🎮 XP & Gamification
| Level | Tier | XP Required |
|-------|------|-------------|
| 1-2 | 🥉 Iron | 500 |
| 3-4 | 🥈 Bronze | 1000 |
| 5-6 | 🥇 Silver | 1500 |
| 7-8 | 💎 Gold | 2000 |
| 9-10 | 🔥 Platinum | 2500 |
| 11-12 | 👑 Diamond | 3000 |
| 13-14 | ⭐ Elite | 3500 |
| 15+ | 🌟 Legend | 4000+ |

**XP is earned through:**
- Completing workouts (+50 XP)
- Maintaining streaks (+25 XP per consecutive day)
- Logging meals (+10 XP)
- Drinking water (+5 XP)
- Hitting protein goals (+20 XP)
- Personal records (+100 XP)
- Completing goals (+200 XP)

### 🤖 Rachel AI Coach
Rachel is the central AI assistant with **complete context** about the user:

- Workout plans and history
- Exercise completion and skipped sessions
- Recovery metrics, sleep, and nutrition
- Body weight, goals, and progress
- XP, streak, and achievements
- Calendar events and previous conversations
- Injury history and strength progression
- Current meal plans and food logs
- Recovery scores and analytics

---

## 📊 Project Statistics

| Metric | Count |
|--------|-------|
| **📁 Total Files** | 383 |
| **📂 Total Folders** | 125 |
| **🖥️ Backend Source Files** | 49 |
| **📱 Frontend Source Files** | 43 |
| **🖼️ Screens** | 13 |
| **🧩 Components** | 8 |
| **📡 API Routes** | 74 |
| **🗄️ Database Tables** | 22 |
| **🔧 Backend Services** | 24 |
| **📦 Frontend Dependencies** | 34 |
| **📦 Backend Dependencies** | 26 |
| **📝 Lines of Code** | ~21,300 |
| **🌐 API Files** | 13 |
| **🤖 AI Services** | 1 (Groq Llama 3.3-70B) |
| **🔄 Real-time events** | Socket.IO |

---

## 🛠️ Complete Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| [React Native](https://reactnative.dev/) 0.81 | Cross-platform mobile framework |
| [Expo](https://expo.dev/) SDK 54 | Development platform and build toolchain |
| [TypeScript](https://www.typescriptlang.org/) 5.9 | Type-safe JavaScript |
| [React Navigation](https://reactnavigation.org/) | Screen routing and navigation |
| [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) 4.1 | High-performance animations |
| [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/) 2.28 | Gesture-driven interactions |
| [TanStack React Query](https://tanstack.com/query) 5.101 | Server state management |
| [TanStack Query Persist Client](https://tanstack.com/query) | Offline-first persistence |
| [Axios](https://axios-http.com/) 1.18 | HTTP client |
| [Socket.IO Client](https://socket.io/) 4.8 | Real-time communication |
| [Expo Linear Gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/) | Gradient backgrounds |
| [Expo Blur](https://docs.expo.dev/versions/latest/sdk/blur/) | Glassmorphism effects |
| [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) | Haptic feedback |
| [React Native SVG](https://github.com/software-mansion/react-native-svg) 15.12 | Custom vector graphics |
| [React Native Safe Area Context](https://docs.swmansion.com/react-native-safe-area-context/) 5.6 | Safe area handling |
| [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) | Header font |
| [Inter](https://fonts.google.com/specimen/Inter) | Body font |

### Backend

| Technology | Purpose |
|------------|---------|
| [Node.js](https://nodejs.org/) | JavaScript runtime |
| [Express](https://expressjs.com/) 5.2 | HTTP server framework |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe server code |
| [Prisma](https://www.prisma.io/) 5.22 | ORM and database toolkit |
| [PostgreSQL](https://www.postgresql.org/) 15 | Primary database |
| [Redis](https://redis.io/) 7 | Queue and caching |
| [Socket.IO](https://socket.io/) 4.8 | WebSocket real-time |
| [BullMQ](https://bullmq.io/) 5.81 | Background job queue |
| [Zod](https://zod.dev/) 4.4 | Schema validation |
| [Node Cron](https://www.npmjs.com/package/node-cron) 4.6 | Scheduled jobs |
| [Multer](https://www.npmjs.com/package/multer) 2.2 | File uploads |

### AI & Machine Learning

| Technology | Purpose |
|------------|---------|
| [Groq](https://groq.com/) | AI inference provider |
| [Llama 3.3-70B Versatile](https://groq.com/) | Base LLM model |
| [Vercel AI SDK](https://sdk.vercel.ai/docs) 7.0 | AI integration framework |
| [@ai-sdk/groq](https://www.npmjs.com/package/@ai-sdk/groq) | Groq provider for Vercel AI |
| [@ai-sdk/google](https://www.npmjs.com/package/@ai-sdk/google) | Google Gemini fallback |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| [Docker](https://www.docker.com/) | Containerization |
| [Docker Compose](https://docs.docker.com/compose/) | Multi-container orchestration |
| [PostgreSQL 15 Alpine](https://hub.docker.com/_/postgres) | Database container |
| [Redis 7 Alpine](https://hub.docker.com/_/redis) | Cache container |

### Development Tools

| Technology | Purpose |
|------------|---------|
| [TypeScript](https://www.typescriptlang.org/) 5.9 | Language |
| [Jest](https://jestjs.io/) 29 | Testing |
| [Babel](https://babeljs.io/) 7.29 | JavaScript transpilation |
| [NativeWind](https://www.nativewind.dev/) 4.2 | Tailwind CSS for React Native |
| [Tailwind CSS](https://tailwindcss.com/) 3.3 | Utility CSS (for web) |

---

## 🏗️ Software Architecture

### Architecture Overview

FitAI X follows a **client-server architecture** with a **layered backend** and a **component-based frontend**. The system is designed as a unified fitness ecosystem where every module communicates through a shared data model.

```mermaid
graph TB
    subgraph "📱 Frontend (React Native/Expo)"
        SC[Screen Layer]
        CO[Component Layer]
        CT[Context Layer]
        API[API Service Layer]
        SC --> CO
        CO --> CT
        SC --> API
    end

    subgraph "🌐 Network"
        WS[WebSocket Socket.IO]
        HTTP[REST API HTTP]
    end

    subgraph "⚙️ Backend (Node.js/Express)"
        RT[Routes / Controllers]
        SV[Services]
        AI[AI Service]
        DB_O[Prisma ORM]
        Q[BullMQ Queue]
        RT --> SV
        SV --> AI
        SV --> DB_O
        Q --> SV
    end

    subgraph "🗄️ Data Layer"
        PG[(PostgreSQL)]
        RD[(Redis)]
    end

    subgraph "🤖 AI Layer"
        GROQ[Groq Llama 3.3-70B]
    end

    SC --> HTTP
    SC --> WS
    HTTP --> RT
    WS --> RT
    DB_O --> PG
    Q --> RD
    AI --> GROQ
```

### Frontend Architecture

```mermaid
graph LR
    subgraph "App Entry"
        APP[App.tsx]
        TC[ThemeContext]
        AC[AuthContext]
    end

    subgraph "Navigation"
        BN[BottomNavigation]
        TB[TopBar]
    end

    subgraph "Screen Layer"
        D[Dashboard]
        W[Workout]
        N[Nutrition]
        R[Recovery]
        A[Analytics]
        P[Profile]
        C[Coach]
        CL[Calendar]
        S[Settings]
    end

    subgraph "Data Layer"
        RQ[React Query]
        AS[AsyncStorage]
        API_S[API Services]
        SK[Socket Client]
    end

    APP --> TC
    APP --> AC
    APP --> BN
    APP --> TB
    APP --> D
    APP --> W
    APP --> N
    APP --> R
    APP --> A
    APP --> P
    APP --> C
    APP --> CL
    APP --> S
    D --> RQ
    W --> RQ
    N --> RQ
    R --> RQ
    A --> RQ
    P --> RQ
    C --> SK
    RQ --> AS
    RQ --> API_S
```

### Backend Architecture

```mermaid
graph TB
    subgraph "Entry"
        INDEX[index.ts]
        SOCK[Socket Setup]
    end

    subgraph "Route Layer"
        AUTH[Auth Routes]
        WORK[Workout Routes]
        NUTR[Nutrition Routes]
        REC[Recovery Routes]
        ANAL[Analytics Routes]
        DASH[Dashboard Routes]
        COACH[Coach Routes]
        PROF[Profile Routes]
        CAL[Calendar Routes]
        XP[XP Routes]
        COMP[Completion Route]
    end

    subgraph "Service Layer"
        AI_S[AI Service]
        XP_S[XP Service]
        REC_S[Recovery Service]
        ANAL_S[Analytics Service]
        WK_S[Workout Service]
        NUT_S[Nutrition Service]
        PRED[Injury Predictor]
    end

    subgraph "Jobs Layer"
        STRK[Streak Cron]
        AI_REC[AI Recommendations]
        PLAN[Plan Generator]
    end

    subgraph "Data"
        PRISMA[Prisma ORM]
        PG[(PostgreSQL)]
    end

    INDEX --> AUTH
    INDEX --> WORK
    INDEX --> NUTR
    INDEX --> REC
    INDEX --> ANAL
    INDEX --> DASH
    INDEX --> COACH
    INDEX --> PROF
    INDEX --> CAL
    INDEX --> XP
    INDEX --> COMP
    INDEX --> STRK
    INDEX --> AI_REC

    WORK --> XP_S
    WORK --> COMP
    COMP --> XP_S
    NUTR --> AI_S
    COACH --> AI_S
    REC --> AI_S
    ANAL --> AI_S
    PROF --> PRISMA

    WORK --> PRISMA
    NUTR --> PRISMA
    REC --> PRISMA
    ANAL --> PRISMA
    DASH --> PRISMA
    CAL --> PRISMA

    PRISMA --> PG
```

### User Flow — Registration to First Workout

```mermaid
flowchart TD
    START([App Launch]) --> SPLASH{Splash Screen}
    SPLASH --> AUTH{Auth?}
    AUTH -->|No| SIGNUP[Sign Up]
    AUTH -->|Yes| LOGIN[Login]
    SIGNUP --> ONBOARD[7-Step Onboarding]
    ONBOARD --> DASH{Profile Setup}
    DASH --> GOALS[Set Goals]
    DASH --> DIET[Set Diet Preference]
    DASH --> BODY[Body Metrics]
    DASH --> CALC[AI Calculates Targets]
    CALC --> HOME([Dashboard])
    LOGIN --> HOME
    HOME --> WORK[AI Generates Workout]
    HOME --> MEALS[AI Generates Meal Plan]
    MEALS --> NUTRITION[View Nutrition]
    WORK --> EXECUTE[Execute Workout]
    EXECUTE --> XP[Earn XP + Streak]
    XP --> RECOVERY[Recovery Updates]
    RECOVERY --> HOME
```

### Data Flow — Workout Completion Chain

```mermaid
flowchart LR
    COMPLETE([Workout Complete]) --> SESSION[Mark Session Done]
    SESSION --> CALC_CAL[Calculate Calories]
    CALC_CAL --> AWARD_XP[Award +50 XP]
    AWARD_XP --> STREAK[Update Streak]
    STREAK --> STREAK_XP{Streak > 1?}
    STREAK_XP -->|Yes| BONUS_XP[Award +25 Streak XP]
    STREAK_XP -->|No| SKIP
    BONUS_XP --> SKIP
    SKIP --> RECOV[R: Reduce Recovery Score]
    RECOV --> FEED[Post to Social Feed]
    FEED --> NOTIFY[Emit Socket Event]
    NOTIFY --> UI([Dashboard Updates in Real-time])
```

---

## 📁 Folder Structure

```
FitAI-X/
├── 📄 README.md                          # This documentation
├── 📄 package.json                       # Monorepo workspace config
├── 📄 .gitignore                         # Git ignore rules
├── 🐳 backend/
│   ├── 📄 docker-compose.yml             # PostgreSQL + Redis containers
│   ├── 📄 init.sql                       # SQL initialization
│   └── 📁 core-api/                      # Node.js backend
│       ├── 📄 .env                       # Environment variables
│       ├── 📄 tsconfig.json              # TypeScript configuration
│       ├── 📄 package.json               # Backend dependencies
│       ├── 📁 prisma/
│       │   ├── 📄 schema.prisma          # Database schema (22 models)
│       │   └── 📄 seed.ts                # Seed data script
│       └── 📁 src/
│           ├── 📄 index.ts               # Server entry point
│           ├── 📄 db.ts                  # Prisma client instance
│           ├── 📁 core/
│           │   ├── 📄 events.ts          # Event-driven architecture
│           │   └── 📄 listeners.ts       # Event listeners
│           ├── 📁 services/
│           │   ├── 📁 01-adaptive-planning-engine/  # Workout routes + logic
│           │   ├── 📁 02-workout-version-control/   # Version management
│           │   ├── 📁 03-ai-decision-explanation/    # Coach + Transcribe routes
│           │   ├── 📁 04-dynamic-goal-engine/        # Goal adaptation
│           │   ├── 📁 05-ai-memory-timeline/         # Memory events
│           │   ├── 📁 08-workout-conflict-detection/ # Schedule conflict resolution
│           │   ├── 📁 09-ai-exercise-graph/          # Exercise graph
│           │   ├── 📁 09-analytics/                  # Analytics routes
│           │   ├── 📁 10-progressive-overload-engine/ # Overload progression
│           │   ├── 📁 10-recovery/                   # Recovery routes
│           │   ├── 📁 12-workout-simulator/           # Simulation engine
│           │   ├── 📁 13-scenario-planner/            # Budget + scenario planning
│           │   ├── 📁 14-meal-planner-budget/         # Nutrition/meal plan routes
│           │   ├── 📁 15-ai-grocery-generator/        # Grocery graph
│           │   ├── 📁 16-streak-protection/           # Streak engine
│           │   ├── 📁 17-smart-calendar/              # Calendar routes
│           │   ├── 📁 18-ai-injury-predictor/         # Injury prediction
│           │   ├── 📁 ai/                             # AI service (Groq/Gemini)
│           │   ├── 📁 analytics/                      # Dashboard routes (feed, vitals)
│           │   ├── 📁 authentication/                 # Auth routes (signup, login)
│           │   ├── 📁 notifications/                  # Notification routes
│           │   ├── 📁 users/                          # Profile, onboarding, documents
│           │   ├── 📁 xp/                             # XP engine + routes
│           │   └── 📄 workout-completion.ts           # Completion chain
│           ├── 📁 jobs/                               # BullMQ workers + cron
│           └── 📁 realtime/                           # Socket.IO setup
│
├── 📱 frontend/
│   └── 📁 mobile/                        # React Native + Expo app
│       ├── 📄 App.tsx                    # Root app with routing
│       ├── 📄 app.json                   # Expo configuration
│       ├── 📄 tsconfig.json              # TypeScript configuration
│       ├── 📄 package.json               # Frontend dependencies
│       ├── 📄 metro.config.js            # Metro bundler config
│       ├── 📄 babel.config.js            # Babel configuration
│       ├── 📄 tailwind.config.js         # Tailwind CSS config
│       ├── 📄 global.css                 # Global styles
│       ├── 📁 assets/                    # Images, icons, fonts
│       ├── 📁 src/
│       │   ├── 📄 theme.ts              # Dark/Light theme colors + fonts
│       │   ├── 📁 screens/              # 13 screen components
│       │   │   ├── 📄 DashboardScreen.tsx
│       │   │   ├── 📄 WorkoutScreen.tsx
│       │   │   ├── 📄 NutritionScreen.tsx
│       │   │   ├── 📄 RecoveryScreen.tsx
│       │   │   ├── 📄 AnalyticsScreen.tsx
│       │   │   ├── 📄 ProfileScreen.tsx
│       │   │   ├── 📄 CoachScreen.tsx
│       │   │   ├── 📄 CalendarScreen.tsx
│       │   │   ├── 📄 SettingsScreen.tsx
│       │   │   ├── 📄 AuthScreen.tsx
│       │   │   ├── 📄 OnboardingScreen.tsx
│       │   │   ├── 📄 SplashScreen.tsx
│       │   │   └── 📄 NotificationsScreen.tsx
│       │   ├── 📁 components/           # Reusable components
│       │   │   ├── 📄 BottomNavigation.tsx
│       │   │   ├── 📄 TopBar.tsx
│       │   │   ├── 📄 AnimatedPressable.tsx
│       │   │   ├── 📄 ExerciseCard.tsx
│       │   │   ├── 📄 MeshGradientBackground.tsx
│       │   │   ├── 📄 XpNotification.tsx
│       │   │   ├── 📄 XpStatsCard.tsx
│       │   │   └── 📁 charts/           # Chart components
│       │   │       ├── 📄 ActivityRings.tsx
│       │   │       ├── 📄 BarChart.tsx
│       │   │       ├── 📄 SplineChart.tsx
│       │   │       ├── 📄 RadarChart.tsx
│       │   │       └── 📄 LiveWaveform.tsx
│       │   ├── 📁 context/              # React contexts
│       │   │   ├── 📄 ThemeContext.tsx
│       │   │   └── 📄 AuthContext.tsx
│       │   ├── 📁 services/
│       │   │   ├── 📁 api/              # API client services (13 files)
│       │   │   │   ├── 📄 client.ts     # Axios instance + interceptors
│       │   │   │   ├── 📄 dashboard.ts
│       │   │   │   ├── 📄 workout.ts
│       │   │   │   ├── 📄 nutrition.ts
│       │   │   │   ├── 📄 recovery.ts
│       │   │   │   ├── 📄 analytics.ts
│       │   │   │   ├── 📄 profile.ts
│       │   │   │   ├── 📄 coach.ts
│       │   │   │   ├── 📄 calendar.ts
│       │   │   │   ├── 📄 xp.ts
│       │   │   │   ├── 📄 notifications.ts
│       │   │   │   ├── 📄 onboarding.ts
│       │   │   │   └── 📄 transcribe.ts
│       │   │   └── 📁 socket/
│       │   │       └── 📄 socketClient.ts
│       │   └── 📁 screens/              # Screen components
│       └── 📁 .expo/                    # Expo local config
│
└── 📁 packages/
    └── 📁 shared-types/                 # Shared TypeScript types
        ├── 📄 package.json
        └── 📄 index.ts
```

---

## 🗄️ Database Documentation

### Entity-Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Workout : has
    User ||--o{ Meal : logs
    User ||--o{ WorkoutSession : completes
    User ||--o{ FoodLog : tracks
    User ||--o{ CoachMessage : sends
    User ||--o{ FeedItem : creates
    User ||--o{ CalendarEvent : schedules
    User ||--o{ RecoveryFlag : has
    User ||--o{ Vitals : has
    User ||--o{ NutritionPreference : has
    User ||--o{ WaterLog : logs
    User ||--o{ GroceryList : creates
    User ||--o{ MemoryEvent : stores
    User ||--o{ AiRecommendation : receives
    User ||--o{ WorkoutPR : achieves
    Vitals ||--o{ WaterLog : tracks
    Workout ||--o{ Exercise : contains
    WorkoutSession ||--o{ WorkoutSessionExercise : includes
    WorkoutSessionExercise ||--o{ WorkoutSessionSet : has
    Meal ||--o{ MealVersion : versions
    GroceryList ||--o{ GroceryItem : contains
```

### Tables

<details>
<summary><strong>User</strong> — Core user profile</summary>

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `email` | String (unique) | User email for login |
| `password` | String | Hashed password |
| `name` | String | Display name |
| `avatar` | String? | Profile picture URL |
| `age` | Int? | Age in years |
| `weight` | Float? | Weight in kg |
| `height` | Float? | Height in cm |
| `gender` | String? | Male/Female/Other |
| `goal` | String? | Fitness goal (muscle_gain, fat_loss, etc.) |
| `diet` | String? | Diet preference |
| `experience` | String? | Beginner/Intermediate/Advanced |
| `allergies` | String? | Food allergies |
| `currentStreak` | Int | Current workout streak |
| `longestStreak` | Int | Best streak ever |
| `xpTotal` | Int | Total XP accumulated |
| `xpLastEarned` | Int | XP earned today |
</details>

<details>
<summary><strong>Vitals</strong> — Real-time health metrics</summary>

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `userId` | UUID (FK) | References User |
| `bpm` | Int | Heart rate |
| `hrv` | Float? | Heart rate variability |
| `recoveryUpr` | Float | Upper body recovery (0-1) |
| `recoveryLwr` | Float | Lower body recovery (0-1) |
| `recoveryCor` | Float | Core recovery (0-1) |
| `recoveryCrd` | Float | Cardio recovery (0-1) |
| `bodyBattery` | Float | Energy level (0-1) |
| `moveProgress` | Float | Move ring progress |
| `waterProgress` | Float | Water ring progress |
| `trainProgress` | Float | Training ring progress |
| `loadM` through `loadSu` | Float | Daily training load (7 days) |
</details>

<details>
<summary><strong>Workout</strong> — Workout templates</summary>

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `userId` | UUID (FK) | References User |
| `title` | String | Workout name |
| `duration` | String | Expected duration |
| `description` | String? | Description |
| `goal` | String? | Workout goal |
| `difficulty` | String? | Easy/Medium/Hard |
| `aiExplanation` | String? | Why this workout was generated |
| `isCurrent` | Boolean | Currently active template |
| `versionNumber` | Int | Version tracking |
</details>

<details>
<summary><strong>WorkoutSession</strong> — Completed/In-progress sessions</summary>

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `userId` | UUID (FK) | References User |
| `workoutId` | UUID? | References Workout |
| `title` | String | Session name |
| `startTime` | DateTime | When started |
| `endTime` | DateTime? | When completed |
| `duration` | Int? | Minutes |
| `caloriesBurned` | Int? | Estimated calories |
| `status` | String | COMPLETED/IN_PROGRESS |
</details>

<details>
<summary><strong>Meal</strong> — Generated and logged meals</summary>

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `userId` | UUID (FK) | References User |
| `type` | String | Breakfast/Lunch/Dinner/Snack |
| `name` | String | Meal name |
| `date` | DateTime? | Planned date |
| `cals` | Int | Calories |
| `protein` | Float? | Protein (g) |
| `carbs` | Float? | Carbs (g) |
| `fats` | Float? | Fat (g) |
| `ingredients` | String? | JSON array of ingredients |
| `preparation` | String? | Cooking instructions |
| `servingSize` | String? | Portion size |
| `prepTime` | Int? | Minutes to prepare |
</details>

---

## 📡 API Documentation

### Authentication

<details>
<summary><code>POST /api/v1/auth/signup</code> — Register new user</summary>

**Purpose:** Create a new user account
**Auth:** None
**Headers:** `Content-Type: application/json`

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "user": { "id": "uuid", "name": "John Doe", "email": "user@example.com" },
  "token": "jwt_token_here"
}
```
</details>

<details>
<summary><code>POST /api/v1/auth/login</code> — Authenticate user</summary>

**Purpose:** Login and receive JWT token
**Auth:** None

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "user": { "id": "uuid", "name": "John Doe", "email": "user@example.com" },
  "token": "jwt_token_here"
}
```
</details>

### Dashboard

<details>
<summary><code>GET /api/v1/dashboard/feed</code> — Social feed</summary>

**Purpose:** Fetch latest social activity feed
**Auth:** None required

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "type": "workout",
    "user": "John Doe",
    "avatar": "https://...",
    "msg": "Completed 'Chest Day' workout",
    "time": "Just now"
  }
]
```
</details>

<details>
<summary><code>GET /api/v1/dashboard/vitals</code> — Real-time vitals</summary>

**Purpose:** Fetch current health vitals
**Auth:** None required
**Refetch:** Every 5 seconds on frontend

**Response:** `200 OK`
```json
{
  "bpm": 72,
  "restingBpm": 58,
  "hrv": 65,
  "bodyBattery": 85,
  "recoveryUpper": 0.8,
  "recoveryLower": 0.6,
  "recoveryCore": 0.7,
  "recoveryCardio": 0.9,
  "moveProgress": 0.8,
  "waterProgress": 0.6,
  "trainProgress": 0.4,
  "loadM": 0.2,
  "loadT": 0.8
}
```
</details>

<details>
<summary><code>GET /api/v1/dashboard/active-users</code> — Active training users</summary>

**Purpose:** Fetch users currently training
**Auth:** None

**Response:** `200 OK`
```json
[
  { "id": "uuid", "name": "Alice", "img": "https://...", "isLive": true }
]
```
</details>

### Workouts

<details>
<summary><code>GET /api/v1/workouts</code> — List workouts</summary>

**Query:** `?userId=uuid`
**Response:** Array of workout templates with exercises
</details>

<details>
<summary><code>GET /api/v1/workouts/current</code> — Current workout</summary>

**Query:** `?userId=uuid`
**Response:** Current active workout template or null
</details>

<details>
<summary><code>POST /api/v1/workouts/generate</code> — AI generate workout</summary>

**Body:**
```json
{
  "userId": "uuid",
  "prompt": "Full body strength workout"
}
```

**Response:** AI-generated workout with exercises and explanation
</details>

<details>
<summary><code>POST /api/v1/workouts</code> — Save workout</summary>

**Body:** Full workout with exercises array
**Response:** Saved workout with version control
</details>

<details>
<summary><code>POST /api/v1/workouts/session/start</code> — Start session</summary>

**Body:** `{ userId, workoutId, title, exercises }`
**Response:** New session with IN_PROGRESS status
</details>

<details>
<summary><code>POST /api/v1/workouts/session/complete</code> — Complete session</summary>

**Body:** `{ sessionId, duration, caloriesBurned, notes, completedSetIds }`
**Response:** Session marked COMPLETED + XP + streak + recovery auto-update
</details>

<details>
<summary><code>GET /api/v1/workouts/history</code> — Workout history</summary>

**Query:** `?userId=uuid`
**Response:** Array of completed workout sessions
</details>

<details>
<summary><code>POST /api/v1/workouts/manual</code> — Manual workout</summary>

**Body:** `{ userId, title, duration, exercises[] }`
**Response:** Saved manually created workout
</details>

<details>
<summary><code>PATCH /api/v1/workouts/:id/exercises/:exId/status</code> — Update exercise status</summary>

**Body:** `{ status: "done" | "skipped" }`
**Response:** Updated exercise + allCompleted flag
</details>

<details>
<summary><code>PATCH /api/v1/workouts/:id/exercises/:exId</code> — Edit exercise</summary>

**Body:** `{ name, sets, reps, weight, restTime, notes, muscleGroup }`
**Response:** Updated exercise
</details>

<details>
<summary><code>POST /api/v1/workouts/complete</code> — Full completion chain</summary>

**Body:** `{ sessionId, userId }`
**Response:** Session + XP awarded + streak + recovery updated + feed posted + socket event

> 💡 This triggers the **entire completion chain**: mark complete → calculate calories → award XP → update streak → reduce recovery → post to feed → emit socket event
</details>

<details>
<summary><code>GET /api/v1/workouts/stats</code> — User stats</summary>

**Query:** `?userId=uuid`
**Response:** XP stats, level, streak, workout counts
</details>

### Nutrition

<details>
<summary><code>GET /api/v1/nutrition</code> — Get meals</summary>

**Query:** `?userId=uuid`
**Response:** All meals with current versions
</details>

<details>
<summary><code>GET /api/v1/nutrition/dashboard</code> — Nutrition dashboard</summary>

**Query:** `?userId=uuid`
**Response:** Today's macros, calories, water progress
</details>

<details>
<summary><code>GET /api/v1/nutrition/meal-plan</code> — AI meal plan</summary>

**Query:** `?userId=uuid`
**Response:** 7-day meal plan (today + 6 days) with time-aware filtering
</details>

<details>
<summary><code>POST /api/v1/nutrition/regenerate-plan</code> — Regenerate meal day</summary>

**Body:** `{ userId, day: "today" | "tomorrow" | "all" }`
**Response:** New meals for specified days with diet-aware fallbacks
</details>

<details>
<summary><code>POST /api/v1/nutrition/generate-plan</code> — AI generate plan</summary>

**Body:** `{ userId }`
**Response:** AI-generated meal plan saved to database
</details>

<details>
<summary><code>POST /api/v1/nutrition/regenerate</code> — Regenerate single meal</summary>

**Body:** `{ mealId }`
**Response:** New version of meal with AI alternative (fallback if AI fails)
</details>

<details>
<summary><code>POST /api/v1/nutrition/log-food</code> — Log food manually</summary>

**Body:** `{ userId, name, cals, protein, carbs, fats }`
**Response:** Saved food log entry
</details>

<details>
<summary><code>POST /api/v1/nutrition/water</code> — Log water</summary>

**Body:** `{ userId, amountMl }`
**Response:** Updated water progress
</details>

<details>
<summary><code>GET /api/v1/nutrition/budget-plan</code> — Budget plan</summary>

**Query:** `?budget=75&cals=2500&diet=vegetarian`
**Response:** 7-day meal plan with grocery list within budget
</details>

<details>
<summary><code>GET /api/v1/nutrition/grocery</code> — Grocery lists</summary>

**Query:** `?userId=uuid`
**Response:** User's grocery lists with items
</details>

<details>
<summary><code>POST /api/v1/nutrition/preferences</code> — Save preferences</summary>

**Body:** `{ userId, dietType, allergies, dislikedFoods, budget }`
**Response:** Saved nutrition preferences
</details>

### Analytics

<details>
<summary><code>GET /api/v1/analytics/overview</code> — User overview</summary>

**Headers:** `x-user-id: uuid`
**Response:** Name, goal, weight, height, total workouts, AI messages
</details>

<details>
<summary><code>GET /api/v1/analytics/fitness-score</code> — Composite score</summary>

**Headers:** `x-user-id: uuid`
**Response:** Score (0-100), consistency score, recovery score, streak score, motivation
</details>

<details>
<summary><code>GET /api/v1/analytics/workouts</code> — Workout analytics</summary>

**Query:** `period=7d|30d|90d|1y`
**Headers:** `x-user-id: uuid`
**Response:** Total, completed, missed, completion %, chart data, recent workouts
</details>

<details>
<summary><code>GET /api/v1/analytics/calories</code> — Calorie analytics</summary>

**Query:** `period=7d|30d|90d|1y`
**Headers:** `x-user-id: uuid`
**Response:** Total calories, daily avg, chart data
</details>

<details>
<summary><code>GET /api/v1/analytics/weight</code> — Weight trends</summary>

**Headers:** `x-user-id: uuid`
**Response:** Current weight, change, 7-day trend
</details>

<details>
<summary><code>GET /api/v1/analytics/strength</code> — Strength metrics</summary>

**Headers:** `x-user-id: uuid`
**Response:** Bench, Squat, Deadlift, Pull-ups, OHP + radar chart data
</details>

<details>
<summary><code>GET /api/v1/analytics/streak</code> — Streak data</summary>

**Headers:** `x-user-id: uuid`
**Response:** Current streak, longest streak, total workouts
</details>

<details>
<summary><code>GET /api/v1/analytics/summary</code> — AI summary</summary>

**Headers:** `x-user-id: uuid`
**Response:** AI-generated progress text, suggestions, undertrained muscles
</details>

### Recovery

<details>
<summary><code>GET /api/v1/recovery/overview</code> — Recovery status</summary>

**Headers:** `x-user-id: uuid`
**Response:** `recoveryStatus`, `description`
</details>

<details>
<summary><code>GET /api/v1/recovery/score</code> — Recovery score</summary>

**Headers:** `x-user-id: uuid`
**Response:** Score, status, delta, headline, summary, contributors (sleep, heart, stress, water)
</details>

<details>
<summary><code>GET /api/v1/recovery/sleep</code> — Sleep data</summary>

**Headers:** `x-user-id: uuid`
**Response:** Total minutes, quality, stages, hypnogram, consistency
</details>

<details>
<summary><code>GET /api/v1/recovery/heart-rate</code> — Heart rate</summary>

**Headers:** `x-user-id: uuid`
**Response:** Current BPM, resting BPM, HRV, respiratory rate
</details>

<details>
<summary><code>GET /api/v1/recovery/water</code> — Hydration</summary>

**Headers:** `x-user-id: uuid`
**Response:** Current intake, daily goal, progress, trend
</details>

<details>
<summary><code>GET /api/v1/recovery/stress</code> — Stress</summary>

**Headers:** `x-user-id: uuid`
**Response:** Score, status, trend
</details>

<details>
<summary><code>GET /api/v1/recovery/timeline</code> — Forecast</summary>

**Headers:** `x-user-id: uuid`
**Response:** Today, tomorrow, next 2 days
</details>

<details>
<summary><code>GET /api/v1/recovery/ai-insights</code> — AI recovery advice</summary>

**Headers:** `x-user-id: uuid`
**Response:** AI-generated recovery headline, details, protocol
</details>

### Coach (Rachel AI)

<details>
<summary><code>GET /api/v1/coach/messages</code> — Chat history</summary>

**Headers:** `x-user-id: uuid`
**Response:** Last 50 coach messages
</details>

<details>
<summary><code>POST /api/v1/coach/messages</code> — Send message to Rachel</summary>

**Headers:** `x-user-id: uuid`
**Body:** `{ text: "What workout should I do today?" }`
**Response:** Streams AI response via Socket.IO with full user context
</details>

### Profile

<details>
<summary><code>GET /api/v1/profile</code> — Fetch profile</summary>

**Query:** `?userId=uuid`
**Response:** Identity, fitnessProfile, healthProfile, telemetry, aiPreferences, radarChart, injuryModel
</details>

<details>
<summary><code>PUT /api/v1/profile</code> — Update profile</summary>

**Body:** `{ userId, prefs: { ... }, goals: [...] }`
**Response:** `{ success: true }`
</details>

<details>
<summary><code>GET /api/v1/profile/export</code> — Export data</summary>

**Query:** `?userId=uuid`
**Response:** JSON export of user data + stats
</details>

### XP System

<details>
<summary><code>GET /api/v1/xp/stats</code> — User XP stats</summary>

**Query:** `?userId=uuid`
**Response:**
```json
{
  "totalXp": 1250,
  "level": 3,
  "tier": "Silver",
  "currentXp": 250,
  "nextLevelXp": 500,
  "todayXp": 50,
  "rankLabel": "Top 25%",
  "streak": 5,
  "longestStreak": 12,
  "weeklyWorkouts": 3,
  "totalWorkouts": 47,
  "xpProgressPct": 50
}
```
</details>

<details>
<summary><code>POST /api/v1/xp/award</code> — Award XP</summary>

**Body:** `{ userId, event: "workout_completed", reason: "Completed: Chest Day" }`
**Response:** XP awarded, new total, level, badge
</details>

### Calendar & More

<details>
<summary><code>GET /api/v1/calendar</code> — List events</summary>

**Query:** `?userId=uuid`
**Response:** Calendar events
</details>

<details>
<summary><code>POST /api/v1/calendar</code> — Create event</summary>

**Body:** `{ userId, dayIndex, title, type, intensity, description }`
**Response:** Created event
</details>

<details>
<summary><code>POST /api/v1/habits/check-streak/:userId</code> — Check streak</summary>

**Response:** Streak protection check result
</details>

<details>
<summary><code>GET /api/v1/injury-predictor/:userId</code> — Injury prediction</summary>

**Response:** AI-predicted injury risks per muscle group
</details>

<details>
<summary><code>POST /api/v1/onboarding/complete</code> — Complete onboarding</summary>

**Body:** User's onboarding responses
**Response:** Saved profile with calculated targets
</details>

---

## 🤖 AI Module

### Architecture

```mermaid
flowchart LR
    REQ[User Request] --> CTX[buildUserContext]
    CTX --> DB[Prisma: Fetch All User Data]
    DB --> AGG[Aggregate Context]
    
    subgraph "User Context Object"
        P[Profile]
        S[Stats & Streaks]
        V[Vitals & Recovery]
        W[Workout History]
        N[Nutrition Today]
        M[Meal Plans]
        C[Calendar]
        PR[Personal Records]
    end
    
    AGG --> P
    AGG --> S
    AGG --> V
    AGG --> W
    AGG --> N
    AGG --> M
    AGG --> C
    AGG --> PR
    
    P --> PROMPT[Build Prompt]
    S --> PROMPT
    V --> PROMPT
    W --> PROMPT
    N --> PROMPT
    M --> PROMPT
    C --> PROMPT
    PR --> PROMPT
    
    PROMPT --> AI[callAI Function]
    AI --> GROQ{Provider}
    GROQ -->|Groq| LLAMA[Llama 3.3-70B]
    
    LLAMA -->|Schema Mode| PARSE[JSON Parse]
    LLAMA -->|Text Mode| TEXT[Raw Text]
    
    PARSE --> VALIDATE[Validate with Zod]
    VALIDATE --> SAVE[Save to Database]
    TEXT --> STREAM[Stream via Socket.IO]
```

### AI Service Functions

| Function | Purpose | Used By |
|----------|---------|---------|
| `callAI()` | Core AI invocation with text/schema modes | All services |
| `buildUserContext()` | Aggregates complete user data for AI context | Coach, Nutrition, Recovery |
| `generateAndSaveMeals()` | Generates and persists AI meal plans | Meal Planner |
| `calculateTargets()` | Calculates personalized macro targets | Meal Planner |

### AI Prompt Engineering

Each feature uses a **specialized prompt template** that includes:

| Feature | What the prompt includes |
|---------|------------------------|
| **Workout Generation** | Age, gender, weight, height, goal, experience, injuries, equipment, recovery flags, workout history |
| **Meal Planning** | Age, gender, weight, height, goal, diet preference, allergies, dislikes, favorites, medical conditions, calorie/macro targets |
| **Recovery Insights** | Recovery score, body battery, resting HR, diet, workout history, injuries |
| **Coach Chat** | Complete user context (all of the above) + conversation history |

### Diet-Aware Meal Generation (9 Types)

| Diet | AI Instruction | Example Meals |
|------|---------------|---------------|
| 🥩 Non-Vegetarian | All foods allowed | Egg Bhurji, Chicken Curry, Grilled Fish |
| 🥚 Eggetarian | Eggs OK, no meat/fish | Veg Omelette, Paneer Masala, Egg Curry |
| 🥬 Vegetarian | No meat/eggs | Masala Dosa, Dal Rice, Paneer Bhurji |
| 🌱 Vegan | No animal products | Fruit Oatmeal, Chickpea Curry, Tofu Stir-fry |
| 🥑 Keto | Very low carb, high fat | Egg Avocado, Chicken Cauliflower Rice |
| 💪 High Protein | 30g+ protein/meal | Egg White Omelette, Chicken + Dal, Soya Chunks |
| 🥦 Low Carb | Reduced carbs | Paneer Capsicum, Tandoori Chicken, Fish Curry |
| 🥩 Paleo | No grains/legumes/dairy | Banana Pancakes, Grilled Chicken + Sweet Potato |
| 🫒 Mediterranean | Olive oil, fish, veg | Greek Yogurt, Chickpea Salad, Grilled Fish |

### AI Fallback Logic

When the AI provider is unavailable or times out, each feature has a **graceful fallback**:

- **Meal Planner**: Returns hardcoded Indian meals matching the user's diet preference
- **Workout Generation**: Returns a fallback full-body workout
- **Meal Regeneration**: Returns a random alternative from a list of Indian dishes
- **Coach Chat**: Returns an error message via Socket.IO stream

---

## 🎨 Frontend Documentation

### Theme System

The app features a **dark/light mode** with gold-accented glassmorphism design:

```typescript
// Dark Mode
{ bg: '#08080A', primary: '#F5C400'(gold), surface: 'rgba(22,22,22,0.65)' }

// Light Mode
{ bg: '#F4F3EF', primary: '#8A6400'(dark gold), surface: 'rgba(255,255,255,0.7)' }
```

**Typography:**
- **Headers:** Space Grotesk 700 Bold
- **Numbers:** Space Grotesk 700 Bold
- **Body:** Inter 400 Regular / 500 Medium / 700 Bold

### Screen Architecture

| Screen | Key Components | Data Sources |
|--------|---------------|--------------|
| **Dashboard** | ActivityRings, Waveform, Spline, RadarChart, Track | Feed, Vitals, XP, ActiveUsers |
| **Workout** | ExerciseCard, TabSwitcher, LiveSession | Workout APis |
| **Nutrition** | MealTimeline, AI Meal Plan, Hydration, Macros | Nutrition APIs, Budget Plan |
| **Recovery** | ActivityRings, ForecastCurve, BodyMap, Sparkline | Recovery APIs |
| **Analytics** | ActivityRings, RadarChart, BarChart, SplineChart | Analytics APIs |
| **Profile** | TiltCard, SpinningAvatarRing, RadarChart, BodyMapSVG | Profile API |
| **Coach** | Chat bubbles, Streaming text, Action cards | Socket.IO + Coach API |
| **Settings** | Toggle switches, Row items, Export button | Profile API + Auth Context |

### State Management

- **Server State:** TanStack React Query with AsyncStorage persister (24h cache)
- **Auth State:** React Context (AuthContext) with AsyncStorage
- **Theme State:** React Context (ThemeContext)
- **Local State:** React useState for UI state
- **Real-time:** Socket.IO for live feed updates

### Global Components

| Component | Purpose |
|-----------|---------|
| `TopBar` | Theme toggle, settings, search, notifications on every screen |
| `BottomNavigation` | 5-tab nav: Home → Workout → AI Coach → Nutrition → Profile |
| `MeshGradientBackground` | Animated background behind all screens |
| `AnimatedPressable` | Scale-animated touchable wrapper |
| `XpStatsCard` | Level, XP progress, streak display |
| `XpNotification` | Toast notification for XP earned |

### Chart Components

| Component | Props | Renders When |
|-----------|-------|-------------|
| `ActivityRings` | `size, rings[]` | Data available |
| `BarChart` | `data, height, color` | Data array non-empty |
| `SplineChart` | `data, width, height, color` | ≥2 data points |
| `RadarChart` | `size, data[], color` | ≥3 data points |
| `Waveform` | `width, height, color` | Always (ECG aesthetic) |

---

## ⚙️ Backend Documentation

### Service Architecture

```
src/index.ts ──── Entry point ──── app.use('/api/v1/*', routes)
     │
     ├── /analytics/dashboard.ts ── GET /feed, /active-users, /vitals
     ├── /authentication/auth.ts ── POST /signup, /login
     ├── /users/profile.ts ──────── GET/PUT /, GET /export
     ├── /users/onboarding.ts ───── POST /complete
     ├── /users/documents.ts ────── Document uploads
     ├── /01-adaptive-planning-engine/workouts.ts ── All workout CRUD
     ├── /09-analytics/analytics.ts ── Scores, workouts, calories, strength
     ├── /10-recovery/recovery.ts ──── Overview, score, sleep, HR, water, stress
     ├── /14-meal-planner-budget/ ──── Nutrition + MealPlan routes
     ├── /03-ai-decision-explanation/ ── Coach chat + Transcribe
     ├── /17-smart-calendar/calendar.ts ── Calendar CRUD
     ├── /16-streak-protection/ ──────── Streak check
     ├── /18-ai-injury-predictor/ ────── Injury risk
     ├── /notifications/ ─────────────── Notification CRUD
     ├── /xp/xpRoutes.ts ─────────────── XP stats + award
     └── /workout-completion.ts ──────── Completion chain
```

### Background Jobs (BullMQ + Node-Cron)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `checkDailyStreaks` | Daily at 00:00 | Reset/preserve streaks |
| `generateWeeklyRecommendations` | Monday 00:01 | AI recommendation generation |
| `startAiWorker` | On server start | Plans queue processor |

### Event-Driven Architecture

```typescript
AppEvents.emit(EVENTS.WORKOUT_COMPLETED, { userId, workoutId, sessionId });
```

Events use a pub/sub pattern to trigger downstream updates without coupling.

---

## 📦 Installation Guide

### Prerequisites

| Requirement | Version |
|-------------|---------|
| [Node.js](https://nodejs.org/) | ≥ 18 |
| [npm](https://www.npmjs.com/) | ≥ 9 |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest |
| [PostgreSQL](https://www.postgresql.org/) 15 | Docker or local |
| [Redis](https://redis.io/) 7 | Docker or local |
| [Expo CLI](https://docs.expo.dev/get-started/installation/) | Latest |
| [Git](https://git-scm.com/) | Latest |

### Quick Start (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/mritunjai-prog/FitAI-X.git
cd FitAI-X

# 2. Start databases with Docker
docker compose -f backend/docker-compose.yml up -d

# 3. Install backend dependencies
cd backend/core-api
npm install

# 4. Set up environment
cp .env.example .env  # Edit with your values

# 5. Push schema & seed
npx prisma db push
npx prisma db seed

# 6. Start backend
npx tsx src/index.ts

# 7. Open new terminal - install frontend
cd frontend/mobile
npm install

# 8. Start frontend (web)
npx expo start --web
```

### Manual Setup (Windows)

```powershell
# 1. Start Docker containers
cd D:\FitAI-X\backend
docker compose up -d

# 2. Backend setup
cd D:\FitAI-X\backend\core-api
npm install
npx prisma db push
npx tsx src\index.ts

# 3. Frontend setup (new terminal)
cd D:\FitAI-X\frontend\mobile
npm install
npx expo start --web
```

---

## 🔐 Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | `postgresql://fitaix_user:fitaix_password@127.0.0.1:5432/fitaix_db?schema=public` |
| `PORT` | ✅ | Backend server port | `4000` |
| `AI_PROVIDER` | ✅ | AI provider selection | `groq` or `google` |
| `AI_MODEL` | ✅ | AI model name | `llama-3.3-70b-versatile` |
| `GROQ_API_KEY` | ✅ | Groq API key for LLM access | `gsk_...` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | ❌ | Google AI fallback key | `AIza...` |

---

## 📜 Scripts

### Frontend (`frontend/mobile/`)

| Script | Command | Purpose |
|--------|---------|---------|
| **start** | `npm start` | Launch Expo dev server |
| **web** | `npm run web` | Launch web version |
| **android** | `npm run android` | Launch Android emulator |
| **ios** | `npm run ios` | Launch iOS simulator |
| **clear** | `npx expo start --clear` | Clear Metro cache and start |

### Backend (`backend/core-api/`)

| Command | Purpose |
|---------|---------|
| `npx tsx src/index.ts` | Start development server |
| `npx prisma db push` | Push schema to database |
| `npx prisma db seed` | Run seed script |
| `npx prisma studio` | Open Prisma Studio (GUI) |

---

## 🛡️ Security

### Authentication Flow

```
User → Login → JWT Token → AsyncStorage → x-user-id Header → API
```

- Passwords are hashed before storage
- JWT tokens are returned on login/signup
- User ID is passed via `x-user-id` header for user-specific data
- Auth state persisted in AsyncStorage for offline support

### API Security

- CORS enabled for all origins
- User-specific data requires userId query parameter or x-user-id header
- Zod validation on all API inputs
- File upload sanitization via Multer

---

## 🧪 Testing

### Test Files

Located in `backend/core-api/tests/`:
- `auth.test.ts` — Authentication flow tests
- `workout.test.ts` — Workout API tests
- `setup.ts` — Test environment setup

Run tests:
```bash
cd backend/core-api
npm test
```

---

## 🚀 Deployment

### Docker Deployment

```bash
# Build and run all services
docker compose -f backend/docker-compose.yml up --build -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Production Checklist

- [ ] Set strong `GROQ_API_KEY` in environment
- [ ] Update `DATABASE_URL` for production database
- [ ] Enable HTTPS behind reverse proxy
- [ ] Configure proper CORS origins
- [ ] Set up monitoring and logging
- [ ] Run database migrations
- [ ] Build frontend for production: `npx expo build`

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| **500 on bundle load** | Run `npx expo start --clear` to clear Metro cache |
| **Backend won't start** | Ensure PostgreSQL and Redis are running, check `.env` file, verify `export default router` exists in all route files |
| **"Cannot find module"** | Run `npm install` in the relevant directory |
| **Prisma connection error** | Check PostgreSQL credentials and port in `.env` |
| **AI not responding** | Check `GROQ_API_KEY` in `.env`, verify network connectivity |
| **Socket.IO disconnected** | Ensure backend is running on port 4000 |
| **White flash on screens** | Fix: Add `backgroundColor: C.bg` to root `Animated.View` in `App.tsx` |
| **Duplicate top bar** | Fix: Add `'Dashboard'` to `hideTopFor` array in `App.tsx` |

---

## 🤝 Contributing

### Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request to `testing` branch

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — New feature
- `fix:` — Bug fix
- `chore:` — Maintenance
- `docs:` — Documentation
- `refactor:` — Code restructuring
- `style:` — Formatting changes

### Branch Naming

- `feature/*` — New features
- `fix/*` — Bug fixes
- `chore/*` — Maintenance

---

## 🗺️ Roadmap

### ✅ Current Features
- ✅ AI Workout Generation & Tracking
- ✅ AI Meal Planning (9 diet types)
- ✅ XP & Level System (8 tiers)
- ✅ Recovery Intelligence
- ✅ Rachel AI Coach
- ✅ Dashboard with Live Vitals
- ✅ Dark/Light Theme
- ✅ Real-time Social Feed
- ✅ Smart Calendar
- ✅ Injury Prediction
- ✅ Streak Engine
- ✅ Workout History & Version Control
- ✅ Nutrition Macro Tracking
- ✅ Manual Workout Builder
- ✅ Water Intake Tracking
- ✅ 7-day Meal Plans

### 🔜 Upcoming Features
- 📱 Push Notifications
- 🏃 Apple Watch / Wear OS Integration
- 🎙️ Voice-based workout logging
- 👥 Social & Friends Features
- 🏆 Advanced Achievements
- 📈 Advanced Analytics Dashboard
- 🌍 Multi-language Support
- 🎵 Music Integration for Workouts
- 🧘 Meditation & Mindfulness Tracking

### 🔭 Future Vision
- **Computer Vision** — Exercise form correction via camera
- **Wearable Integration** — Direct sync with Apple Watch, Garmin, Fitbit
- **AI Meal Photo Recognition** — Log meals by taking a photo
- **Community Challenges** — Weekly/monthly fitness challenges
- **Personalized Supplement Recommendations**
- **Telehealth Integration** — Share data with healthcare providers

---

## 📄 License

This project is licensed under the **ISC License**.

```
ISC License

Copyright (c) 2025, FitAI X

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

---

## 👏 Acknowledgements

### Built With
- [React Native](https://reactnative.dev/) — Cross-platform mobile framework
- [Expo](https://expo.dev/) — Universal app platform
- [Express](https://expressjs.com/) — Node.js web framework
- [Prisma](https://www.prisma.io/) — Database ORM
- [PostgreSQL](https://www.postgresql.org/) — Relational database
- [Redis](https://redis.io/) — In-memory data store
- [Groq](https://groq.com/) — AI inference
- [Vercel AI SDK](https://sdk.vercel.ai/) — AI integration toolkit
- [Socket.IO](https://socket.io/) — Real-time engine
- [TanStack Query](https://tanstack.com/query) — Data synchronization
- [Expo Vector Icons](https://docs.expo.dev/guides/icons/) — Icon library

### Fonts
- [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) by Florian Karsten
- [Inter](https://fonts.google.com/specimen/Inter) by Rasmus Andersson

### Special Thanks
- The React Native community
- The Expo team
- All open source contributors whose libraries made this possible

---

## 📬 Contact

- **Repository:** [github.com/mritunjai-prog/FitAI-X](https://github.com/mritunjai-prog/FitAI-X)
- **Issues:** [github.com/mritunjai-prog/FitAI-X/issues](https://github.com/mritunjai-prog/FitAI-X/issues)
- **Branch:** `testing` (active development)

---

<p align="center">
  <strong>FitAI X</strong> — Your AI Personal Fitness Coach
  <br>
  <sub>Built with ❤️ and 🤖</sub>
</p>
