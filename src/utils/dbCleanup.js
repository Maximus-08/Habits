import { db } from '../config/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  writeBatch, 
  setDoc 
} from 'firebase/firestore';

// Helper to identify seed/mock data
const isSeedMock = (item, id) => {
  if (!item) return false;
  const docId = id || item.id || "";
  return (
    docId === "id_athlete" ||
    docId === "id_writer" ||
    docId === "habit_workout" ||
    docId === "habit_write" ||
    docId === "bad_snack" ||
    docId === "bad_scroll" ||
    docId.startsWith("c_workout_") ||
    docId.startsWith("c_write_") ||
    item.userId === "user_default" ||
    item.isSeed === true
  );
};

// Heuristic to calculate level from votes
const calculateLevelFromVotes = (votes) => {
  if (votes >= 100) return 5;
  if (votes >= 50) return 4;
  if (votes >= 20) return 3;
  if (votes >= 5) return 2;
  return 1;
};

/**
 * Runs a complete scan and clean-up of the Firestore database for the specified user.
 * Deletes all seed data, duplicate records, and orphaned collections, and updates vote counters.
 * 
 * @param {string} userId - The authenticated user's UID.
 */
export const runDatabaseCleanup = async (userId) => {
  if (!userId) {
    console.error("[Cleanup] Cannot run cleanup: userId is required.");
    return { success: false, error: "userId is required" };
  }

  console.log(`%c[Cleanup] Starting database diagnostics & purge for user: ${userId}...`, "color: #ff9800; font-weight: bold;");

  try {
    // 1. Fetch all documents from all user subcollections
    console.log("[Cleanup] Fetching documents from Firestore...");
    
    const [identitiesSnap, habitsSnap, badHabitsSnap, completionsSnap, reviewsSnap] = await Promise.all([
      getDocs(collection(db, 'users', userId, 'identities')),
      getDocs(collection(db, 'users', userId, 'habits')),
      getDocs(collection(db, 'users', userId, 'badHabits')),
      getDocs(collection(db, 'users', userId, 'completions')),
      getDocs(collection(db, 'users', userId, 'weeklyReviews'))
    ]);

    const rawIdentities = identitiesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const rawHabits = habitsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const rawBadHabits = badHabitsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const rawCompletions = completionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const rawReviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log(`[Cleanup] Scanned document counts:
    - Identities: ${rawIdentities.length}
    - Habits: ${rawHabits.length}
    - Bad Habits: ${rawBadHabits.length}
    - Completions: ${rawCompletions.length}
    - Weekly Reviews: ${rawReviews.length}`);

    const deletes = [];
    const updates = [];

    // --- IDENTITIES CLEANUP ---
    const identityGroups = {};
    const keptIdentities = [];

    rawIdentities.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    rawIdentities.forEach(identity => {
      if (isSeedMock(identity, identity.id)) {
        deletes.push({ type: 'identity', id: identity.id, name: identity.name, reason: 'seed data' });
        return;
      }

      const normName = (identity.name || "").trim().toLowerCase();
      if (!normName) {
        deletes.push({ type: 'identity', id: identity.id, name: 'Untitled', reason: 'empty name' });
        return;
      }

      if (!identityGroups[normName]) {
        identityGroups[normName] = identity;
        keptIdentities.push(identity);
      } else {
        deletes.push({ type: 'identity', id: identity.id, name: identity.name, reason: 'duplicate name' });
      }
    });

    const keptIdentityIds = new Set(keptIdentities.map(i => i.id));

    // --- HABITS CLEANUP ---
    const habitGroups = {};
    const keptHabits = [];

    rawHabits.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    rawHabits.forEach(habit => {
      if (isSeedMock(habit, habit.id)) {
        deletes.push({ type: 'habit', id: habit.id, name: habit.title, reason: 'seed data' });
        return;
      }

      // Check for orphan
      if (!keptIdentityIds.has(habit.identityId)) {
        deletes.push({ type: 'habit', id: habit.id, name: habit.title, reason: 'orphaned (no parent identity)' });
        return;
      }

      const normTitle = (habit.title || "").trim().toLowerCase();
      const key = `${normTitle}_${habit.identityId}`;
      if (!normTitle) {
        deletes.push({ type: 'habit', id: habit.id, name: 'Untitled', reason: 'empty title' });
        return;
      }

      if (!habitGroups[key]) {
        habitGroups[key] = habit;
        keptHabits.push(habit);
      } else {
        deletes.push({ type: 'habit', id: habit.id, name: habit.title, reason: 'duplicate title' });
      }
    });

    const keptHabitIds = new Set(keptHabits.map(h => h.id));

    // --- BAD HABITS CLEANUP ---
    const badHabitGroups = {};
    const keptBadHabits = [];

    rawBadHabits.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    rawBadHabits.forEach(bh => {
      if (isSeedMock(bh, bh.id)) {
        deletes.push({ type: 'badHabit', id: bh.id, name: bh.name, reason: 'seed data' });
        return;
      }

      // Check for orphan
      if (!keptIdentityIds.has(bh.identityId)) {
        deletes.push({ type: 'badHabit', id: bh.id, name: bh.name, reason: 'orphaned (no parent identity)' });
        return;
      }

      const normName = (bh.name || "").trim().toLowerCase();
      const key = `${normName}_${bh.identityId}`;
      if (!normName) {
        deletes.push({ type: 'badHabit', id: bh.id, name: 'Untitled', reason: 'empty name' });
        return;
      }

      if (!badHabitGroups[key]) {
        badHabitGroups[key] = bh;
        keptBadHabits.push(bh);
      } else {
        deletes.push({ type: 'badHabit', id: bh.id, name: bh.name, reason: 'duplicate name' });
      }
    });

    // --- COMPLETIONS CLEANUP ---
    const completionGroups = {};
    const keptCompletions = [];

    rawCompletions.forEach(comp => {
      if (isSeedMock(comp, comp.id)) {
        deletes.push({ type: 'completion', id: comp.id, name: comp.dateNormalized, reason: 'seed data' });
        return;
      }

      // Check for orphans
      if (!keptHabitIds.has(comp.habitId) || !keptIdentityIds.has(comp.identityId)) {
        deletes.push({ type: 'completion', id: comp.id, name: comp.dateNormalized, reason: 'orphaned (missing habit or identity)' });
        return;
      }

      const key = `${comp.habitId}_${comp.dateNormalized}`;
      if (!completionGroups[key]) {
        completionGroups[key] = comp;
        keptCompletions.push(comp);
      } else {
        deletes.push({ type: 'completion', id: comp.id, name: comp.dateNormalized, reason: 'duplicate completion date' });
      }
    });

    // --- WEEKLY REVIEWS CLEANUP ---
    const reviewGroups = {};
    rawReviews.forEach(review => {
      if (review.userId === 'user_default' || review.isSeed === true) {
        deletes.push({ type: 'weeklyReview', id: review.id, name: `Week ${review.weekNumber}`, reason: 'seed data' });
        return;
      }

      const key = `${review.year}-week-${review.weekNumber}`;
      if (!reviewGroups[key]) {
        reviewGroups[key] = review;
      } else {
        deletes.push({ type: 'weeklyReview', id: review.id, name: `Week ${review.weekNumber}`, reason: 'duplicate review' });
      }
    });

    // --- RECALCULATE VOTE COUNTS ---
    console.log("[Cleanup] Recalculating aggregated vote counts...");
    
    // Count completions per identity
    const identityVotes = {};
    keptIdentities.forEach(i => { identityVotes[i.id] = 0; });
    
    keptCompletions.forEach(c => {
      if (identityVotes[c.identityId] !== undefined) {
        identityVotes[c.identityId]++;
      }
    });

    // Queue updates for identities to add/update totalVotes
    keptIdentities.forEach(identity => {
      const votes = identityVotes[identity.id] || 0;
      if (identity.totalVotes !== votes) {
        updates.push({
          ref: doc(db, 'users', userId, 'identities', identity.id),
          data: { totalVotes: votes },
          description: `Update votes for identity "${identity.name}" to ${votes}`
        });
      }
    });

    // Queue update for user profile
    const finalCompletionsCount = keptCompletions.length;
    const finalLevel = calculateLevelFromVotes(finalCompletionsCount);
    updates.push({
      ref: doc(db, 'users', userId),
      data: {
        totalVotes: finalCompletionsCount,
        level: finalLevel,
        lastOptimizedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      description: `Update user profile: totalVotes=${finalCompletionsCount}, level=${finalLevel}`
    });

    // --- COMMIT WRITE BATCHES ---
    const totalOps = deletes.length + updates.length;
    console.log(`[Cleanup] Diagnosed ${deletes.length} deletes and ${updates.length} updates needed.`);

    if (totalOps === 0) {
      console.log("%c[Cleanup] Database is already clean! No actions required.", "color: #4caf50; font-weight: bold;");
      try {
        await setDoc(doc(db, 'users', userId), {
          lastOptimizedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn("[Cleanup] Failed to update lastOptimizedAt:", err);
      }
      return { success: true, deletes: 0, updates: 0 };
    }

    console.log(`[Cleanup] Executing ${totalOps} database modifications in chunked batches...`);

    // Prepare list of operations
    const operations = [];
    deletes.forEach(d => {
      let path = '';
      if (d.type === 'identity') path = `users/${userId}/identities/${d.id}`;
      if (d.type === 'habit') path = `users/${userId}/habits/${d.id}`;
      if (d.type === 'badHabit') path = `users/${userId}/badHabits/${d.id}`;
      if (d.type === 'completion') path = `users/${userId}/completions/${d.id}`;
      if (d.type === 'weeklyReview') path = `users/${userId}/weeklyReviews/${d.id}`;
      
      operations.push({
        type: 'delete',
        ref: doc(db, path),
        log: `Delete ${d.type} "${d.name}" (ID: ${d.id}) -> Reason: ${d.reason}`
      });
    });

    updates.forEach(u => {
      operations.push({
        type: 'update',
        ref: u.ref,
        data: u.data,
        log: u.description
      });
    });

    // Chunk size 400
    const chunkSize = 400;
    let committedDeletes = 0;
    let committedUpdates = 0;

    for (let i = 0; i < operations.length; i += chunkSize) {
      const chunk = operations.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      chunk.forEach(op => {
        if (op.type === 'delete') {
          batch.delete(op.ref);
          committedDeletes++;
        } else if (op.type === 'update') {
          batch.update(op.ref, op.data);
          committedUpdates++;
        }
      });

      await batch.commit();
      console.log(`[Cleanup] Committed batch ${Math.floor(i / chunkSize) + 1} (${chunk.length} operations)`);
    }

    console.log(`%c[Cleanup] Database cleanup completed successfully!
    - Deleted: ${committedDeletes} documents
    - Updated: ${committedUpdates} documents`, "color: #4caf50; font-weight: bold;");

    return { success: true, deletes: committedDeletes, updates: committedUpdates };

  } catch (error) {
    console.error("%c[Cleanup] Critical error during database cleanup:", "color: #f44336; font-weight: bold;", error);
    return { success: false, error: error.message };
  }
};
