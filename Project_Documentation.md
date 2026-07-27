# FitAI X - Project Architecture & Technical Overview

This document provides a comprehensive overview of the **FitAI X** application. It details the features developed to date, the specific UI/UX animation methodologies employed on the frontend, and the intended architecture and database structures for the backend. 

This document is designed to serve as a technical walkthrough for academic review and project presentation.

---

## 1. Executive Summary

**FitAI X** is not a standard fitness tracker. It is an **AI-driven ecosystem** that learns from the user and continuously evolves. Instead of rigid, static workout plans, FitAI X dynamically generates "Today's Best Workout" by analyzing a multitude of factors, including the user's previous workouts, reported injuries, sleep data, and real-time recovery metrics.

---

## 2. Frontend Development: What Has Been Built (Phases 1-5)

The frontend is built using **React Native (Expo)**, **TypeScript**, and heavily leverages **React Native Reanimated** for smooth, physics-based, 60 FPS animations.

### Phase 1: Cinematic Onboarding Flow
- **Description:** A highly tactile, 5-step wizard that establishes the app's premium feel.
- **Key Mechanics:** Utilizes staggered typography and physical compression on buttons. Step 5 features an immersive "AI Scanning" state with a pulsating radar ring, visually communicating the AI model generating a custom routine.

### Phase 2: Dashboard (Bento Box UI)
- **Description:** A spatial, asymmetric dashboard housing live data.
- **Key Mechanics:** 
  - **Live Social Feed:** Displays active users with animated "sonar pulses" indicating they are mid-workout.
  - **Custom SVG Visualizers:** Instead of relying on heavy charting libraries, the app uses raw SVGs for Activity Rings, Heart Rate Waveforms, and Spline charts.

### Phase 3: Profile & Advanced Analytics
- **Description:** A deep-dive into the user's statistics, focusing on AI interventions.
- **Key Mechanics:** 
  - **Muscle Balance Radar:** An interactive SVG radar chart highlighting muscular imbalances. 
  - **Injury-Memory Timeline:** A custom body map paired with a vertical gradient timeline to track injury recovery and explain AI workout modifications.

### Phase 4: Workout Builder & Version Control
- **Description:** A sleek interface for generating and adjusting workouts dynamically.
- **Key Mechanics:**
  - **Conflict Warnings:** Animated, shimmering banners that instantly alert the user if an exercise conflicts with a reported injury.
  - **Version History Drawer:** A sliding modal mimicking Git-like version control, allowing users to rollback to previous AI or user-edited workout versions.

### Phase 5: Global Command Palette
- **Description:** A "Spotlight Search" feature to navigate the app instantly.
- **Key Mechanics:** Accessible via a UI button or `Cmd+K` / `Ctrl+K` on the web. It uses deep background blurring, spring-physics scaling, and dynamic filtering.

---

## 3. How the UI & Animations Work (Technical Breakdown)

The aesthetic of FitAI X relies on **Glassmorphism** and **Tactile Physics**. The primary library used for this is `react-native-reanimated`.

### 1. Layout Animations
Instead of manually managing entrance lifecycles, the app uses Reanimated's layout animations to trigger entrances when components mount.
- **Functions Used:** `FadeIn`, `FadeInUp`, `ZoomIn`, `SlideInDown`.
- **Example Usage:**
  ```tsx
  <Animated.View entering={ZoomIn.duration(250).springify().damping(20)}>
    <CommandPalette />
  </Animated.View>
  ```
- **Staggering:** `FadeInUp.delay(index * 100)` is used to create cascading lists where items appear one after the other.

### 2. Physics-Based Interactions (Tactile Buttons)
Standard buttons in React Native (`TouchableOpacity`) simply fade opacity. FitAI X uses physical depression to mimic real-world buttons.
- **Functions Used:** `useSharedValue`, `useAnimatedStyle`, `withSpring`.
- **Example Usage:**
  ```tsx
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  
  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 300 }) }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }) }}
    >
      <Animated.View style={animStyle}>...</Animated.View>
    </Pressable>
  )
  ```

### 3. Continuous Animations (Pulses & Sonars)
For live indicators (like active users or heart rate pulses), continuous repeating animations are used.
- **Functions Used:** `withRepeat`, `withSequence`, `withTiming`.
- **Example Usage:**
  ```tsx
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.2, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1, // infinite loop
      true // reverse
    );
  }, []);
  ```

### 4. Custom SVG Animations
For the Body Map and Radar Chart, `Animated.createAnimatedComponent` is used to wrap raw SVG elements (`Path`, `Ellipse`, `Polygon`). This allows the app to animate individual SVG vertices and paths smoothly without re-rendering the React tree.

---

## 4. Backend Architecture (Intended Design)

To support the heavy lifting of AI orchestration without blocking the frontend, the backend requires an **Event-Driven Architecture**. A standard synchronous CRUD API is insufficient.

### Tech Stack
- **Framework:** Node.js with Express (or NestJS).
- **Database:** PostgreSQL (Relational integrity) managed by Prisma ORM.
- **Queue System:** BullMQ backed by Redis.
- **WebSockets:** Socket.io for real-time dashboard updates (Live Active Users).

### The AI Queue System (BullMQ)
When a user requests a new workout or updates a goal, the LLM takes time to process. The flow is:
1. **Frontend** sends `POST /api/workouts/generate`.
2. **Backend API** immediately returns `202 Accepted` and a `Job ID`.
3. **BullMQ Worker** running in the background gathers user context (past workouts, sleep, injuries), sends the prompt to the AI (e.g., OpenAI/Gemini), and saves the result to PostgreSQL.
4. **WebSocket/Polling** notifies the frontend that the workout is ready.

### Event-Driven Triggers
The backend relies on the Publisher/Subscriber model.
- **Example:** When a user completes a workout, an event `WORKOUT_COMPLETED` is emitted.
- **Listeners react asynchronously:**
  - `UpdateStreakService` increments the user's streak.
  - `AnalyticsService` calculates the new Recovery Score.
  - `AIEngineService` checks if the next day's workout needs adjusting based on the newly reported fatigue.

---

## 5. Database Structure

The database utilizes a relational model to ensure data integrity and strict version control for workouts.

### Core Entities & Relationships

**1. User (`users` table)**
- `id` (UUID, Primary Key)
- `email`, `name`, `password_hash`
- `current_goal` (Enum: Hypertrophy, Weight Loss, Marathon)
- `recovery_score` (Int)

**2. Physical Metrics & Injuries (`health_logs` table)**
- `id` (UUID)
- `user_id` (Foreign Key -> users.id)
- `muscle_group` (String)
- `status` (Enum: Injured, Sore, Healthy)
- `reported_at` (Timestamp)

**3. Workouts (`workouts` table)**
*Note: Workouts act like Git commits to support Version Control.*
- `id` (UUID, Primary Key)
- `user_id` (Foreign Key)
- `version` (Int)
- `parent_workout_id` (UUID, Self-referencing Foreign Key for rolling back)
- `status` (Enum: Generated, Completed, Skipped)
- `ai_explanation` (Text) - *Stores why the AI chose these exercises.*

**4. Exercises (`exercises` table)**
- `id` (UUID)
- `name` (String)
- `primary_muscle` (String)
- `secondary_muscles` (Array)

**5. Workout Entries (`workout_exercises` table)**
- `id` (UUID)
- `workout_id` (Foreign Key -> workouts.id)
- `exercise_id` (Foreign Key -> exercises.id)
- `sets` (Int)
- `reps` (String)
- `weight` (Float)
- `order` (Int)

### System Flow Example: Injury Adjustment
1. User reports a **Shoulder Strain** via the app.
2. The `health_logs` table creates a new record.
3. An event triggers the AI Engine.
4. The AI looks at tomorrow's `workout` and its `workout_exercises`.
5. It detects `Overhead Press` (primary_muscle = Shoulders).
6. A new `workout` record is created (`version` + 1), where `Overhead Press` is swapped, and the `ai_explanation` is populated. 
7. The frontend shows a Conflict Warning and allows the user to view the Version History.
