# FitAI X

FitAI X is a premium, AI-powered fitness application built with React Native (Expo) and TypeScript. It leverages custom high-performance SVG visualizers, smooth physics-based animations (React Native Reanimated), and a dark-themed glassmorphic aesthetic to deliver a state-of-the-art user experience comparable to top-tier apps like Apple Fitness and Oura.

## 🚀 Features Completed So Far

### 1. Global Navigation & Architecture
- **App Router & Transitions:** Smooth cross-fade screen transitions using `react-native-reanimated` without the bloat of heavy navigation libraries.
- **Premium Bottom Navigation:** A custom bottom bar featuring a sliding, frosted pill indicator, an animated pulsating FAB (Floating Action Button), and integrated haptic feedback (`expo-haptics`) for a deeply tactile feel.

### 2. Dashboard (Bento Box UI)
- **Immersive Background:** A dynamic `MeshGradientBackground` providing a living, breathing feel to the app.
- **Custom SVG Data Visualizers:** Replaced heavy charting libraries with lightweight, 60fps custom SVG components:
  - **Activity Rings:** Apple-style concentric progress rings.
  - **Live Waveform:** Animated heart-rate/exertion waveform.
  - **Radar & Bar Charts:** For visualizing muscle groups and weekly volume.

### 3. AI Coach ("Rachel")
- **Conversational Interface:** A dedicated chat screen for interacting with the AI coach.
- **Interactive Action Blocks:** The AI returns structured UI blocks (e.g., "Workout Adjusted" cards) embedded directly in the chat, not just plain text.
- **Micro-interactions:** Features a bouncing `<TypingIndicator />`, rich gradient bubbles for the user, frosted glass (`BlurView`) for the AI, and a dynamic glowing input area that swaps between microphone and send icons.

### 4. Workout Builder & Profile
- **Adaptive Workout Builder:** A sleek interface for generating and adjusting workouts dynamically.
- **Profile Screen:** Displays user statistics and a Github-style consistency heat map.

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

---

*Note: The backend API (Node.js/Express) and specific ML integrations are documented in the `FitAI_X_BRD_Updated.md` and will be initialized in the `backend/` folder in future development phases.*
