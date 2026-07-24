# FitAI X

FitAI X is a premium, AI-powered fitness application built with React Native (Expo) and TypeScript. It leverages custom high-performance SVG visualizers, smooth physics-based animations (React Native Reanimated), and a dark-themed glassmorphic aesthetic to deliver a state-of-the-art user experience comparable to top-tier apps like Apple Fitness and Oura.

## 🚀 Features Completed So Far

### 1. Cinematic Onboarding Flow
- **5-Step Wizard:** A highly tactile onboarding experience using staggered typography (`FadeInRight.delay()`).
- **Tactile Physics:** Option cards physically compress on press using custom `useSharedValue` springs.
- **Immersive AI Scanning:** An AI initialization screen featuring a pulsing, glowing radar ring behind the avatar.

### 2. Global Navigation & Architecture
- **App Router & Transitions:** Smooth cross-fade screen transitions using `react-native-reanimated`.
- **Premium Bottom Navigation:** A custom bottom bar featuring a sliding, frosted pill indicator, an animated pulsating FAB, and integrated haptic feedback.
- **Global Command Palette:** A "Spotlight Search" (`Cmd+K`) modal with deep background blur, tactile command rows, and dynamic filtering to navigate the app instantly.

### 3. Dashboard (Bento Box UI)
- **Immersive Background:** A dynamic `MeshGradientBackground` providing a living, breathing feel to the app.
- **Active Social Feed:** A horizontal list of active users with live sonar-pulse glowing indicators, and a real-time vertical activity feed.
- **Custom SVG Data Visualizers:** Lightweight, 60fps custom SVG components for Activity Rings, Live Waveform, and Spline Charts.

### 4. AI Coach ("Rachel")
- **Conversational Interface:** A dedicated chat screen for interacting with the AI coach.
- **Interactive Action Blocks:** The AI returns structured UI blocks (e.g., "Workout Adjusted" cards) embedded directly in the chat.
- **Micro-interactions:** Features a bouncing `<TypingIndicator />`, rich gradient bubbles for the user, and frosted glass (`BlurView`) for the AI.

### 5. Workout Builder & Version Control
- **Adaptive Workout Builder:** A sleek drag-and-drop interface for adjusting workouts dynamically.
- **Injury Conflict Detection:** An animated, shimmering warning banner that alerts the user if a workout conflicts with their reported injuries.
- **Workout Version History:** A sliding modal drawer that tracks modifications (like Git for workouts), allowing users to rollback to previous AI or user-edited versions.

### 6. Profile & Advanced Analytics
- **Muscle Balance Radar:** An interactive radar chart highlighting volume imbalances, coupled with frosted "AI Pills" that explain the intervention.
- **Injury-Memory Timeline:** A custom body map paired with a vertical gradient timeline (Red -> Gold -> Green) showing the progression of injury recovery.
- **Consistency Heatmap:** A Github-style contribution graph for workout consistency.

---

## 🛠 How to Run the Project

The frontend is built using Expo and React Native Web.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Step 1: Navigate to the Mobile App Directory
Open your terminal and navigate to the frontend folder:
```bash
cd frontend/mobile
```

### Step 2: Install Dependencies
Install all required NPM packages:
```bash
npm install
```

### Step 3: Start the Development Server
You can run the app in the web browser (which we have been using for preview) or on a physical device.

**To run on the Web:**
```bash
npx expo start -c --web
```
This will open a local web server (usually at `http://localhost:8081`).

**To run on a Physical Device (iOS / Android):**
```bash
npx expo start -c
```
1. Download the **Expo Go** app on your iPhone or Android device.
2. Scan the QR code that appears in your terminal.
3. The app will bundle and load directly on your phone, allowing you to test the haptic feedback and native performance!

### Step 4: Start the Backend API (Core-API)
The frontend relies on the `core-api` backend (Node.js + PostgreSQL + Prisma). 

Open a **new** terminal and navigate to the backend folder:
```bash
cd backend/core-api
```

Install the backend dependencies:
```bash
npm install
```

Start the PostgreSQL database via Docker:
```bash
docker-compose up -d
```

Push the database schema and seed the initial mock data:
```bash
npx prisma db push
npm run seed
```

Finally, start the backend server:
```bash
npm run dev
# or
npx tsx src/index.ts
```
The Core API Server and Realtime Socket Server will start on port `4000`.
