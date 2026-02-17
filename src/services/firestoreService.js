import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  getDocFromCache,
  getDocsFromCache,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const DEFAULT_SERVER_TIMEOUT_MS = 10000;

function isLikelyBlockedOrOffline(error) {
  const msg = String(error?.message || '').toLowerCase();
  // Common patterns when extensions block google endpoints or Firestore marks client offline
  return (
    msg.includes('err_blocked_by_client') ||
    msg.includes('blocked by client') ||
    msg.includes('client is offline') ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    error?.code === 'unavailable'
  );
}

async function withTimeout(promise, timeoutMs = DEFAULT_SERVER_TIMEOUT_MS) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

// User Profile Operations
export const createUserProfile = async (userId, profileData) => {
  try {
    await setDoc(doc(db, 'users', userId, 'profile', 'data'), {
      ...profileData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return { success: true, error: null };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }
};

export const getUserProfile = async (userId) => {
  try {
    const docRef = doc(db, 'users', userId, 'profile', 'data');

    // Cache-first: return quickly if we already have it cached.
    try {
      const cached = await getDocFromCache(docRef);
      if (cached.exists()) {
        return { data: cached.data(), error: null, source: 'cache' };
      }
    } catch {
      // Cache miss is normal on first load; fall through to server.
    }

    const docSnap = await withTimeout(getDoc(docRef));

    if (docSnap.exists()) {
      return { data: docSnap.data(), error: null, source: 'server' };
    } else {
      return { data: null, error: 'Profile not found', source: 'server' };
    }
  } catch (error) {
    console.error('Error getting user profile:', error);

    // If network is blocked/offline, attempt cache one more time.
    if (isLikelyBlockedOrOffline(error)) {
      try {
        const docRef = doc(db, 'users', userId, 'profile', 'data');
        const cached = await getDocFromCache(docRef);
        if (cached.exists()) {
          return { data: cached.data(), error: null, source: 'cache' };
        }
      } catch {
        // ignore
      }
    }

    return { data: null, error: error.message, source: 'error' };
  }
};

export const updateUserProfile = async (userId, updates) => {
  try {
    // Use setDoc with merge to create or update the document
    await setDoc(doc(db, 'users', userId, 'profile', 'data'), {
      ...updates,
      updatedAt: Timestamp.now()
    }, { merge: true });
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: error.message };
  }
};

// Habit Operations
export const addHabit = async (userId, habitData) => {
  try {
    const habitRef = doc(collection(db, 'users', userId, 'habits'));
    await setDoc(habitRef, {
      ...habitData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return { id: habitRef.id, success: true, error: null };
  } catch (error) {
    console.error('Error adding habit:', error);
    return { id: null, success: false, error: error.message };
  }
};

export const getUserHabits = async (userId) => {
  try {
    const habitsCol = collection(db, 'users', userId, 'habits');

    // Cache-first
    try {
      const cached = await getDocsFromCache(habitsCol);
      const habits = [];
      cached.forEach((d) => habits.push({ id: d.id, ...d.data() }));
      if (habits.length > 0) {
        return { data: habits, error: null, source: 'cache' };
      }
    } catch {
      // cache miss -> server
    }

    const querySnapshot = await withTimeout(getDocs(habitsCol));
    const habits = [];
    querySnapshot.forEach((d) => habits.push({ id: d.id, ...d.data() }));

    return { data: habits, error: null, source: 'server' };
  } catch (error) {
    console.error('Error getting habits:', error);

    if (isLikelyBlockedOrOffline(error)) {
      try {
        const habitsCol = collection(db, 'users', userId, 'habits');
        const cached = await getDocsFromCache(habitsCol);
        const habits = [];
        cached.forEach((d) => habits.push({ id: d.id, ...d.data() }));
        return { data: habits, error: null, source: 'cache' };
      } catch {
        // ignore
      }
    }

    return { data: [], error: error.message, source: 'error' };
  }
};

export const updateHabit = async (userId, habitId, updates) => {
  try {
    await updateDoc(doc(db, 'users', userId, 'habits', habitId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating habit:', error);
    return { success: false, error: error.message };
  }
};

export const deleteHabit = async (userId, habitId) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'habits', habitId));
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting habit:', error);
    return { success: false, error: error.message };
  }
};

// Habit Completion Operations
export const logHabitCompletion = async (userId, habitId, completionData = {}) => {
  try {
    const completionRef = doc(collection(db, 'users', userId, 'completions'));
    await setDoc(completionRef, {
      habitId,
      completedAt: Timestamp.now(),
      progress: completionData.progress || 100,
      ...completionData
    });
    return { id: completionRef.id, success: true, error: null };
  } catch (error) {
    console.error('Error logging completion:', error);
    return { id: null, success: false, error: error.message };
  }
};

export const getHabitCompletions = async (userId, habitId, startDate = null, endDate = null) => {
  try {
    const constraints = [
      where('habitId', '==', habitId)
    ];

    // Add date filters if provided
    if (startDate) {
      constraints.push(where('completedAt', '>=', Timestamp.fromDate(startDate instanceof Date ? startDate : new Date(startDate))));
    }
    if (endDate) {
      constraints.push(where('completedAt', '<=', Timestamp.fromDate(endDate instanceof Date ? endDate : new Date(endDate))));
    }

    // Add orderBy (must come after where clauses)
    constraints.push(orderBy('completedAt', 'desc'));

    const q = query(
      collection(db, 'users', userId, 'completions'),
      ...constraints
    );

    // Cache-first
    try {
      const cached = await getDocsFromCache(q);
      const completions = [];
      cached.forEach((d) => completions.push({ id: d.id, ...d.data() }));
      if (completions.length > 0) {
        return { data: completions, error: null, source: 'cache' };
      }
    } catch {
      // cache miss -> server
    }

    const querySnapshot = await withTimeout(getDocs(q));
    const completions = [];

    querySnapshot.forEach((d) => {
      completions.push({ id: d.id, ...d.data() });
    });

    return { data: completions, error: null, source: 'server' };
  } catch (error) {
    console.error('Error getting completions:', error);

    if (isLikelyBlockedOrOffline(error)) {
      try {
        const constraints = [where('habitId', '==', habitId)];
        if (startDate) {
          constraints.push(where('completedAt', '>=', Timestamp.fromDate(startDate instanceof Date ? startDate : new Date(startDate))));
        }
        if (endDate) {
          constraints.push(where('completedAt', '<=', Timestamp.fromDate(endDate instanceof Date ? endDate : new Date(endDate))));
        }
        constraints.push(orderBy('completedAt', 'desc'));

        const q = query(collection(db, 'users', userId, 'completions'), ...constraints);
        const cached = await getDocsFromCache(q);
        const completions = [];
        cached.forEach((d) => completions.push({ id: d.id, ...d.data() }));
        return { data: completions, error: null, source: 'cache' };
      } catch {
        // ignore
      }
    }

    return { data: [], error: error.message, source: 'error' };
  }
};

export const getAllCompletions = async (userId, startDate = null, endDate = null) => {
  try {
    const constraints = [];

    // Add date filters if provided
    if (startDate) {
      constraints.push(where('completedAt', '>=', Timestamp.fromDate(startDate instanceof Date ? startDate : new Date(startDate))));
    }
    if (endDate) {
      constraints.push(where('completedAt', '<=', Timestamp.fromDate(endDate instanceof Date ? endDate : new Date(endDate))));
    }

    // Add orderBy (must come after where clauses)
    constraints.push(orderBy('completedAt', 'desc'));

    const q = query(
      collection(db, 'users', userId, 'completions'),
      ...constraints
    );

    // Cache-first
    try {
      const cached = await getDocsFromCache(q);
      const completions = [];
      cached.forEach((d) => completions.push({ id: d.id, ...d.data() }));
      if (completions.length > 0) {
        return { data: completions, error: null, source: 'cache' };
      }
    } catch {
      // cache miss -> server
    }

    const querySnapshot = await withTimeout(getDocs(q));
    const completions = [];

    querySnapshot.forEach((d) => {
      completions.push({ id: d.id, ...d.data() });
    });

    return { data: completions, error: null, source: 'server' };
  } catch (error) {
    console.error('Error getting all completions:', error);

    if (isLikelyBlockedOrOffline(error)) {
      try {
        const constraints = [];
        if (startDate) {
          constraints.push(where('completedAt', '>=', Timestamp.fromDate(startDate instanceof Date ? startDate : new Date(startDate))));
        }
        if (endDate) {
          constraints.push(where('completedAt', '<=', Timestamp.fromDate(endDate instanceof Date ? endDate : new Date(endDate))));
        }
        constraints.push(orderBy('completedAt', 'desc'));

        const q = query(collection(db, 'users', userId, 'completions'), ...constraints);
        const cached = await getDocsFromCache(q);
        const completions = [];
        cached.forEach((d) => completions.push({ id: d.id, ...d.data() }));
        return { data: completions, error: null, source: 'cache' };
      } catch {
        // ignore
      }
    }

    return { data: [], error: error.message, source: 'error' };
  }
};

export const deleteCompletion = async (userId, completionId) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'completions', completionId));
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting completion:', error);
    return { success: false, error: error.message };
  }
};

// Weekly Review Operations
export const saveWeeklyReview = async (userId, reviewData) => {
  try {
    // Use deterministic doc ID based on week and year to enable updates
    const docId = `${reviewData.year}-week-${reviewData.weekNumber}`;
    const reviewRef = doc(db, 'users', userId, 'reviews', docId);
    await setDoc(reviewRef, {
      ...reviewData,
      updatedAt: Timestamp.now()
    }, { merge: true });
    return { id: docId, success: true, error: null };
  } catch (error) {
    console.error('Error saving review:', error);
    return { id: null, success: false, error: error.message };
  }
};

export const getWeeklyReview = async (userId, year, weekNumber) => {
  try {
    const docId = `${year}-week-${weekNumber}`;
    const docRef = doc(db, 'users', userId, 'reviews', docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
    } else {
      return { data: null, error: null };
    }
  } catch (error) {
    console.error('Error getting weekly review:', error);
    return { data: null, error: error.message };
  }
};

export const getWeeklyReviews = async (userId) => {
  try {
    const reviewsRef = collection(db, 'users', userId, 'reviews');
    const q = query(reviewsRef, orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const reviews = [];

    querySnapshot.forEach((doc) => {
      reviews.push({ id: doc.id, ...doc.data() });
    });

    return { data: reviews, error: null };
  } catch (error) {
    console.error('Error getting reviews:', error);
    return { data: [], error: error.message };
  }
};

// Bad Habit Operations
export const saveBadHabit = async (userId, badHabitData) => {
  try {
    const badHabitRef = doc(collection(db, 'users', userId, 'badHabits'));
    await setDoc(badHabitRef, {
      ...badHabitData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return { id: badHabitRef.id, success: true, error: null };
  } catch (error) {
    console.error('Error saving bad habit:', error);
    return { id: null, success: false, error: error.message };
  }
};

export const getBadHabits = async (userId) => {
  try {
    const badHabitsRef = collection(db, 'users', userId, 'badHabits');

    // Cache-first
    try {
      const cached = await getDocsFromCache(badHabitsRef);
      const badHabits = [];
      cached.forEach((doc) => {
        badHabits.push({ id: doc.id, ...doc.data() });
      });
      if (badHabits.length > 0) {
        return { data: badHabits, error: null, source: 'cache' };
      }
    } catch {
      // cache miss -> server
    }

    const querySnapshot = await withTimeout(getDocs(badHabitsRef));
    const badHabits = [];

    querySnapshot.forEach((doc) => {
      badHabits.push({ id: doc.id, ...doc.data() });
    });

    return { data: badHabits, error: null, source: 'server' };
  } catch (error) {
    console.error('Error getting bad habits:', error);

    if (isLikelyBlockedOrOffline(error)) {
      try {
        const badHabitsRef = collection(db, 'users', userId, 'badHabits');
        const cached = await getDocsFromCache(badHabitsRef);
        const badHabits = [];
        cached.forEach((doc) => {
          badHabits.push({ id: doc.id, ...doc.data() });
        });
        return { data: badHabits, error: null, source: 'cache' };
      } catch {
        // ignore
      }
    }

    return { data: [], error: error.message, source: 'error' };
  }
};

export const logBadHabitLapse = async (userId, badHabitId) => {
  try {
    const badHabitRef = doc(db, 'users', userId, 'badHabits', badHabitId);

    // Use arrayUnion to atomically add the lapse timestamp
    // This prevents race conditions when multiple relapses are logged simultaneously
    await updateDoc(badHabitRef, {
      lapses: arrayUnion(Timestamp.now()),
      updatedAt: Timestamp.now()
    });

    return { success: true, error: null };
  } catch (error) {
    console.error('Error logging bad habit lapse:', error);
    // Handle case where document doesn't exist
    if (error.code === 'not-found') {
      return { success: false, error: 'Bad habit not found' };
    }
    return { success: false, error: error.message };
  }
};

// Environment Strategy Operations
export const saveEnvironmentStrategy = async (userId, identityName, strategyData) => {
  try {
    const docId = identityName.toLowerCase().replace(/\s+/g, '-');
    const stratRef = doc(db, 'users', userId, 'environmentStrategies', docId);
    await setDoc(stratRef, {
      identityName,
      ...strategyData,
      updatedAt: Timestamp.now()
    }, { merge: true });
    return { success: true, error: null };
  } catch (error) {
    console.error('Error saving environment strategy:', error);
    return { success: false, error: error.message };
  }
};

export const getEnvironmentStrategies = async (userId) => {
  try {
    const stratCol = collection(db, 'users', userId, 'environmentStrategies');
    try {
      const cached = await getDocsFromCache(stratCol);
      const strategies = [];
      cached.forEach((d) => strategies.push({ id: d.id, ...d.data() }));
      if (strategies.length > 0) {
        return { data: strategies, error: null, source: 'cache' };
      }
    } catch { /* cache miss */ }

    const querySnapshot = await withTimeout(getDocs(stratCol));
    const strategies = [];
    querySnapshot.forEach((d) => strategies.push({ id: d.id, ...d.data() }));
    return { data: strategies, error: null, source: 'server' };
  } catch (error) {
    console.error('Error getting environment strategies:', error);
    return { data: [], error: error.message, source: 'error' };
  }
};
