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
  writeBatch,
  query,
  where,
  runTransaction
} from 'firebase/firestore';

import { calculateLevelFromVotes } from '../utils/constants';

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
    // Limit to the last 365 days of completions
    const date = new Date();
    date.setDate(date.getDate() - 365);
    const oneYearAgoStr = date.toISOString().split('T')[0];
    
    const q = query(completionsRef, where('dateNormalized', '>=', oneYearAgoStr));
    return onSnapshot(q, (snapshot) => {
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
      totalVotes: 0,
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

  // --- HABIT CRUD ---

  saveHabit: async (userId, habit) => {
    const habitsRef = collection(db, 'users', userId, 'habits');
    const newDocRef = doc(habitsRef);
    const cleanHabit = { ...habit };
    delete cleanHabit.identityName; // Exclude identityName
    const data = {
      ...cleanHabit,
      createdAt: new Date().toISOString()
    };
    await setDoc(newDocRef, data);
    return { id: newDocRef.id, ...data };
  },

  updateHabit: async (userId, id, fields) => {
    const docRef = doc(db, 'users', userId, 'habits', id);
    const cleanFields = { ...fields };
    delete cleanFields.identityName; // Exclude identityName if passed
    await updateDoc(docRef, cleanFields);
  },

  deleteHabit: async (userId, id, completions, totalVotes) => {
    const deletes = [];

    // Find the habit's identityId
    const habitRef = doc(db, 'users', userId, 'habits', id);
    const habitSnap = await getDoc(habitRef);
    if (!habitSnap.exists()) return;
    const habitData = habitSnap.data();
    const identityId = habitData.identityId;

    // 1. Delete Habit
    deletes.push(habitRef);

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

    // 4. Update parent Identity votes
    if (identityId) {
      const identityRef = doc(db, 'users', userId, 'identities', identityId);
      const identitySnap = await getDoc(identityRef);
      if (identitySnap.exists()) {
        const identityVotes = identitySnap.data().totalVotes || 0;
        await updateDoc(identityRef, {
          totalVotes: Math.max(0, identityVotes - deletedCompletionsCount)
        });
      }
    }
  },

  // --- BAD HABIT CRUD ---

  saveBadHabit: async (userId, badHabit) => {
    const badHabitsRef = collection(db, 'users', userId, 'badHabits');
    const newDocRef = doc(badHabitsRef);
    const cleanBadHabit = { ...badHabit };
    delete cleanBadHabit.identityName; // Exclude identityName
    const data = {
      ...cleanBadHabit,
      lapses: [],
      createdAt: new Date().toISOString()
    };
    await setDoc(newDocRef, data);
    return { id: newDocRef.id, ...data };
  },

  updateBadHabit: async (userId, id, fields) => {
    const docRef = doc(db, 'users', userId, 'badHabits', id);
    const cleanFields = { ...fields };
    delete cleanFields.identityName; // Exclude identityName if passed
    await updateDoc(docRef, cleanFields);
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

  toggleCompletion: async (userId, habitId, dateNormalized, isTwoMinVersion, notes) => {
    const compDocRef = doc(db, 'users', userId, 'completions', `${habitId}_${dateNormalized}`);
    const userProfileRef = doc(db, 'users', userId);
    const habitRef = doc(db, 'users', userId, 'habits', habitId);

    return await runTransaction(db, async (transaction) => {
      const compSnap = await transaction.get(compDocRef);
      const profileSnap = await transaction.get(userProfileRef);
      const habitSnap = await transaction.get(habitRef);

      if (!habitSnap.exists()) {
        throw new Error("Habit system does not exist or has been deleted.");
      }
      const habitData = habitSnap.data();

      // Get parent Identity reference
      const identityRef = doc(db, 'users', userId, 'identities', habitData.identityId);
      const identitySnap = await transaction.get(identityRef);

      let currentVotes = 0;
      if (profileSnap.exists()) {
        currentVotes = profileSnap.data().totalVotes || 0;
      }

      let identityVotes = 0;
      if (identitySnap.exists()) {
        identityVotes = identitySnap.data().totalVotes || 0;
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

        if (identitySnap.exists()) {
          transaction.update(identityRef, {
            totalVotes: Math.max(0, identityVotes - 1)
          });
        }

        return { status: 'removed' };
      } else {
        // Add completion
        const newCompletion = {
          userId,
          habitId,
          identityId: habitData.identityId,
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

        if (identitySnap.exists()) {
          transaction.update(identityRef, {
            totalVotes: identityVotes + 1
          });
        }

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
