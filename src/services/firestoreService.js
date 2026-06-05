import { 
  db 
} from '../config/firebase';
import { 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  addDoc,
  writeBatch,
  query
} from 'firebase/firestore';

const LEVELS = [
  { level: 1, name: "Seedling", minVotes: 0 },
  { level: 2, name: "Sprout", minVotes: 25 },
  { level: 3, name: "Grower", minVotes: 75 },
  { level: 4, name: "Contender", minVotes: 150 },
  { level: 5, name: "Atomic", minVotes: 300 },
  { level: 6, name: "1% Machine", minVotes: 600 },
  { level: 7, name: "Compounding", minVotes: 1200 },
  { level: 8, name: "Identity Locked", minVotes: 2500 },
];

function calculateLevelFromVotes(totalVotes) {
  let activeLevel = 1;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalVotes >= LEVELS[i].minVotes) {
      activeLevel = LEVELS[i].level;
      break;
    }
  }
  return activeLevel;
}

export const firestoreService = {
  // --- REAL-TIME SUBSCRIBERS ---

  subscribeUserProfile: (userId, callback, onError) => {
    const userRef = doc(db, 'users', userId);
    return onSnapshot(userRef, async (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      } else {
        // Initialize new user profile document
        const initialProfile = {
          userId,
          level: 1,
          totalVotes: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(userRef, initialProfile);
        callback(initialProfile);
      }
    }, onError);
  },

  subscribeIdentities: (userId, callback, onError) => {
    const identitiesRef = collection(db, 'users', userId, 'identities');
    return onSnapshot(identitiesRef, (snapshot) => {
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      callback(items);
    }, onError);
  },

  subscribeHabits: (userId, callback, onError) => {
    const habitsRef = collection(db, 'users', userId, 'habits');
    return onSnapshot(habitsRef, (snapshot) => {
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      callback(items);
    }, onError);
  },

  subscribeBadHabits: (userId, callback, onError) => {
    const badHabitsRef = collection(db, 'users', userId, 'badHabits');
    return onSnapshot(badHabitsRef, (snapshot) => {
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      callback(items);
    }, onError);
  },

  subscribeCompletions: (userId, callback, onError) => {
    const completionsRef = collection(db, 'users', userId, 'completions');
    return onSnapshot(completionsRef, (snapshot) => {
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      callback(items);
    }, onError);
  },

  subscribeWeeklyReviews: (userId, callback, onError) => {
    const reviewsRef = collection(db, 'users', userId, 'weeklyReviews');
    return onSnapshot(reviewsRef, (snapshot) => {
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      callback(items);
    }, onError);
  },

  // --- IDENTITY CRUD ---

  saveIdentity: async (userId, identity) => {
    const identitiesRef = collection(db, 'users', userId, 'identities');
    const newDocRef = doc(identitiesRef);
    const data = {
      name: identity.name,
      beliefStatement: identity.beliefStatement,
      createdAt: new Date().toISOString()
    };
    await setDoc(newDocRef, data);
    return { id: newDocRef.id, ...data };
  },

  updateIdentity: async (userId, id, fields) => {
    const docRef = doc(db, 'users', userId, 'identities', id);
    await updateDoc(docRef, fields);

    // Cascade name changes if name changed
    if (fields.name) {
      const batch = writeBatch(db);
      
      // Habits update
      // Handled in client context loop for simplicity or database subqueries
    }
  },

  deleteIdentity: async (userId, id) => {
    // Delete the identity document
    const docRef = doc(db, 'users', userId, 'identities', id);
    await deleteDoc(docRef);
    
    // Cascading deletes should be run by context or batch
  },

  cascadeIdentityRename: async (userId, identityId, newName, habits, badHabits, completions) => {
    const batch = writeBatch(db);
    let changed = false;

    habits.forEach(h => {
      if (h.identityId === identityId) {
        const docRef = doc(db, 'users', userId, 'habits', h.id);
        batch.update(docRef, { identityName: newName });
        changed = true;
      }
    });

    badHabits.forEach(b => {
      if (b.identityId === identityId) {
        const docRef = doc(db, 'users', userId, 'badHabits', b.id);
        batch.update(docRef, { identityName: newName });
        changed = true;
      }
    });

    completions.forEach(c => {
      if (c.identityId === identityId) {
        const docRef = doc(db, 'users', userId, 'completions', c.id);
        batch.update(docRef, { identityName: newName });
        changed = true;
      }
    });

    if (changed) {
      await batch.commit();
    }
  },

  cascadeIdentityDelete: async (userId, identityId, habits, badHabits, completions) => {
    const batch = writeBatch(db);
    let changed = false;

    habits.forEach(h => {
      if (h.identityId === identityId) {
        batch.delete(doc(db, 'users', userId, 'habits', h.id));
        changed = true;
      }
    });

    badHabits.forEach(b => {
      if (b.identityId === identityId) {
        batch.delete(doc(db, 'users', userId, 'badHabits', b.id));
        changed = true;
      }
    });

    completions.forEach(c => {
      if (c.identityId === identityId) {
        batch.delete(doc(db, 'users', userId, 'completions', c.id));
        changed = true;
      }
    });

    if (changed) {
      await batch.commit();
    }
  },

  // --- HABIT CRUD ---

  saveHabit: async (userId, habit) => {
    const habitsRef = collection(db, 'users', userId, 'habits');
    const newDocRef = doc(habitsRef);
    const data = {
      ...habit,
      createdAt: new Date().toISOString()
    };
    await setDoc(newDocRef, data);
    return { id: newDocRef.id, ...data };
  },

  updateHabit: async (userId, id, fields) => {
    const docRef = doc(db, 'users', userId, 'habits', id);
    await updateDoc(docRef, fields);
  },

  deleteHabit: async (userId, id, completions) => {
    // Delete Habit
    await deleteDoc(doc(db, 'users', userId, 'habits', id));

    // Batch delete its completions
    const batch = writeBatch(db);
    let changed = false;
    completions.forEach(c => {
      if (c.habitId === id) {
        batch.delete(doc(db, 'users', userId, 'completions', c.id));
        changed = true;
      }
    });
    if (changed) await batch.commit();
  },

  // --- BAD HABIT CRUD ---

  saveBadHabit: async (userId, badHabit) => {
    const badHabitsRef = collection(db, 'users', userId, 'badHabits');
    const newDocRef = doc(badHabitsRef);
    const data = {
      ...badHabit,
      lapses: [],
      createdAt: new Date().toISOString()
    };
    await setDoc(newDocRef, data);
    return { id: newDocRef.id, ...data };
  },

  updateBadHabit: async (userId, id, fields) => {
    const docRef = doc(db, 'users', userId, 'badHabits', id);
    await updateDoc(docRef, fields);
  },

  deleteBadHabit: async (userId, id) => {
    await deleteDoc(doc(db, 'users', userId, 'badHabits', id));
  },

  logRelapse: async (userId, id, { triggerDetail, environmentAdjustment, date, badHabit }) => {
    const docRef = doc(db, 'users', userId, 'badHabits', id);
    const relapseDate = date || new Date().toISOString();
    const newLapse = {
      date: relapseDate,
      triggerDetail: triggerDetail || "No details provided.",
      environmentAdjustment: environmentAdjustment || ""
    };

    const lapses = [...(badHabit.lapses || []), newLapse];
    const fieldsToUpdate = { lapses };
    
    if (environmentAdjustment) {
      if (!badHabit.invisibleStrategy) {
        fieldsToUpdate.invisibleStrategy = environmentAdjustment;
      } else {
        fieldsToUpdate.difficultStrategy = environmentAdjustment;
      }
    }
    await updateDoc(docRef, fieldsToUpdate);
  },

  // --- COMPLETION VOTE SYSTEM ---

  toggleCompletion: async (userId, habitId, dateNormalized, isTwoMinVersion, notes, habit, completions, totalVotes) => {
    const existingIndex = completions.findIndex(
      c => c.habitId === habitId && c.dateNormalized === dateNormalized
    );

    const userProfileRef = doc(db, 'users', userId);

    if (existingIndex !== -1) {
      // Remove completion
      const compId = completions[existingIndex].id;
      await deleteDoc(doc(db, 'users', userId, 'completions', compId));
      
      // Decrement votes
      const newVotes = Math.max(0, totalVotes - 1);
      const newLevel = calculateLevelFromVotes(newVotes);
      await updateDoc(userProfileRef, { totalVotes: newVotes, level: newLevel, updatedAt: new Date().toISOString() });
      return { status: 'removed' };
    } else {
      // Add completion
      const completionsRef = collection(db, 'users', userId, 'completions');
      const newDocRef = doc(completionsRef);
      const newCompletion = {
        userId,
        habitId,
        identityId: habit.identityId,
        identityName: habit.identityName,
        completedAt: new Date().toISOString(),
        dateNormalized,
        isTwoMinVersion,
        notes
      };
      await setDoc(newDocRef, newCompletion);

      // Increment votes
      const newVotes = totalVotes + 1;
      const newLevel = calculateLevelFromVotes(newVotes);
      await updateDoc(userProfileRef, { totalVotes: newVotes, level: newLevel, updatedAt: new Date().toISOString() });
      return { status: 'added', completion: { id: newDocRef.id, ...newCompletion } };
    }
  },

  // --- WEEKLY REVIEW ---

  saveWeeklyReview: async (userId, review) => {
    const reviewId = review.id || `${review.year}-week-${review.weekNumber}`;
    const reviewRef = doc(db, 'users', userId, 'weeklyReviews', reviewId);
    const data = {
      ...review,
      id: reviewId,
      createdAt: review.createdAt || new Date().toISOString()
    };
    await setDoc(reviewRef, data);
    return data;
  },

  saveCompletionDirect: async (userId, completion) => {
    const completionsRef = collection(db, 'users', userId, 'completions');
    const docRef = doc(completionsRef, completion.id);
    await setDoc(docRef, completion);
  }
};
