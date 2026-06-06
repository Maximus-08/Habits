# Comprehensive AtomicTracker Implementation Plan

This document establishes the unified plan to rebuild **AtomicTracker** from scratch. It integrates James Clear's *Atomic Habits* behavioral philosophy with the warm **Sleek Sunrise Design System** — minimal, clean, and calm.

> [!NOTE]
> **Revision 6** — Minimality pass. Stripped all techy/dark-theme effects (Spotlight, text scramble, neon glows). Library stack reduced to Shadcn/ui + Framer Motion + Recharts. All animations are subtle and warm, coherent with the beige palette. Dashboard simplified to 2-column layout.

---

## 1. Visual System: Sleek Sunrise Design

Warm minimalism. Calm, organic, data-dense. No visual clutter.

*   **Typography**:
    *   **Lora (Serif)**: Greetings, identity titles, review headers — warmth and gravitas.
    *   **Inter (Sans-Serif)**: Everything else — habit titles, buttons, controls, labels.
    *   **JetBrains Mono (Monospace)**: Stats, vote counts, level badges.
*   **Surfaces**:
    *   Background: Calm cream (`#FFFAF3`).
    *   Cards: White (`#FFFFFF`) with warm borders (`#EAE4DD`).
    *   No heavy drop-shadows. Ultra-thin borders and subtle background shifts only.
*   **Recovery Embers**: Missed days render in warm amber/gold — never red. A missed day is a warm ember to reignite, not a failure to punish.

### Palette

| Token | Hex | Class | Use |
|---|---|---|---|
| Background | `#FFFAF3` | `bg-bg` | Cream base |
| Surface | `#FFFFFF` | `bg-surface` | Cards, modals |
| Hover | `#FFF2E5` | `bg-hoverBg` | Soft peach hover lift |
| Success Tint | `#F4F9F5` | `bg-successTint` | Completed row fill |
| Primary | `#EFA683` | `bg-primary` | Terracotta — CTAs, badges |
| Success | `#A3C9A8` | `bg-success` | Sage green — checks, streaks |
| Forgiveness | `#F6C879` | `bg-forgive` | Gold — missed/warning states |
| Text | `#4A4036` | `text-text` | Deep organic brown |
| Muted | `#8C7C6B` | `text-muted` | Soft taupe |
| Border | `#EAE4DD` | `border-border` | Warm container borders |

---

## 2. UI Stack & Dependencies

### Philosophy
Use established libraries for primitives. Write custom code only for domain-specific components (habit cards, identity groups). No blanket adoption of flashy animation libraries — most are designed for dark techy landing pages and clash with warm beige.

### Shadcn/ui — Foundation
All interactive primitives, copy-pasted and themed with Sunrise palette:
- **Dialog** — Modals (relapse diagnosis, habit edit)
- **Tooltip** — Terminology help
- **Slider** — Satisfaction score
- **Card** — All card containers
- **Progress** — Linear progress bars
- **Button, Input, Textarea, Select** — Form controls

### Framer Motion — Subtle Animations
Direct usage for warm, minimal micro-interactions:
- Gentle `fadeIn` / `slideUp` page transitions
- Soft `scale(1.02)` hover lifts on cards
- Smooth completion checkmark morph (circle → check → sage fill)
- Quiet number transitions (vote count increment, days free reset)
- Level-up: warm terracotta glow pulse + fade-in of new level name

### Recharts — Analytics Charts
- **RadialBarChart** — Identity Strength gauge
- **LineChart** — "Days Free" sobriety curve
- **AreaChart** — Weekly completion rate trends
- Styled with Sunrise palette (sage green fills, terracotta accents, cream backgrounds)

### Heatmap
- Community shadcn-compatible heatmap calendar component (copy-paste)
- Accepts `{ date, count }[]`, styled with cream base → sage green fills

### Other Dependencies
- `react-router-dom@6` — Routing
- `firebase@10` — Auth + Firestore
- `react-hot-toast` — Toasts (styled with Sunrise palette — cream background, brown text, terracotta accents)
- `framer-motion` — Animations
- `recharts` — Charts
- `clsx` + `tailwind-merge` — Class composition

---

## 3. AI Suggestion Engine (Opt-in)

Strictly **inspirational and opt-in**. The user is always the architect of their identity.

### Integration Model
- Loads `VITE_GEMINI_API_KEY` from environment.
- If present: `@google/generative-ai` SDK client-side.
- If absent: **Local Suggestion Engine** (heuristics). App works fully offline.

### Workflows
- **✨ AI Environment Coach**: `✨ Ask AI` button next to `Environment Prep` and `Immediate Reward` fields. Returns 3 suggestions. User selects or tweaks.
- **✨ AI Relapse Diagnostics**: `✨ AI Diagnose` in relapse modal. Analyzes trigger, suggests 3 friction-adding Brakes. Selection writes to `invisibleStrategy` / `difficultStrategy`.

---

## 4. Coherence & Consistency Safeguards

### 1. Votes-Only Progression
Every completion — standard or 2-Min — counts as exactly **1 vote**. No XP, no weighted scoring.

| Level | Name | Votes |
|---|---|---|
| 1 | Seedling | 0 |
| 2 | Sprout | 25 |
| 3 | Grower | 75 |
| 4 | Contender | 150 |
| 5 | Atomic | 300 |
| 6 | 1% Machine | 600 |
| 7 | Compounding | 1200 |
| 8 | Identity Locked | 2500 |

### 2. Identity Strength Score (Per Identity)

$$\text{Identity Strength} = \frac{\text{Positive Votes}}{\text{Positive Votes} + \text{Relapses}} \times 100$$

Label: **"87% — winning the election"**. Displayed on Identity Card and Dashboard.

### 3. Dashboard Multi-Identity Default
Default: **"All Identities"** view. Habits grouped under `<IdentityHabitGroup />` headers with belief statement. Optional dropdown to isolate a single identity.

### 4. Brakes Visible on Dashboard
Bad Habit Cards render `invisibleStrategy` and `difficultStrategy` as visible reminders.

### 5. Single Environment Data Source
- Good habits: `environmentPrep` (optional field on habit doc)
- Bad habits: `trigger`, `invisibleStrategy`, `difficultStrategy` (fields on badHabit doc)
- Environment Design page reads/writes these directly. No separate collection.

### 6. Rename-Resilient Identity Linking
All docs store `identityId` (immutable) + `identityName` (display). Queries use ID; display uses name. Renames batch-update `identityName` across linked documents.

---

## 5. Database Schemas

### 1. `users/{userId}/profile/data`
```json
{
  "identity": "The Athlete",
  "level": 1,
  "totalVotes": 8,
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 2. `identities`
```json
{
  "id": "identity_abc123",
  "userId": "user_xyz789",
  "name": "The Athlete",
  "beliefStatement": "I am a healthy person who respects my body.",
  "createdAt": "..."
}
```

### 3. `habits`
```json
{
  "id": "habit_def456",
  "userId": "user_xyz789",
  "identityId": "identity_abc123",
  "identityName": "The Athlete",
  "title": "Morning Strength Exercise",
  "description": "Daily workout to build core strength.",
  "category": "Physical Health",
  "time": "07:30 AM",
  "location": "Living Room",
  "stackedHabit": "After I drink my morning glass of water",
  "twoMinRule": "Do 5 bodyweight squats and 1 plank",
  "environmentPrep": "Lay out exercise mat next to coffee table",
  "immediateReward": "Enjoy a cool protein shake",
  "createdAt": "..."
}
```
> `environmentPrep` and `immediateReward` are optional. Only rendered on cards when non-empty.

### 4. `badHabits`
```json
{
  "id": "badhabit_ghi789",
  "userId": "user_xyz789",
  "identityId": "identity_abc123",
  "identityName": "The Athlete",
  "name": "Late Night Snacking",
  "trigger": "Watching TV late at night when bored",
  "invisibleStrategy": "Remove junk food from eye-level pantry shelves",
  "difficultStrategy": "Lock pantry cupboards after 9:00 PM",
  "createdAt": "...",
  "lapses": [
    {
      "date": "2026-06-01T22:30:00.000Z",
      "triggerDetail": "Felt stressed after work, went looking for cookies",
      "environmentAdjustment": "Moved cookie jars to top-most shelf"
    }
  ]
}
```

### 5. `completions`
```json
{
  "id": "completion_jkl012",
  "userId": "user_xyz789",
  "habitId": "habit_def456",
  "identityId": "identity_abc123",
  "identityName": "The Athlete",
  "completedAt": "2026-06-03T07:35:00.000Z",
  "dateNormalized": "2026-06-03",
  "isTwoMinVersion": false,
  "notes": "Completed full 20-min routine."
}
```

### 6. `weeklyReviews`
```json
{
  "id": "2026-week-23",
  "userId": "user_xyz789",
  "year": 2026,
  "weekNumber": 23,
  "satisfaction": 8,
  "reflection": {
    "wins": "Worked out 5 days. Environment layout worked.",
    "challenges": "Late night snacking trigger is still active.",
    "learning": "Need more friction on fridge doors.",
    "nextWeek": "I will stick to keeping snacks locked."
  },
  "status": "completed"
}
```

---

## 6. Features & UI

### 1. Onboarding (Identity Discovery)
- Clean single-card wizard on cream backdrop. Slide transitions (Framer Motion `slideUp`).
- **Step 1**: Lora serif *"Who do you want to become?"* — captures identity name + belief statement (*"I am the type of person who..."*).
- **Step 2**: Form split into 4 boxes mapping the 4 Laws — Habit Stack, 2-Min Rule, Environment Prep, Immediate Reward. Each with a help tooltip explaining the concept.
- Redirect to Dashboard.

### 2. Dashboard (2-Column Layout)
Clean, not cluttered. Two columns on desktop, single column on mobile.

- **Main Column (65%)**: 
  - Greeting header in Lora (*"Good morning, Avnish"*) with current level badge and vote count.
  - Level progress bar (Shadcn Progress, themed sage green).
  - Date picker controlling which day's completions are shown/logged.
  - Weekly review reminder banner (Fri/Sat/Sun, if incomplete).
  - Habits grouped within `<IdentityHabitGroup />` containers per identity — each showing identity name, belief statement, and strength score. Within each group, habits sorted chronologically (Morning → Afternoon → Evening based on `time` field).
  - Bad habit cards with "Days Free" counter and visible brakes.

- **Sidebar (35%)**:
  - Identity Strength Score per identity (circular progress gauge, Recharts RadialBarChart).
  - Quick-view sobriety stats for bad habits.
  - Heatmap (last 3 months, expandable to full year).

### 3. Habit Card
- **Header**: Auto-composed Implementation Intention — *"After {stackedHabit}, I will {title} at {time} in {location}."*
- **Optional fields render conditionally**: `environmentPrep` as *"🔧 {environmentPrep}"*, `immediateReward` as *"🎁 {immediateReward}"*, `twoMinRule` as *"⚡ {twoMinRule}"*.
- **Split Completion**:
  - **"Cast Vote"** — standard completion.
  - **"2-Min Version"** — logs with `isTwoMinVersion: true`.
  - Both = 1 vote. On completion: smooth checkmark morph animation (circle → check → sage green fill, Framer Motion ~400ms). Gentle, warm, satisfying.
- **Undo**: Hover completed button → transitions to "Undo" with uncheck icon. Click removes completion.
- **"Never Miss Twice"**: If yesterday missed + streak ≥ 2 → card border shifts to `border-forgive` (gold) with gentle pulse. Badge: *"Yesterday was a slip. Cast a vote today — even the 2-min version counts."* Disappears on completion.

### 4. Past-Date Logging
- Date picker controls completion date. Completing/undoing uses `selectedDate`, not system date.
- Completion check matches `dateNormalized` against selected date.

### 5. Relapse Diagnosis Modal
- Shadcn Dialog opens on bad habit relapse:
  - *"What triggered this relapse?"*
  - *"How can we redesign your environment?"*
- Saves rich lapse `{ date, triggerDetail, environmentAdjustment }`.
- Days Free counter smoothly transitions to 0 (Framer Motion number animation).
- Optionally updates `invisibleStrategy` / `difficultStrategy` if user confirms.

### 6. Belief Statement
- Text field on identity create/edit: *"I am the type of person who..."*
- Renders as subtitle on Identity Card and Dashboard group header.

### 7. Weekly Review (Manual)
- Full-page form. 4 free-text fields: wins, challenges, learning, next week's focus.
- Satisfaction slider (0–10, Shadcn Slider).
- Save Draft / Complete Review.
- Deterministic doc ID (`{year}-week-{weekNumber}`) for re-editing.

### 8. Weekly Review Reminder
- Alert banner on Dashboard during Fri/Sat/Sun if current week's review is incomplete.

### 9. Terminology Tooltips
- Shadcn Tooltip next to each technical form input:
  - Stacked Routine → 1st Law: Make it Obvious
  - 2-Min Rule → 3rd Law: Make it Easy
  - Environment Prep → Reduce Friction
  - Immediate Reward → 4th Law: Make it Satisfying
  - Brakes → Inversion: Add Friction
- Each with one concrete example.

### 10. Environment Design Page
- Two-column: **Engines** (sage green accents) vs **Brakes** (terracotta accents).
- Engines: reads/writes `habits.environmentPrep` per habit under selected identity.
- Brakes: reads/writes `badHabits.trigger`, `invisibleStrategy`, `difficultStrategy`.
- Same data the Dashboard reads — single source of truth.

### 11. Performance Analytics
- **Identity Strength Gauge**: Recharts RadialBarChart per identity. Cream background, sage fill.
- **Habit Heatmap**: 52-week grid. Cream base → sage green fills. `⚡` marker for 2-min completions.
- **Sobriety Curve**: Recharts LineChart — "Days Free" per bad habit, gold gradient.
- **Completion Trends**: Recharts AreaChart — weekly completion percentages.
- **Data Export**: JSON download of all habits, completions, stats.

---

## 7. Execution Roadmap

1. **Foundations**: Clear `src/`. Configure Tailwind with Sunrise tokens. Set up fonts (Lora, Inter, JetBrains Mono). Initialize shadcn/ui. Install dependencies.
2. **Services**: Firestore service — identity CRUD (with `beliefStatement`), habit CRUD, bad habit CRUD (with rich lapse logging), completion CRUD (with `dateNormalized`, `isTwoMinVersion`), weekly reviews, identity rename batch updater.
3. **Context**: Auth + User contexts. Votes-only leveling via `LEVELS`. Identity Strength computation. Collection state management.
4. **Primitives**: Shadcn components themed with Sunrise palette. Framer Motion animation variants (fadeIn, slideUp, checkmark morph, number transition). Heatmap calendar component. Custom domain components (IdentityHabitGroup, HabitCard, BadHabitCard).
5. **Onboarding & Auth**: Login/signup views. Identity Discovery wizard (belief statement → first system → dashboard).
6. **Dashboard & Cards**: 2-column layout. Identity groups with chronological sorting. Split completion + undo. Never Miss Twice badges. Bad habit cards with brakes. Date picker. Review banner. Strength score display. Level progress bar.
7. **Identity & Environment**: Identity management with belief statement. Environment Design page (Engines/Brakes). Relapse diagnosis modal with optional AI suggestions. Tooltips.
8. **Analytics**: Heatmap, strength gauge, sobriety curve, completion trends, data export.

> [!NOTE]
> **Phase 2 (post-MVP):**
> - Accountability Community Board (group feeds, chat, 7-day challenge grids)
> - Chrome Extension
> - Dynamic Archetype Inference
> - Drag-and-drop reordering for environment strategies
