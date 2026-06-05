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
  query,
  runTransaction
} from 'firebase/firestore';

import { LEVELS, calculateLevelFromVotes } from '../utils/constants';

export const firestoreService = {
  // --- REAL-TIME SUBSCRIBERS ---

  ensureUserProfile: async (userId) => {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const initialProfile = {
        userId,
        level: 1,
        totalVotes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(userRef, initialProfile);
      return initialProfile;
    }
    return snap.data();
  },

  subscribeUserProfile: (userId, callback, onError) => {
    const userRef = doc(db, 'users', userId);
    return onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
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
  },

  deleteIdentityAtomic: async (userId, identityId, habits, badHabits, completions, totalVotes) => {
    const deletes = [];

    // 1. Delete the identity document
    deletes.push(doc(db, 'users', userId, 'identities', identityId));

    // 2. Delete all linked habits
    habits.forEach(h => {
      if (h.identityId === identityId) {
        deletes.push(doc(db, 'users', userId, 'habits', h.id));
      }
    });

    // 3. Delete all linked bad habits
    badHabits.forEach(b => {
      if (b.identityId === identityId) {
        deletes.push(doc(db, 'users', userId, 'badHabits', b.id));
      }
    });

    // 4. Delete all linked completions and calculate votes to subtract
    let deletedCompletionsCount = 0;
    completions.forEach(c => {
      if (c.identityId === identityId) {
        deletes.push(doc(db, 'users', userId, 'completions', c.id));
        deletedCompletionsCount++;
      }
    });

    // Commit deletions in chunks of 400 to prevent hitting Firestore batch limit
    const chunkSize = 400;
    for (let i = 0; i < deletes.length; i += chunkSize) {
      const chunk = deletes.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach(ref => {
        batch.delete(ref);
      });
      await batch.commit();
    }

    // 5. Update user profile votes & level
    const newVotes = Math.max(0, totalVotes - deletedCompletionsCount);
    const newLevel = calculateLevelFromVotes(newVotes);

    const userProfileRef = doc(db, 'users', userId);
    await updateDoc(userProfileRef, {
      totalVotes: newVotes,
      level: newLevel,
      updatedAt: new Date().toISOString()
    });
  },

  cascadeIdentityRename: async (userId, identityId, newName, habits, badHabits, completions) => {
    const updates = [];

    habits.forEach(h => {
      if (h.identityId === identityId) {
        updates.push({
          ref: doc(db, 'users', userId, 'habits', h.id),
          data: { identityName: newName }
        });
      }
    });

    badHabits.forEach(b => {
      if (b.identityId === identityId) {
        updates.push({
          ref: doc(db, 'users', userId, 'badHabits', b.id),
          data: { identityName: newName }
        });
      }
    });

    // We intentionally do not loop over and update completions on rename.
    // Completions don't display identityName and only use identityId.

    const chunkSize = 400;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach(op => {
        batch.update(op.ref, op.data);
      });
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

  deleteHabit: async (userId, id, completions, totalVotes) => {
    const deletes = [];

    // 1. Delete Habit
    deletes.push(doc(db, 'users', userId, 'habits', id));

    // 2. Delete all linked completions and calculate votes to subtract
    let deletedCompletionsCount = 0;
    completions.forEach(c => {
      if (c.habitId === id) {
        deletes.push(doc(db, 'users', userId, 'completions', c.id));
        deletedCompletionsCount++;
      }
    });

    // Commit deletions in chunks of 400
    const chunkSize = 400;
    for (let i = 0; i < deletes.length; i += chunkSize) {
      const chunk = deletes.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach(ref => {
        batch.delete(ref);
      });
      await batch.commit();
    }

    // 3. Update user profile votes & level
    const newVotes = Math.max(0, totalVotes - deletedCompletionsCount);
    const newLevel = calculateLevelFromVotes(newVotes);

    const userProfileRef = doc(db, 'users', userId);
    await updateDoc(userProfileRef, {
      totalVotes: newVotes,
      level: newLevel,
      updatedAt: new Date().toISOString()
    });
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

  toggleCompletion: async (userId, habitId, dateNormalized, isTwoMinVersion, notes, habit) => {
    const compDocRef = doc(db, 'users', userId, 'completions', `${habitId}_${dateNormalized}`);
    const userProfileRef = doc(db, 'users', userId);

    return await runTransaction(db, async (transaction) => {
      const compSnap = await transaction.get(compDocRef);
      const profileSnap = await transaction.get(userProfileRef);

      let currentVotes = 0;
      if (profileSnap.exists()) {
        currentVotes = profileSnap.data().totalVotes || 0;
      }

      if (compSnap.exists()) {
        // Remove completion
        transaction.delete(compDocRef);
        
        const newVotes = Math.max(0, currentVotes - 1);
        const newLevel = calculateLevelFromVotes(newVotes);
        transaction.update(userProfileRef, {
          totalVotes: newVotes,
          level: newLevel,
          updatedAt: new Date().toISOString()
        });
        return { status: 'removed' };
      } else {
        // Add completion
        const newCompletion = {
          userId,
          habitId,
          identityId: habit.identityId,
          completedAt: new Date().toISOString(),
          dateNormalized,
          isTwoMinVersion: isTwoMinVersion || false,
          notes: notes || ""
        };
        transaction.set(compDocRef, newCompletion);

        const newVotes = currentVotes + 1;
        const newLevel = calculateLevelFromVotes(newVotes);
        transaction.update(userProfileRef, {
          totalVotes: newVotes,
          level: newLevel,
          updatedAt: new Date().toISOString()
        });
        return { status: 'added', completion: { id: compDocRef.id, ...newCompletion } };
      }
    });
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
