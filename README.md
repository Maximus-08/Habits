# Habits - Atomic Habits Tracker

Habits is a premium, local-first habit tracking web application built on React, Vite, and Cloud Firestore. Inspired by James Clear's *Atomic Habits*, the application places identity at the center of behavior change, helping users vote for their desired self through daily routines and audits.

The interface features a warm, high-contrast, premium color scheme (terracotta, peach, and sage green) with smooth transitions, responsive layouts, and interactive guides.

---

## Key Features

### 1. Identity-First Onboarding
- **Identity Definition**: Users define who they want to become (e.g., "The Athlete", "The Writer") rather than just what they want to achieve.
- **Routines Stack**: Couples new habits directly with existing anchor triggers using implementation intentions (*"After I [Anchor], I will [Habit]"*).

### 2. Interactive Habits Dashboard
- **Daily Check-Ins**: Clear, responsive checkboxes to track habits completed today.
- **2-Minute Rule Version**: Allows users to log scaled-down versions of habits to maintain consistency (*"Do 5 squats"* instead of *"Full workout"*).
- **Anti-Habits Slip Logging**: Track triggers and note environment friction adjustments when slips occur.
- **Leveling & Progress**: Earn progress votes for every completion, leveling up from *Seedling* to *Atomic* and *Identity Locked*.

### 3. Environment Architect Tab
- **Engines (Good Habits Cues)**: Design space preparation strategies to make cues obvious (e.g., unrolling your exercise mat next to the bed).
- **Brakes (Anti-Habits Friction)**: Establish commitment devices to make bad habits difficult or invisible (e.g., storing chargers outside the bedroom).
- **AI Coach Suggestions**: Heuristic-based recommendations to optimize environment cues.

### 4. Performance Analytics Page
- **14-Day Completion curves**: Area charts showing daily good habit compliance percentage.
- **Anti-Habit Sobriety Streaks**: Line charts graphing days free since last logged slips.
- **Evidence Logs**: Summarized cards listing identity strength calculated from completions vs slips.
- **Reflections History**: Chronological log of past weekly review reflections with smooth scroll anchor focus.

### 5. Weekly Reviews System
- Auditing prompt to log Wins, Challenges, Lessons Learned, and Next Week's Focus.
- Displays calendar date ranges dynamically alongside ISO week numbers.

---

## Technical Architecture

### 1. Database Connection Safety Guard
- Employs a 2.5-second Firestore connection timeout safety guard to prevent hanging loading screens.
- Displays a user-friendly, blocking "Connection Unreachable" screen when Firestore is unreachable or offline, allowing users to retry their connection.
- Integrates toast notifications warning the user if the network connection is slow or degraded.

### 2. Dual Deduplication System
- **Client-Side Selector (`useMemo`)**: Intercepts loaded context states to filter and deduplicate records before they are rendered, resolving UI bloat instantly.
- **Background Database Cleanup**: Optimizes and purges duplicate Firestore documents concurrently using `Promise.all` deletions and updates, keeping database sizes small.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- Firebase Project with Firestore and Authentication enabled (Google & Email/Password providers).

### 1. Configure Environment Variables
Create a `.env` file in the project root (use `.env.example` as a template):
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
The application will run locally at `http://localhost:5173`.

### 4. Production Build
```bash
npm run build
```
Creates minified, production-ready assets inside the `dist/` directory.

### 5. Run Linter
```bash
npm run lint
```
Checks the codebase for any syntax errors or style issues using ESLint.

### 6. Run Unit Tests
```bash
npm test
```
Runs the unit test suite using Vitest.

---

## Database Schemas

### User Profile (`users/{userId}`)
- `userId` (String)
- `level` (Number)
- `totalVotes` (Number)
- `createdAt`/`updatedAt` (ISO Strings)

### Identities (`users/{userId}/identities/{identityId}`)
- `name` (String)
- `beliefStatement` (String)
- `createdAt` (ISO String)

### Habits (`users/{userId}/habits/{habitId}`)
- `identityId` (String)
- `identityName` (String)
- `title` (String)
- `description` (String)
- `category` (String)
- `time` (String)
- `location` (String)
- `stackedHabit` (String)
- `twoMinRule` (String)
- `environmentPrep` (String)
- `immediateReward` (String)

### Completions (`users/{userId}/completions/{completionId}`)
- `habitId` (String)
- `identityId` (String)
- `identityName` (String)
- `dateNormalized` (String, `YYYY-MM-DD`)
- `isTwoMinVersion` (Boolean)
- `notes` (String)
- `completedAt` (ISO String)

### Weekly Reviews (`users/{userId}/weeklyReviews/{reviewId}`)
- `year` (Number)
- `weekNumber` (Number)
- `satisfaction` (Number)
- `reflection` (Map: `wins`, `challenges`, `learning`, `nextWeek`)
- `status` (String: `'draft'` | `'completed'`)
