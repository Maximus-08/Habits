import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signOutUser, db } from '../config/firebase';
import { firestoreService } from '../services/firestoreService';
import { doc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { getLocalDateString } from '../utils/dateUtils';

const HabitsContext = createContext(null);

import { LEVELS, calculateLevelFromVotes } from '../utils/constants';
export { LEVELS };

const isSeedMock = (item) => {
  if (!item) return false;
  const id = item.id || "";
  return (
    id === "id_athlete" ||
    id === "id_writer" ||
    id === "habit_workout" ||
    id === "habit_write" ||
    id === "bad_snack" ||
    id === "bad_scroll" ||
    id.startsWith("c_workout_") ||
    id.startsWith("c_write_") ||
    item.userId === "user_default" ||
    item.isSeed === true
  );
};

const withTimeout = (promise, ms = 4000) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Connection timed out. Database quota may be exceeded or offline."));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
};

export const HabitsProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [isCleaningUp, setIsCleaningUpState] = useState(false);
  const isCleaningUpRef = useRef(false);
  const setIsCleaningUp = useCallback((val) => {
    isCleaningUpRef.current = val;
    setIsCleaningUpState(val);
  }, []);

  const [userProfile, setUserProfile] = useState({});
  const [identities, setIdentities] = useState([]);
  const [habits, setHabits] = useState([]);
  const [badHabits, setBadHabits] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [weeklyReviews, setWeeklyReviews] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const cleanupPerformedRef = useRef(false);

  // Client-Side Deduplication & Seed Mock Filtering
  const uniqueIdentities = useMemo(() => {
    const seen = new Set();
    const unique = [];
    identities.forEach(item => {
      if (isSeedMock(item)) return;
      const name = (item.name || "").trim().toLowerCase();
      if (name && !seen.has(name)) {
        seen.add(name);
        unique.push(item);
      }
    });
    return unique;
  }, [identities]);

  const uniqueHabits = useMemo(() => {
    const seen = new Set();
    const unique = [];
    habits.forEach(item => {
      if (isSeedMock(item)) return;
      const key = `${(item.title || "").trim().toLowerCase()}_${(item.identityName || "").trim().toLowerCase()}`;
      if (item.title && !seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });
    return unique;
  }, [habits]);

  const uniqueBadHabits = useMemo(() => {
    const seen = new Set();
    const unique = [];
    badHabits.forEach(item => {
      if (isSeedMock(item)) return;
      const key = `${(item.name || "").trim().toLowerCase()}_${(item.identityName || "").trim().toLowerCase()}`;
      if (item.name && !seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });
    return unique;
  }, [badHabits]);

  const uniqueWeeklyReviews = useMemo(() => {
    const seen = new Set();
    const unique = [];
    weeklyReviews.forEach(item => {
      if (isSeedMock(item)) return;
      const key = item.id || `${item.year}-${item.weekNumber}`;
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });
    return unique;
  }, [weeklyReviews]);

  const uniqueCompletions = useMemo(() => {
    const seen = new Set();
    const unique = [];
    completions.forEach(item => {
      if (isSeedMock(item)) return;
      const key = `${item.habitId || ''}_${item.dateNormalized || ''}`;
      if (item.habitId && !seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });
    return unique;
  }, [completions]);

  const cleanupDuplicateFirestoreData = useCallback(async (userId, currentData, dryRun = false) => {
    if (isCleaningUpRef.current) return;
    setIsCleaningUp(true);
    try {
      console.log("Starting self-healing database cleanup for user:", userId, dryRun ? "[DRY RUN]" : "");

      const {
        identities: identityDocs = [],
        habits: habitDocs = [],
        badHabits: badHabitDocs = [],
        completions: completionDocs = [],
        weeklyReviews: reviewDocs = []
      } = currentData || {};

      // 1. Identities cleanup and building identity ID mapping
      const identityGroups = {};
      const identitiesToDelete = [];
      const identityIdMapping = {};

      identityDocs.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      identityDocs.forEach(docData => {
        const normName = (docData.name || "").trim().toLowerCase();
        if (!normName) return;
        if (!identityGroups[normName]) {
          identityGroups[normName] = docData;
          identityIdMapping[docData.id] = docData.id;
        } else {
          identitiesToDelete.push(docData);
          identityIdMapping[docData.id] = identityGroups[normName].id;
        }
      });

      // Keep track of active/valid identity IDs
      const keptIdentityIds = new Set(
        identityDocs
          .filter(i => !identitiesToDelete.some(itd => itd.id === i.id))
          .map(i => i.id)
      );

      // 2. Habits cleanup (deduplication + orphan removal)
      const habitGroups = {};
      const habitsToDelete = [];
      const habitMapping = {};
      const habitsToUpdate = [];

      habitDocs.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      habitDocs.forEach(docData => {
        // Remap identityId to its canonical form if mapped
        if (identityIdMapping[docData.identityId]) {
          const canonicalId = identityIdMapping[docData.identityId];
          if (docData.identityId !== canonicalId) {
            docData.identityId = canonicalId;
            docData._identityIdChanged = true;
          }
        }

        // If the identity it belongs to does not exist, it is orphaned and must be deleted
        if (!keptIdentityIds.has(docData.identityId)) {
          habitsToDelete.push(docData);
          return;
        }

        const normTitle = (docData.title || "").trim().toLowerCase();
        const normIdName = (docData.identityName || "").trim().toLowerCase();
        const key = `${normTitle}_${normIdName}`;
        if (!normTitle) return;

        if (!habitGroups[key]) {
          habitGroups[key] = docData;
          habitMapping[docData.id] = docData.id;

          const keptIdentity = identityGroups[normIdName];
          if (keptIdentity && docData.identityId !== keptIdentity.id) {
            docData.identityId = keptIdentity.id;
            docData._identityIdChanged = true;
          }
          if (docData._identityIdChanged) {
            habitsToUpdate.push({ id: docData.id, identityId: docData.identityId });
          }
        } else {
          habitsToDelete.push(docData);
          habitMapping[docData.id] = habitGroups[key].id;
        }
      });

      // 3. Bad Habits cleanup (deduplication + orphan removal)
      const badHabitGroups = {};
      const badHabitsToDelete = [];
      const badHabitMapping = {};
      const badHabitsToUpdate = [];

      badHabitDocs.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      badHabitDocs.forEach(docData => {
        // Remap identityId to its canonical form if mapped
        if (identityIdMapping[docData.identityId]) {
          const canonicalId = identityIdMapping[docData.identityId];
          if (docData.identityId !== canonicalId) {
            docData.identityId = canonicalId;
            docData._identityIdChanged = true;
          }
        }

        // If the identity it belongs to does not exist, it is orphaned and must be deleted
        if (!keptIdentityIds.has(docData.identityId)) {
          badHabitsToDelete.push(docData);
          return;
        }

        const normName = (docData.name || "").trim().toLowerCase();
        const normIdName = (docData.identityName || "").trim().toLowerCase();
        const key = `${normName}_${normIdName}`;
        if (!normName) return;

        if (!badHabitGroups[key]) {
          badHabitGroups[key] = docData;
          badHabitMapping[docData.id] = docData.id;

          const keptIdentity = identityGroups[normIdName];
          if (keptIdentity && docData.identityId !== keptIdentity.id) {
            docData.identityId = keptIdentity.id;
            docData._identityIdChanged = true;
          }
          if (docData._identityIdChanged) {
            badHabitsToUpdate.push({ id: docData.id, identityId: docData.identityId });
          }
        } else {
          badHabitsToDelete.push(docData);
          badHabitMapping[docData.id] = badHabitGroups[key].id;
        }
      });

      // 4. Completions cleanup (deduplication + orphan removal)
      const completionGroups = {};
      const completionsToDelete = [];
      const completionsToUpdate = [];

      completionDocs.forEach(comp => {
        // Remap identityId to its canonical form if mapped
        if (identityIdMapping[comp.identityId]) {
          const canonicalId = identityIdMapping[comp.identityId];
          if (comp.identityId !== canonicalId) {
            comp.identityId = canonicalId;
            comp._identityIdChanged = true;
          }
        }

        // If the identity it belongs to does not exist, it is orphaned and must be deleted
        if (!keptIdentityIds.has(comp.identityId)) {
          completionsToDelete.push(comp);
          return;
        }

        let needsUpdate = comp._identityIdChanged || false;
        let newHabitId = comp.habitId;
        let newIdentityId = comp.identityId;

        if (habitMapping[comp.habitId] && habitMapping[comp.habitId] !== comp.habitId) {
          newHabitId = habitMapping[comp.habitId];
          needsUpdate = true;
        }

        const key = `${newHabitId}_${comp.dateNormalized}`;
        if (!completionGroups[key]) {
          completionGroups[key] = comp;
          if (needsUpdate) {
            completionsToUpdate.push({ id: comp.id, habitId: newHabitId, identityId: newIdentityId });
          }
        } else {
          completionsToDelete.push(comp);
        }
      });

      // 5. Reviews cleanup
      const reviewsToDelete = reviewDocs.filter(r => r.userId === 'user_default' || r.isSeed === true);

      // 6. Build and commit operations in chunked batches
      const operations = [];
      identitiesToDelete.forEach(i => operations.push({ type: 'delete', ref: doc(db, 'users', userId, 'identities', i.id) }));
      habitsToDelete.forEach(h => operations.push({ type: 'delete', ref: doc(db, 'users', userId, 'habits', h.id) }));
      badHabitsToDelete.forEach(bh => operations.push({ type: 'delete', ref: doc(db, 'users', userId, 'badHabits', bh.id) }));
      completionsToDelete.forEach(c => operations.push({ type: 'delete', ref: doc(db, 'users', userId, 'completions', c.id) }));
      reviewsToDelete.forEach(r => operations.push({ type: 'delete', ref: doc(db, 'users', userId, 'weeklyReviews', r.id) }));

      habitsToUpdate.forEach(h => operations.push({ type: 'update', ref: doc(db, 'users', userId, 'habits', h.id), data: { identityId: h.identityId } }));
      badHabitsToUpdate.forEach(bh => operations.push({ type: 'update', ref: doc(db, 'users', userId, 'badHabits', bh.id), data: { identityId: bh.identityId } }));
      completionsToUpdate.forEach(c => operations.push({ type: 'update', ref: doc(db, 'users', userId, 'completions', c.id), data: { habitId: c.habitId, identityId: c.identityId } }));

      if (dryRun) {
        console.log("[Database Cleanup] [DRY RUN] Skipping actual writes.");
      } else {
        const chunkSize = 400;
        for (let i = 0; i < operations.length; i += chunkSize) {
          const chunk = operations.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          chunk.forEach(op => {
            if (op.type === 'delete') {
              batch.delete(op.ref);
            } else if (op.type === 'update') {
              batch.update(op.ref, op.data);
            }
          });
          await batch.commit();
        }

        // Recalculate total votes and update user profile (excluding mock completions)
        const finalCompletionsCount = completionDocs.filter(c => !isSeedMock(c)).length - completionsToDelete.filter(c => !isSeedMock(c)).length;
        const activeLevel = calculateLevelFromVotes(finalCompletionsCount);

        await setDoc(doc(db, 'users', userId), {
          totalVotes: finalCompletionsCount,
          level: activeLevel,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        console.log("Firestore database cleanup completed successfully.");
      }
    } catch (error) {
      console.error("Error during database cleanup:", error);
      throw error;
    } finally {
      setIsCleaningUp(false);
    }
  }, [setIsCleaningUp]);

  // Auth State Listener and Firestore Data Syncer
  useEffect(() => {
    let safetyTimeout = null;
    let unsubProfile = null;
    let unsubIdentities = null;
    let unsubHabits = null;
    let unsubBadHabits = null;
    let unsubCompletions = null;
    let unsubReviews = null;

    const cleanUpCloudListeners = () => {
      if (unsubProfile) unsubProfile();
      if (unsubIdentities) unsubIdentities();
      if (unsubHabits) unsubHabits();
      if (unsubBadHabits) unsubBadHabits();
      if (unsubCompletions) unsubCompletions();
      if (unsubReviews) unsubReviews();

      unsubProfile = null;
      unsubIdentities = null;
      unsubHabits = null;
      unsubBadHabits = null;
      unsubCompletions = null;
      unsubReviews = null;
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setDbError(false);

      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
        safetyTimeout = null;
      }
      cleanUpCloudListeners();

      if (user) {
        setAuthLoading(true);
        let profileLoaded = false;
        let identitiesLoaded = false;
        let habitsLoaded = false;
        let isFallbackActive = false;

        const checkLoadComplete = () => {
          if (profileLoaded && identitiesLoaded && habitsLoaded) {
            setAuthLoading(false);
          }
        };

        const handleSyncError = (err) => {
          console.error("Firestore error:", err);
          if (!isFallbackActive) {
            isFallbackActive = true;
            cleanUpCloudListeners();
            setDbError(true);
            setAuthLoading(false);
            toast.error("Database connection failed. Operating in offline error mode.");
          }
        };

        // 5.0-second safety timeout to guarantee the loading screen clears
        safetyTimeout = setTimeout(() => {
          if (!profileLoaded || !identitiesLoaded) {
            console.warn("Firestore connection timed out.");
            setAuthLoading(false);
            toast("Working offline / slow connection...", { icon: '📶' });
          }
        }, 5000);

        firestoreService.ensureUserProfile(user.uid)
          .then(() => {
            unsubProfile = firestoreService.subscribeUserProfile(
              user.uid, 
              (data) => {
                setUserProfile(data);
                profileLoaded = true;
                checkLoadComplete();
              }, 
              handleSyncError
            );

            unsubIdentities = firestoreService.subscribeIdentities(
              user.uid, 
              (data) => {
                setIdentities(data);
                identitiesLoaded = true;
                checkLoadComplete();
              }, 
              handleSyncError
            );

            unsubHabits = firestoreService.subscribeHabits(user.uid, (data) => {
                setHabits(data);
                habitsLoaded = true;
                checkLoadComplete();
            }, handleSyncError);
            unsubBadHabits = firestoreService.subscribeBadHabits(user.uid, setBadHabits, handleSyncError);
            unsubCompletions = firestoreService.subscribeCompletions(user.uid, setCompletions, handleSyncError);
            unsubReviews = firestoreService.subscribeWeeklyReviews(user.uid, setWeeklyReviews, handleSyncError);
          })
          .catch(handleSyncError);
      } else {
        // Logged out: Clear data state
        setUserProfile({});
        setIdentities([]);
        setHabits([]);
        setBadHabits([]);
        setCompletions([]);
        setWeeklyReviews([]);
        setAuthLoading(false);
        cleanupPerformedRef.current = false;
      }
    });

    return () => {
      unsubscribeAuth();
      if (safetyTimeout) clearTimeout(safetyTimeout);
      cleanUpCloudListeners();
    };
  }, [cleanupDuplicateFirestoreData]);
 
  // Background self-healing database optimization
  useEffect(() => {
    if (!currentUser || authLoading || isCleaningUpRef.current || cleanupPerformedRef.current) return;

    // Check if raw data arrays mismatch with unique deduplicated arrays
    const keptIdentityIds = new Set(uniqueIdentities.map(i => i.id));
    const hasDuplicates = (
      identities.length !== uniqueIdentities.length ||
      habits.length !== uniqueHabits.length ||
      badHabits.length !== uniqueBadHabits.length ||
      completions.length !== uniqueCompletions.length
    );
    const hasOrphans = (
      habits.some(h => !isSeedMock(h) && !keptIdentityIds.has(h.identityId)) ||
      badHabits.some(bh => !isSeedMock(bh) && !keptIdentityIds.has(bh.identityId)) ||
      completions.some(c => !isSeedMock(c) && !keptIdentityIds.has(c.identityId))
    );

    if (hasDuplicates || hasOrphans) {
      cleanupPerformedRef.current = true;
      cleanupDuplicateFirestoreData(currentUser.uid, {
        identities: [...identities],
        habits: [...habits],
        badHabits: [...badHabits],
        completions: [...completions],
        weeklyReviews: [...weeklyReviews]
      }).catch(err => {
        console.warn("Database self-healing skipped/failed:", err);
      });
    }
  }, [currentUser, authLoading, identities, uniqueIdentities, habits, uniqueHabits, badHabits, uniqueBadHabits, completions, uniqueCompletions, weeklyReviews, cleanupDuplicateFirestoreData]);

  // Ensure atomic onboarding is flagged only after both identity and a habit are created
  useEffect(() => {
    if (currentUser && uniqueIdentities.length > 0 && uniqueHabits.length > 0) {
      localStorage.setItem(`atomic_onboarded_${currentUser.uid}`, 'true');
    }
  }, [currentUser, uniqueIdentities, uniqueHabits]);

  // --- Memoized Precomputations ---

  const identityStrengths = useMemo(() => {
    const result = {};
    uniqueIdentities.forEach(identity => {
      const idCompletions = uniqueCompletions.filter(c => c.identityId === identity.id).length;
      const badHabitsForId = uniqueBadHabits.filter(b => b.identityId === identity.id);
      const totalLapses = badHabitsForId.reduce((sum, bh) => sum + (bh.lapses ? bh.lapses.length : 0), 0);
      
      const denominator = idCompletions + totalLapses;
      result[identity.id] = denominator === 0 ? 100 : Math.round((idCompletions / denominator) * 100);
    });
    return result;
  }, [uniqueIdentities, uniqueCompletions, uniqueBadHabits]);

  const identityLevelProgressMap = useMemo(() => {
    const result = {};
    uniqueIdentities.forEach(identity => {
      const totalVotes = uniqueCompletions.filter(c => c.identityId === identity.id).length;
      
      let activeLevel = 1;
      for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (totalVotes >= LEVELS[i].minVotes) {
          activeLevel = LEVELS[i].level;
          break;
        }
      }
      
      const currentLevelMeta = LEVELS.find(l => l.level === activeLevel) || LEVELS[0];
      const nextLevelMeta = LEVELS.find(l => l.level === activeLevel + 1) || null;
      
      result[identity.id] = {
        currentLevel: activeLevel,
        currentName: currentLevelMeta.name,
        nextLevel: nextLevelMeta ? nextLevelMeta.level : null,
        nextName: nextLevelMeta ? nextLevelMeta.name : "",
        votesRemaining: nextLevelMeta ? nextLevelMeta.minVotes - totalVotes : 0,
        progressPercent: nextLevelMeta 
          ? Math.min(100, Math.max(0, Math.round(((totalVotes - currentLevelMeta.minVotes) / (nextLevelMeta.minVotes - currentLevelMeta.minVotes)) * 100)))
          : 100,
        votes: totalVotes
      };
    });
    return result;
  }, [uniqueIdentities, uniqueCompletions]);

  const daysFreeMap = useMemo(() => {
    const result = {};
    const today = new Date();
    uniqueBadHabits.forEach(bh => {
      if (!bh.lapses || bh.lapses.length === 0) {
        if (!bh.createdAt) {
          result[bh.id] = 0;
          return;
        }
        const createdDate = new Date(bh.createdAt);
        if (isNaN(createdDate.getTime())) {
          result[bh.id] = 0;
          return;
        }
        const diffTime = Math.abs(today - createdDate);
        result[bh.id] = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } else {
        const sortedLapses = [...bh.lapses]
          .map(l => ({ ...l, parsedDate: new Date(l.date) }))
          .filter(l => !isNaN(l.parsedDate.getTime()))
          .sort((a, b) => b.parsedDate - a.parsedDate);
        
        if (sortedLapses.length === 0) {
          if (!bh.createdAt) {
            result[bh.id] = 0;
            return;
          }
          const createdDate = new Date(bh.createdAt);
          if (isNaN(createdDate.getTime())) {
            result[bh.id] = 0;
            return;
          }
          const diffTime = Math.abs(today - createdDate);
          result[bh.id] = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return;
        }

        const latestLapse = sortedLapses[0].parsedDate;
        if (latestLapse > today) {
          result[bh.id] = 0;
        } else {
          const diffTime = Math.abs(today - latestLapse);
          result[bh.id] = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }
      }
    });
    return result;
  }, [uniqueBadHabits]);

  // --- Lookup Helpers ---

  const getIdentityStrength = useCallback((identityId) => {
    return identityStrengths[identityId] !== undefined ? identityStrengths[identityId] : 100;
  }, [identityStrengths]);

  const getIdentityLevelProgress = useCallback((identityId) => {
    if (identityLevelProgressMap[identityId]) {
      return identityLevelProgressMap[identityId];
    }
    const firstLevel = LEVELS[0];
    return {
      currentLevel: 1,
      currentName: firstLevel.name,
      nextLevel: LEVELS[1] ? LEVELS[1].level : null,
      nextName: LEVELS[1] ? LEVELS[1].name : "",
      votesRemaining: LEVELS[1] ? LEVELS[1].minVotes : 0,
      progressPercent: 0,
      votes: 0
    };
  }, [identityLevelProgressMap]);

  const getDaysFree = useCallback((badHabit) => {
    if (!badHabit || !badHabit.id) return 0;
    return daysFreeMap[badHabit.id] !== undefined ? daysFreeMap[badHabit.id] : 0;
  }, [daysFreeMap]);

  const getLevelProgress = useCallback(() => {
    const totalVotes = uniqueCompletions.length;
    const currentLvl = calculateLevelFromVotes(totalVotes);
    
    const currentLevelMeta = LEVELS.find(l => l.level === currentLvl) || LEVELS[0];
    const nextLevelMeta = LEVELS.find(l => l.level === currentLvl + 1) || null;
    
    if (!nextLevelMeta) {
      return {
        currentLevel: currentLvl,
        currentName: currentLevelMeta.name,
        nextLevel: null,
        nextName: "",
        votesRemaining: 0,
        progressPercent: 100,
        minVotes: currentLevelMeta.minVotes
      };
    }
    
    const levelRange = nextLevelMeta.minVotes - currentLevelMeta.minVotes;
    const votesInCurrentLevel = totalVotes - currentLevelMeta.minVotes;
    const progressPercent = Math.min(100, Math.max(0, Math.round((votesInCurrentLevel / levelRange) * 100)));
    
    return {
      currentLevel: currentLvl,
      currentName: currentLevelMeta.name,
      nextLevel: nextLevelMeta.level,
      nextName: nextLevelMeta.name,
      votesRemaining: nextLevelMeta.minVotes - totalVotes,
      progressPercent,
      minVotes: currentLevelMeta.minVotes,
      maxVotes: nextLevelMeta.minVotes
    };
  }, [uniqueCompletions]);

  const logout = useCallback(async () => {
    setCurrentUser(null);
    setUserProfile({});
    setIdentities([]);
    setHabits([]);
    setBadHabits([]);
    setCompletions([]);
    setWeeklyReviews([]);
    await signOutUser();
  }, []);

  // --- Identity CRUD ---
  const addIdentity = useCallback(async (name, beliefStatement) => {
    if (!currentUser) throw new Error("User must be authenticated to create an identity.");
    const res = await withTimeout(firestoreService.saveIdentity(currentUser.uid, { name, beliefStatement }));
    return res;
  }, [currentUser]);

  const updateIdentity = useCallback(async (id, fields) => {
    if (!currentUser) return;
    await withTimeout(firestoreService.updateIdentity(currentUser.uid, id, fields));
    
    // Cascade renames
    if (fields.name) {
      await withTimeout(firestoreService.cascadeIdentityRename(
        currentUser.uid, 
        id, 
        fields.name, 
        habits, 
        badHabits, 
        completions
      ));
    }
  }, [currentUser, habits, badHabits, completions]);

  const deleteIdentity = useCallback(async (id) => {
    if (!currentUser) return;
    await withTimeout(firestoreService.deleteIdentityAtomic(
      currentUser.uid,
      id,
      habits,
      badHabits,
      completions,
      uniqueCompletions.length
    ));
  }, [currentUser, habits, badHabits, completions, uniqueCompletions.length]);

  // --- Habit CRUD ---
  const addHabit = useCallback(async (habitFields) => {
    if (!currentUser) throw new Error("User must be authenticated to create a habit.");
    return await withTimeout(firestoreService.saveHabit(currentUser.uid, habitFields));
  }, [currentUser]);

  const updateHabit = useCallback(async (id, fields) => {
    if (!currentUser) return;
    await withTimeout(firestoreService.updateHabit(currentUser.uid, id, fields));
  }, [currentUser]);

  const deleteHabit = useCallback(async (id) => {
    if (!currentUser) return;
    await withTimeout(firestoreService.deleteHabit(
      currentUser.uid,
      id,
      completions,
      uniqueCompletions.length
    ));
  }, [currentUser, completions, uniqueCompletions.length]);

  // --- Bad Habit CRUD ---
  const addBadHabit = useCallback(async (badHabitFields) => {
    if (!currentUser) return;
    return await withTimeout(firestoreService.saveBadHabit(currentUser.uid, badHabitFields));
  }, [currentUser]);

  const updateBadHabit = useCallback(async (id, fields) => {
    if (!currentUser) return;
    await withTimeout(firestoreService.updateBadHabit(currentUser.uid, id, fields));
  }, [currentUser]);

  const deleteBadHabit = useCallback(async (id) => {
    if (!currentUser) return;
    await withTimeout(firestoreService.deleteBadHabit(currentUser.uid, id));
  }, [currentUser]);

  const logRelapse = useCallback(async (id, relapseFields) => {
    if (!currentUser) return;
    const targetBadHabit = uniqueBadHabits.find(b => b.id === id);
    await withTimeout(firestoreService.logRelapse(currentUser.uid, id, { 
      ...relapseFields, 
      badHabit: targetBadHabit 
    }));
  }, [currentUser, uniqueBadHabits]);

  // --- Completion CRUD ---
  const toggleCompletion = useCallback(async (habitId, dateNormalized, isTwoMinVersion = false, notes = "") => {
    if (!currentUser) return;
    const targetHabit = uniqueHabits.find(h => h.id === habitId);
    return await withTimeout(firestoreService.toggleCompletion(
      currentUser.uid,
      habitId,
      dateNormalized,
      isTwoMinVersion,
      notes,
      targetHabit
    ));
  }, [currentUser, uniqueHabits]);

  // --- Weekly Reviews CRUD ---
  const saveWeeklyReview = useCallback(async (reviewFields) => {
    if (!currentUser) return;
    const cleanReview = { ...reviewFields, userId: currentUser.uid };
    return await withTimeout(firestoreService.saveWeeklyReview(currentUser.uid, cleanReview));
  }, [currentUser]);

  const contextValue = useMemo(() => ({
    currentUser,
    authLoading,
    dbError,
    isCleaningUp,
    userProfile: {
      ...userProfile,
      totalVotes: uniqueCompletions.length,
      level: calculateLevelFromVotes(uniqueCompletions.length)
    },
    identities: uniqueIdentities,
    habits: uniqueHabits,
    badHabits: uniqueBadHabits,
    completions: uniqueCompletions,
    weeklyReviews: uniqueWeeklyReviews,
    selectedDate,
    setSelectedDate,
    addIdentity,
    updateIdentity,
    deleteIdentity,
    addHabit,
    updateHabit,
    deleteHabit,
    addBadHabit,
    updateBadHabit,
    deleteBadHabit,
    logRelapse,
    toggleCompletion,
    saveWeeklyReview,
    getIdentityStrength,
    getDaysFree,
    getLevelProgress,
    getIdentityLevelProgress,
    logout
  }), [
    currentUser,
    authLoading,
    dbError,
    isCleaningUp,
    userProfile,
    uniqueIdentities,
    uniqueHabits,
    uniqueBadHabits,
    uniqueCompletions,
    uniqueWeeklyReviews,
    selectedDate,
    setSelectedDate,
    addIdentity,
    updateIdentity,
    deleteIdentity,
    addHabit,
    updateHabit,
    deleteHabit,
    addBadHabit,
    updateBadHabit,
    deleteBadHabit,
    logRelapse,
    toggleCompletion,
    saveWeeklyReview,
    getIdentityStrength,
    getDaysFree,
    getLevelProgress,
    getIdentityLevelProgress,
    logout
  ]);

  return (
    <HabitsContext.Provider value={contextValue}>
      {children}
    </HabitsContext.Provider>
  );
};

export const useHabits = () => {
  const context = useContext(HabitsContext);
  if (!context) throw new Error("useHabits must be used within a HabitsProvider");
  return context;
};
