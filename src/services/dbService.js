// Local-first Database Service using LocalStorage
// Simulates Firestore schemas and cascade updates
import { calculateLevelFromVotes } from '../utils/constants';

const STORAGE_KEYS = {
  IDENTITIES: 'atomic_identities',
  HABITS: 'atomic_habits',
  BAD_HABITS: 'atomic_bad_habits',
  COMPLETIONS: 'atomic_completions',
  WEEKLY_REVIEWS: 'atomic_weekly_reviews',
  USER_PROFILE: 'atomic_user_profile',
  INITIALIZED: 'atomic_db_initialized'
};

// Seed Data definition
const SEED_DATA = {
  userProfile: {
    identity: "The Athlete",
    level: 2,
    totalVotes: 28,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  identities: [
    {
      id: "id_athlete",
      name: "The Athlete",
      beliefStatement: "I am a healthy person who respects my body and builds strength daily.",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "id_writer",
      name: "The Writer",
      beliefStatement: "I am a creative explorer who clarifies thoughts through writing.",
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  habits: [
    {
      id: "habit_workout",
      identityId: "id_athlete",
      identityName: "The Athlete",
      title: "Morning Strength Exercise",
      description: "Short bodyweight workout to activate muscles and build durability.",
      category: "Physical Health",
      time: "07:30 AM",
      location: "Living Room",
      stackedHabit: "After I drink my morning glass of water",
      twoMinRule: "Do 5 bodyweight squats and 1 plank",
      environmentPrep: "Lay out exercise mat next to the coffee table before sleeping",
      immediateReward: "Enjoy a cool protein shake and 10 minutes of reading",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "habit_write",
      identityId: "id_writer",
      identityName: "The Writer",
      title: "Daily Journaling",
      description: "Write down thoughts, plans, and creative insights.",
      category: "Mind & Creativity",
      time: "08:15 AM",
      location: "Study Desk",
      stackedHabit: "After I pour my morning coffee",
      twoMinRule: "Open notebook and write 1 sentence",
      environmentPrep: "Open my notebook to a blank page and place a pen on top the night before",
      immediateReward: "Tick off my daily calendar and stretch my arms",
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  badHabits: [
    {
      id: "bad_snack",
      identityId: "id_athlete",
      identityName: "The Athlete",
      name: "Late Night Snacking",
      trigger: "Watching TV late at night when bored",
      invisibleStrategy: "Remove junk food from eye-level pantry shelves",
      difficultStrategy: "Lock pantry cupboards or use timed kitchen safe after 9:00 PM",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      lapses: [
        {
          date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          triggerDetail: "Had a stressful workday and watched late-night football.",
          environmentAdjustment: "Put lock on the snack drawer and kept snacks out of sight."
        },
        {
          date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          triggerDetail: "Stayed up late studying. Mindless hunger kicked in.",
          environmentAdjustment: "Set a hard rule to brush teeth immediately at 9:00 PM."
        }
      ]
    },
    {
      id: "bad_scroll",
      identityId: "id_writer",
      identityName: "The Writer",
      name: "Doom Scrolling at Night",
      trigger: "Feeling tired in bed but not wanting to sleep yet",
      invisibleStrategy: "Leave phone charger in the kitchen away from bed",
      difficultStrategy: "Turn off phone completely at 9:30 PM",
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      lapses: []
    }
  ],
  completions: [],
  weeklyReviews: []
};

// Generate past completions for seeding (to populate statistics and heatmap)
const generateSeedCompletions = () => {
  const completions = [];
  const startDay = 25; // Generate completions for past 25 days
  const today = new Date();
  
  for (let i = startDay; i >= 0; i--) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() - i);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Skip today for active checking
    if (i === 0) continue;
    
    // Workout habit completions (80% compliance)
    if (Math.random() < 0.8) {
      // 30% of completions are 2-min rule versions
      const isTwoMin = Math.random() < 0.3;
      completions.push({
        id: `c_workout_${dateStr}`,
        userId: "user_default",
        habitId: "habit_workout",
        identityId: "id_athlete",
        identityName: "The Athlete",
        completedAt: `${dateStr}T07:40:00.000Z`,
        dateNormalized: dateStr,
        isTwoMinVersion: isTwoMin,
        notes: isTwoMin ? "Felt low energy, met 2-min requirement." : "Completed full morning workout."
      });
    }

    // Write habit completions (70% compliance)
    if (Math.random() < 0.7) {
      const isTwoMin = Math.random() < 0.2;
      completions.push({
        id: `c_write_${dateStr}`,
        userId: "user_default",
        habitId: "habit_write",
        identityId: "id_writer",
        identityName: "The Writer",
        completedAt: `${dateStr}T08:25:00.000Z`,
        dateNormalized: dateStr,
        isTwoMinVersion: isTwoMin,
        notes: isTwoMin ? "Wrote standard 2 lines." : "Completed full reflection session."
      });
    }
  }
  return completions;
};

// Helper: load/save from localStorage
const load = (key, fallback) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    console.error(`Failed to parse localStorage key "${key}":`, e);
    return fallback;
  }
};

const save = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Initialize DB if not done
export const initDB = (force = false) => {
  if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED) || force) {
    save(STORAGE_KEYS.USER_PROFILE, SEED_DATA.userProfile);
    save(STORAGE_KEYS.IDENTITIES, SEED_DATA.identities);
    save(STORAGE_KEYS.HABITS, SEED_DATA.habits);
    save(STORAGE_KEYS.BAD_HABITS, SEED_DATA.badHabits);
    
    const seedCompletions = generateSeedCompletions();
    save(STORAGE_KEYS.COMPLETIONS, seedCompletions);
    
    // Seed some weekly reviews
    const weeklyReviews = [
      {
        id: `${new Date().getFullYear()}-week-${getWeekNumber(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))}`,
        userId: "user_default",
        year: new Date().getFullYear(),
        weekNumber: getWeekNumber(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
        satisfaction: 8,
        reflection: {
          wins: "Completed Morning Workout consistently. The visual mat layout is working.",
          challenges: "Late night snacking trigger hit twice during late gaming sessions.",
          learning: "Visual cues have the strongest pull. I must lock snacks before starting games.",
          nextWeek: "Focus on locking pantry cupboards early at 9:00 PM."
        },
        status: "completed"
      }
    ];
    save(STORAGE_KEYS.WEEKLY_REVIEWS, weeklyReviews);
    
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    console.log("Database initialized with seed data.");
  }
};

// Week number helper
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  return weekNo;
}

// Call initDB immediately on import removed to avoid module load side-effects.
// Entry points should call it explicitly if needed.

export const dbService = {
  // --- USER PROFILE ---
  getUserProfile: () => load(STORAGE_KEYS.USER_PROFILE, {}),
  updateUserProfile: (profileData) => {
    const current = load(STORAGE_KEYS.USER_PROFILE, {});
    const updated = { ...current, ...profileData, updatedAt: new Date().toISOString() };
    save(STORAGE_KEYS.USER_PROFILE, updated);
    return updated;
  },

  // --- IDENTITIES ---
  getIdentities: () => load(STORAGE_KEYS.IDENTITIES, []),
  
  saveIdentity: (identity) => {
    const identities = load(STORAGE_KEYS.IDENTITIES, []);
    const newIdentity = {
      ...identity,
      id: identity.id || `identity_${Date.now()}`,
      createdAt: identity.createdAt || new Date().toISOString()
    };
    identities.push(newIdentity);
    save(STORAGE_KEYS.IDENTITIES, identities);
    return newIdentity;
  },

  updateIdentity: (id, updatedFields) => {
    const identities = load(STORAGE_KEYS.IDENTITIES, []);
    const index = identities.findIndex(i => i.id === id);
    if (index === -1) return null;

    const oldName = identities[index].name;
    const updatedIdentity = { ...identities[index], ...updatedFields };
    identities[index] = updatedIdentity;
    save(STORAGE_KEYS.IDENTITIES, identities);

    // Rename-Resilient Identity Linking: Cascade rename if identity name changed
    if (updatedFields.name && updatedFields.name !== oldName) {
      dbService.cascadeIdentityRename(id, updatedFields.name);
    }

    return updatedIdentity;
  },

  deleteIdentity: (id) => {
    let identities = load(STORAGE_KEYS.IDENTITIES, []);
    identities = identities.filter(i => i.id !== id);
    save(STORAGE_KEYS.IDENTITIES, identities);

    // Delete habits, bad habits, and completions belonging to this identity
    let habits = load(STORAGE_KEYS.HABITS, []);
    habits = habits.filter(h => h.identityId !== id);
    save(STORAGE_KEYS.HABITS, habits);

    let badHabits = load(STORAGE_KEYS.BAD_HABITS, []);
    badHabits = badHabits.filter(b => b.identityId !== id);
    save(STORAGE_KEYS.BAD_HABITS, badHabits);

    let completions = load(STORAGE_KEYS.COMPLETIONS, []);
    completions = completions.filter(c => c.identityId !== id);
    save(STORAGE_KEYS.COMPLETIONS, completions);
  },

  cascadeIdentityRename: (identityId, newName) => {
    // 1. Habits
    const habits = load(STORAGE_KEYS.HABITS, []);
    let habitsChanged = false;
    const updatedHabits = habits.map(h => {
      if (h.identityId === identityId) {
        habitsChanged = true;
        return { ...h, identityName: newName };
      }
      return h;
    });
    if (habitsChanged) save(STORAGE_KEYS.HABITS, updatedHabits);

    // 2. Bad Habits
    const badHabits = load(STORAGE_KEYS.BAD_HABITS, []);
    let badHabitsChanged = false;
    const updatedBadHabits = badHabits.map(b => {
      if (b.identityId === identityId) {
        badHabitsChanged = true;
        return { ...b, identityName: newName };
      }
      return b;
    });
    if (badHabitsChanged) save(STORAGE_KEYS.BAD_HABITS, updatedBadHabits);

    // 3. Completions
    const completions = load(STORAGE_KEYS.COMPLETIONS, []);
    let completionsChanged = false;
    const updatedCompletions = completions.map(c => {
      if (c.identityId === identityId) {
        completionsChanged = true;
        return { ...c, identityName: newName };
      }
      return c;
    });
    if (completionsChanged) save(STORAGE_KEYS.COMPLETIONS, updatedCompletions);
  },

  // --- HABITS (Good Habits) ---
  getHabits: () => load(STORAGE_KEYS.HABITS, []),
  
  saveHabit: (habit) => {
    const habits = load(STORAGE_KEYS.HABITS, []);
    const newHabit = {
      ...habit,
      id: habit.id || `habit_${Date.now()}`,
      createdAt: habit.createdAt || new Date().toISOString()
    };
    habits.push(newHabit);
    save(STORAGE_KEYS.HABITS, habits);
    return newHabit;
  },

  updateHabit: (id, updatedFields) => {
    const habits = load(STORAGE_KEYS.HABITS, []);
    const index = habits.findIndex(h => h.id === id);
    if (index === -1) return null;

    const updated = { ...habits[index], ...updatedFields };
    habits[index] = updated;
    save(STORAGE_KEYS.HABITS, habits);
    return updated;
  },

  deleteHabit: (id) => {
    let habits = load(STORAGE_KEYS.HABITS, []);
    habits = habits.filter(h => h.id !== id);
    save(STORAGE_KEYS.HABITS, habits);

    // Clean completions for this habit
    let completions = load(STORAGE_KEYS.COMPLETIONS, []);
    completions = completions.filter(c => c.habitId !== id);
    save(STORAGE_KEYS.COMPLETIONS, completions);
  },

  // --- BAD HABITS ---
  getBadHabits: () => load(STORAGE_KEYS.BAD_HABITS, []),
  
  saveBadHabit: (badHabit) => {
    const badHabits = load(STORAGE_KEYS.BAD_HABITS, []);
    const newBadHabit = {
      ...badHabit,
      id: badHabit.id || `badhabit_${Date.now()}`,
      lapses: badHabit.lapses || [],
      createdAt: badHabit.createdAt || new Date().toISOString()
    };
    badHabits.push(newBadHabit);
    save(STORAGE_KEYS.BAD_HABITS, badHabits);
    return newBadHabit;
  },

  updateBadHabit: (id, updatedFields) => {
    const badHabits = load(STORAGE_KEYS.BAD_HABITS, []);
    const index = badHabits.findIndex(b => b.id === id);
    if (index === -1) return null;

    const updated = { ...badHabits[index], ...updatedFields };
    badHabits[index] = updated;
    save(STORAGE_KEYS.BAD_HABITS, badHabits);
    return updated;
  },

  deleteBadHabit: (id) => {
    let badHabits = load(STORAGE_KEYS.BAD_HABITS, []);
    badHabits = badHabits.filter(b => b.id !== id);
    save(STORAGE_KEYS.BAD_HABITS, badHabits);
  },

  logRelapse: (id, { triggerDetail, environmentAdjustment, date }) => {
    const badHabits = load(STORAGE_KEYS.BAD_HABITS, []);
    const index = badHabits.findIndex(b => b.id === id);
    if (index === -1) return null;

    const relapseDate = date || new Date().toISOString();
    const newLapse = {
      date: relapseDate,
      triggerDetail: triggerDetail || "No details provided.",
      environmentAdjustment: environmentAdjustment || ""
    };

    const badHabit = badHabits[index];
    const lapses = [...(badHabit.lapses || []), newLapse];
    
    // If environment adjustment is provided, we can optionally update invisibleStrategy or difficultStrategy
    const updatedFields = { lapses };
    if (environmentAdjustment) {
      // Heuristic: append or assign to the strategies
      if (!badHabit.invisibleStrategy) {
        updatedFields.invisibleStrategy = environmentAdjustment;
      } else {
        updatedFields.difficultStrategy = environmentAdjustment;
      }
    }

    const updated = { ...badHabit, ...updatedFields };
    badHabits[index] = updated;
    save(STORAGE_KEYS.BAD_HABITS, badHabits);
    return updated;
  },

  // --- COMPLETIONS (Votes Cast) ---
  getCompletions: () => load(STORAGE_KEYS.COMPLETIONS, []),

  toggleCompletion: (habitId, dateNormalized, isTwoMinVersion = false, notes = "", userId = "user_default") => {
    const completions = load(STORAGE_KEYS.COMPLETIONS, []);
    const habits = load(STORAGE_KEYS.HABITS, []);
    
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return null;

    const existingIndex = completions.findIndex(
      c => c.habitId === habitId && c.dateNormalized === dateNormalized
    );

    if (existingIndex !== -1) {
      // Undo Completion
      const removed = completions[existingIndex];
      completions.splice(existingIndex, 1);
      save(STORAGE_KEYS.COMPLETIONS, completions);
      
      // Update User Total Votes (decrement)
      dbService.adjustUserVotes(-1);
      
      return { status: 'removed', completion: removed };
    } else {
      // Cast Vote (Add Completion)
      const newCompletion = {
        id: `completion_${habitId}_${dateNormalized}`,
        userId,
        habitId,
        identityId: habit.identityId,
        identityName: habit.identityName,
        completedAt: new Date().toISOString(),
        dateNormalized,
        isTwoMinVersion,
        notes
      };
      
      completions.push(newCompletion);
      save(STORAGE_KEYS.COMPLETIONS, completions);
      
      // Update User Total Votes (increment)
      dbService.adjustUserVotes(1);

      return { status: 'added', completion: newCompletion };
    }
  },

  adjustUserVotes: (amount) => {
    const profile = dbService.getUserProfile();
    const totalVotes = Math.max(0, (profile.totalVotes || 0) + amount);
    
    // Recompute level based on total votes using shared utility
    const activeLevel = calculateLevelFromVotes(totalVotes);

    dbService.updateUserProfile({ totalVotes, level: activeLevel });
  },

  // --- WEEKLY REVIEWS ---
  getWeeklyReviews: () => load(STORAGE_KEYS.WEEKLY_REVIEWS, []),
  
  saveWeeklyReview: (review) => {
    const reviews = load(STORAGE_KEYS.WEEKLY_REVIEWS, []);
    const reviewId = review.id || `${review.year}-week-${review.weekNumber}`;
    
    const existingIndex = reviews.findIndex(r => r.id === reviewId);
    const updatedReview = {
      ...review,
      id: reviewId,
      createdAt: review.createdAt || new Date().toISOString()
    };

    if (existingIndex !== -1) {
      reviews[existingIndex] = updatedReview;
    } else {
      reviews.push(updatedReview);
    }
    
    save(STORAGE_KEYS.WEEKLY_REVIEWS, reviews);
    return updatedReview;
  },

  getWeeklyReview: (year, weekNumber) => {
    const reviews = load(STORAGE_KEYS.WEEKLY_REVIEWS, []);
    return reviews.find(r => r.year === year && r.weekNumber === weekNumber) || null;
  },

  // Export all data
  exportData: () => {
    const data = {
      userProfile: dbService.getUserProfile(),
      identities: dbService.getIdentities(),
      habits: dbService.getHabits(),
      badHabits: dbService.getBadHabits(),
      completions: dbService.getCompletions(),
      weeklyReviews: dbService.getWeeklyReviews()
    };
    return JSON.stringify(data, null, 2);
  },

  // Clear everything
  clearAllData: () => {
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.IDENTITIES);
    localStorage.removeItem(STORAGE_KEYS.HABITS);
    localStorage.removeItem(STORAGE_KEYS.BAD_HABITS);
    localStorage.removeItem(STORAGE_KEYS.COMPLETIONS);
    localStorage.removeItem(STORAGE_KEYS.WEEKLY_REVIEWS);
    localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
    initDB(true);
  }
};
