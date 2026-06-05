import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signOutUser, db } from '../config/firebase';
import { firestoreService } from '../services/firestoreService';
import { dbService } from '../services/dbService';
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

const HabitsContext = createContext(null);

export const LEVELS = [
  { level: 1, name: "Seedling", minVotes: 0 },
  { level: 2, name: "Sprout", minVotes: 25 },
  { level: 3, name: "Grower", minVotes: 75 },
  { level: 4, name: "Contender", minVotes: 150 },
  { level: 5, name: "Atomic", minVotes: 300 },
  { level: 6, name: "1% Machine", minVotes: 600 },
  { level: 7, name: "Compounding", minVotes: 1200 },
  { level: 8, name: "Identity Locked", minVotes: 2500 },
];

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

export const HabitsProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [useLocalStorage, setUseLocalStorage] = useState(false);

  const [userProfile, setUserProfile] = useState({});
  const [identities, setIdentities] = useState([]);
  const [habits, setHabits] = useState([]);
  const [badHabits, setBadHabits] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [weeklyReviews, setWeeklyReviews] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const cleanupPerformedRef = useRef(false);

  // Client-Side Deduplication (memoized for UI and statistics calculations)
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

  // Local Storage Deduplication Startup
  const cleanupLocalStorageDuplicates = () => {
    try {
      const localIdentities = dbService.getIdentities();
      const seenIds = new Set();
      const uniqueIds = [];
      const identityMapping = {};
      
      localIdentities.forEach(item => {
        const name = (item.name || "").trim().toLowerCase();
        if (name && !seenIds.has(name)) {
          seenIds.add(name);
          uniqueIds.push(item);
          identityMapping[item.id] = item.id;
        } else if (name) {
          const kept = localIdentities.find(i => (i.name || "").trim().toLowerCase() === name);
          if (kept) identityMapping[item.id] = kept.id;
        }
      });
      localStorage.setItem('atomic_identities', JSON.stringify(uniqueIds));

      const localHabits = dbService.getHabits();
      const seenH = new Set();
      const uniqueH = [];
      localHabits.forEach(item => {
        const normTitle = (item.title || "").trim().toLowerCase();
        const normIdName = (item.identityName || "").trim().toLowerCase();
        const key = `${normTitle}_${normIdName}`;
        if (item.title && !seenH.has(key)) {
          seenH.add(key);
          const mappedId = identityMapping[item.identityId];
          if (mappedId) item.identityId = mappedId;
          uniqueH.push(item);
        }
      });
      localStorage.setItem('atomic_habits', JSON.stringify(uniqueH));

      const localBadHabits = dbService.getBadHabits();
      const seenBH = new Set();
      const uniqueBH = [];
      localBadHabits.forEach(item => {
        const normName = (item.name || "").trim().toLowerCase();
        const normIdName = (item.identityName || "").trim().toLowerCase();
        const key = `${normName}_${normIdName}`;
        if (item.name && !seenBH.has(key)) {
          seenBH.add(key);
          const mappedId = identityMapping[item.identityId];
          if (mappedId) item.identityId = mappedId;
          uniqueBH.push(item);
        }
      });
      localStorage.setItem('atomic_bad_habits', JSON.stringify(uniqueBH));

      const localReviews = dbService.getWeeklyReviews();
      const uniqueReviews = localReviews.filter(r => r.userId !== 'user_default' && !r.isSeed);
      localStorage.setItem('atomic_weekly_reviews', JSON.stringify(uniqueReviews));
    } catch (e) {
      console.error("LocalStorage duplicate cleanup failed:", e);
    }
  };

  useEffect(() => {
    cleanupLocalStorageDuplicates();
  }, []);

  // Fallback system helper
  const switchToLocalStorage = (reason = "") => {
    if (useLocalStorage) return;
    console.warn("Switching to LocalStorage fallback due to:", reason);
    setUseLocalStorage(true);
    
    toast.error("Cloud database unreachable. Switched to offline LocalStorage mode.", {
      id: "db-fallback-toast",
      duration: 5000
    });

    setUserProfile(dbService.getUserProfile());
    setIdentities(dbService.getIdentities());
    setHabits(dbService.getHabits());
    setBadHabits(dbService.getBadHabits());
    setCompletions(dbService.getCompletions());
    setWeeklyReviews(dbService.getWeeklyReviews());
    setAuthLoading(false);
  };

  // Reconcile/Sync Local Storage offline data up to Firestore
  const reconcileLocalDataToCloud = async (userId) => {
    if (localStorage.getItem('atomic_offline_edits') === 'true') {
      try {
        const localUserProfile = dbService.getUserProfile();
        const localIdentities = dbService.getIdentities();
        const localHabits = dbService.getHabits();
        const localBadHabits = dbService.getBadHabits();
        const localCompletions = dbService.getCompletions();
        const localWeeklyReviews = dbService.getWeeklyReviews();

        toast.loading("Syncing offline changes to cloud...", { id: "sync-toast" });

        // Reconcile user profile
        if (localUserProfile.totalVotes > 0 || localUserProfile.level > 1) {
          const userRef = doc(db, 'users', userId);
          await setDoc(userRef, {
            userId,
            level: localUserProfile.level || 1,
            totalVotes: localUserProfile.totalVotes || 0,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }

        // Reconcile identities
        // Reconcile identities
        for (const identity of localIdentities) {
          if (isSeedMock(identity)) continue;
          if (identity.id.startsWith('identity_')) {
            await firestoreService.saveIdentity(userId, identity);
          }
        }

        // Reconcile habits
        for (const habit of localHabits) {
          if (isSeedMock(habit)) continue;
          if (habit.id.startsWith('habit_')) {
            await firestoreService.saveHabit(userId, habit);
          }
        }

        // Reconcile bad habits
        for (const badHabit of localBadHabits) {
          if (isSeedMock(badHabit)) continue;
          if (badHabit.id.startsWith('badhabit_')) {
            await firestoreService.saveBadHabit(userId, badHabit);
          }
        }

        // Reconcile completions
        for (const completion of localCompletions) {
          if (isSeedMock(completion)) continue;
          if (completion.id.startsWith('completion_')) {
            const cleanCompletion = { ...completion, userId };
            await firestoreService.saveCompletionDirect(userId, cleanCompletion);
          }
        }

        // Reconcile weekly reviews
        for (const review of localWeeklyReviews) {
          if (isSeedMock(review)) continue;
          const cleanReview = { ...review, userId };
          await firestoreService.saveWeeklyReview(userId, cleanReview);
        }

        // Clear local edits flag and data
        localStorage.removeItem('atomic_offline_edits');
        dbService.clearAllData();
        
        toast.success("Offline changes synced successfully!", { id: "sync-toast" });
      } catch (err) {
        console.error("Error reconciling local data to Cloud:", err);
        toast.error("Cloud sync failed: " + err.message, { id: "sync-toast" });
      }
    }
  };

  const cleanupDuplicateFirestoreData = async (userId) => {
    try {
      console.log("Starting background database cleanup for user:", userId);

      // 1. Fetch all collections in parallel to speed things up
      const [identitiesSnap, habitsSnap, badHabitsSnap, completionsSnap, reviewsSnap] = await Promise.all([
        getDocs(collection(db, 'users', userId, 'identities')),
        getDocs(collection(db, 'users', userId, 'habits')),
        getDocs(collection(db, 'users', userId, 'badHabits')),
        getDocs(collection(db, 'users', userId, 'completions')),
        getDocs(collection(db, 'users', userId, 'weeklyReviews'))
      ]);

      const identityDocs = [];
      identitiesSnap.forEach(doc => identityDocs.push({ id: doc.id, ...doc.data() }));

      const habitDocs = [];
      habitsSnap.forEach(doc => habitDocs.push({ id: doc.id, ...doc.data() }));

      const badHabitDocs = [];
      badHabitsSnap.forEach(doc => badHabitDocs.push({ id: doc.id, ...doc.data() }));

      const completionDocs = [];
      completionsSnap.forEach(doc => completionDocs.push({ id: doc.id, ...doc.data() }));

      const reviewDocs = [];
      reviewsSnap.forEach(doc => reviewDocs.push({ id: doc.id, ...doc.data() }));

      // 2. Identities cleanup
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

      // 3. Habits cleanup
      const habitGroups = {};
      const habitsToDelete = [];
      const habitMapping = {};
      const habitsToUpdate = [];

      habitDocs.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      habitDocs.forEach(docData => {
        const normTitle = (docData.title || "").trim().toLowerCase();
        const normIdName = (docData.identityName || "").trim().toLowerCase();
        const key = `${normTitle}_${normIdName}`;
        if (!normTitle) return;

        if (!habitGroups[key]) {
          habitGroups[key] = docData;
          habitMapping[docData.id] = docData.id;

          const keptIdentity = identityGroups[normIdName];
          if (keptIdentity && docData.identityId !== keptIdentity.id) {
            habitsToUpdate.push({ id: docData.id, identityId: keptIdentity.id });
          }
        } else {
          habitsToDelete.push(docData);
          habitMapping[docData.id] = habitGroups[key].id;
        }
      });

      // 4. Bad Habits cleanup
      const badHabitGroups = {};
      const badHabitsToDelete = [];
      const badHabitMapping = {};
      const badHabitsToUpdate = [];

      badHabitDocs.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      badHabitDocs.forEach(docData => {
        const normName = (docData.name || "").trim().toLowerCase();
        const normIdName = (docData.identityName || "").trim().toLowerCase();
        const key = `${normName}_${normIdName}`;
        if (!normName) return;

        if (!badHabitGroups[key]) {
          badHabitGroups[key] = docData;
          badHabitMapping[docData.id] = docData.id;

          const keptIdentity = identityGroups[normIdName];
          if (keptIdentity && docData.identityId !== keptIdentity.id) {
            badHabitsToUpdate.push({ id: docData.id, identityId: keptIdentity.id });
          }
        } else {
          badHabitsToDelete.push(docData);
          badHabitMapping[docData.id] = badHabitGroups[key].id;
        }
      });

      // 5. Completions cleanup
      const completionGroups = {};
      const completionsToDelete = [];
      const completionsToUpdate = [];

      completionDocs.forEach(comp => {
        let needsUpdate = false;
        let newHabitId = comp.habitId;
        let newIdentityId = comp.identityId;

        if (habitMapping[comp.habitId] && habitMapping[comp.habitId] !== comp.habitId) {
          newHabitId = habitMapping[comp.habitId];
          needsUpdate = true;
        }
        if (identityIdMapping[comp.identityId] && identityIdMapping[comp.identityId] !== comp.identityId) {
          newIdentityId = identityIdMapping[comp.identityId];
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

      // 6. Reviews cleanup (seed reviews)
      const reviewsToDelete = reviewDocs.filter(r => r.userId === 'user_default' || r.isSeed === true);

      // Perform all deletions and updates concurrently via Promise.all
      const deletionPromises = [
        ...identitiesToDelete.map(i => deleteDoc(doc(db, 'users', userId, 'identities', i.id))),
        ...habitsToDelete.map(h => deleteDoc(doc(db, 'users', userId, 'habits', h.id))),
        ...badHabitsToDelete.map(bh => deleteDoc(doc(db, 'users', userId, 'badHabits', bh.id))),
        ...completionsToDelete.map(c => deleteDoc(doc(db, 'users', userId, 'completions', c.id))),
        ...reviewsToDelete.map(r => deleteDoc(doc(db, 'users', userId, 'weeklyReviews', r.id)))
      ];

      const updatePromises = [
        ...habitsToUpdate.map(h => setDoc(doc(db, 'users', userId, 'habits', h.id), { identityId: h.identityId }, { merge: true })),
        ...badHabitsToUpdate.map(bh => setDoc(doc(db, 'users', userId, 'badHabits', bh.id), { identityId: bh.identityId }, { merge: true })),
        ...completionsToUpdate.map(c => setDoc(doc(db, 'users', userId, 'completions', c.id), { habitId: c.habitId, identityId: c.identityId }, { merge: true }))
      ];

      console.log(`Executing deletions: ${deletionPromises.length} docs, updates: ${updatePromises.length} docs`);
      await Promise.all([...deletionPromises, ...updatePromises]);

      if (identitiesToDelete.length > 0 || habitsToDelete.length > 0 || badHabitsToDelete.length > 0 || completionsToDelete.length > 0 || reviewsToDelete.length > 0) {
        console.log(`Database optimized: ${identitiesToDelete.length + habitsToDelete.length + badHabitsToDelete.length + completionsToDelete.length + reviewsToDelete.length} duplicate/mock records cleaned up.`);
      }

      // 7. Recalculate total votes and update user profile
      const finalCompletionsCount = completionDocs.length - completionsToDelete.length;
      let activeLevel = 1;
      for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (finalCompletionsCount >= LEVELS[i].minVotes) {
          activeLevel = LEVELS[i].level;
          break;
        }
      }

      await setDoc(doc(db, 'users', userId), {
        totalVotes: finalCompletionsCount,
        level: activeLevel,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log("Firestore database cleanup completed successfully.");
    } catch (error) {
      console.error("Error during database cleanup:", error);
    }
  };

  // Auth State Listener and Firestore Data Syncer
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        if (useLocalStorage) {
          setUserProfile(dbService.getUserProfile());
          setIdentities(dbService.getIdentities());
          setHabits(dbService.getHabits());
          setBadHabits(dbService.getBadHabits());
          setCompletions(dbService.getCompletions());
          setWeeklyReviews(dbService.getWeeklyReviews());
          setAuthLoading(false);
          return;
        }

        setAuthLoading(true);
        let profileLoaded = false;
        let identitiesLoaded = false;
        let isFallbackActive = false;

        const checkLoadComplete = () => {
          if (profileLoaded && identitiesLoaded) {
            setAuthLoading(false);
            reconcileLocalDataToCloud(user.uid);
            if (!cleanupPerformedRef.current) {
              cleanupPerformedRef.current = true;
              cleanupDuplicateFirestoreData(user.uid);
            }
          }
        };

        let unsubProfile = () => {};
        let unsubIdentities = () => {};
        let unsubHabits = () => {};
        let unsubBadHabits = () => {};
        let unsubCompletions = () => {};
        let unsubReviews = () => {};

        const cleanUpCloudListeners = () => {
          unsubProfile();
          unsubIdentities();
          unsubHabits();
          unsubBadHabits();
          unsubCompletions();
          unsubReviews();
        };

        const handleSyncError = (err) => {
          console.error("Firestore sync error:", err);
          if (!isFallbackActive) {
            isFallbackActive = true;
            cleanUpCloudListeners();
            switchToLocalStorage(err.message || err);
          }
        };

        // 2.5-second safety timeout to guarantee the loading screen clears
        const safetyTimeout = setTimeout(() => {
          if (!profileLoaded || !identitiesLoaded) {
            console.warn("Firestore connection timed out. Falling back to LocalStorage.");
            if (!isFallbackActive) {
              isFallbackActive = true;
              cleanUpCloudListeners();
              switchToLocalStorage("Connection timeout");
            }
          }
        }, 2500);

        try {
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

          unsubHabits = firestoreService.subscribeHabits(user.uid, setHabits, handleSyncError);
          unsubBadHabits = firestoreService.subscribeBadHabits(user.uid, setBadHabits, handleSyncError);
          unsubCompletions = firestoreService.subscribeCompletions(user.uid, setCompletions, handleSyncError);
          unsubReviews = firestoreService.subscribeWeeklyReviews(user.uid, setWeeklyReviews, handleSyncError);
        } catch (e) {
          handleSyncError(e);
        }

        return () => {
          clearTimeout(safetyTimeout);
          cleanUpCloudListeners();
        };
      } else {
        // Logged out: Clear data state
        setUserProfile({});
        setIdentities([]);
        setHabits([]);
        setBadHabits([]);
        setCompletions([]);
        setWeeklyReviews([]);
        setAuthLoading(false);
        setUseLocalStorage(false);
        cleanupPerformedRef.current = false;
      }
    });

    return () => unsubscribeAuth();
  }, [useLocalStorage]);

  const logout = async () => {
    await signOutUser();
  };

  // --- Identity CRUD ---
  const addIdentity = async (name, beliefStatement) => {
    if (!currentUser) throw new Error("User must be authenticated to create an identity.");
    if (useLocalStorage) {
      localStorage.setItem('atomic_offline_edits', 'true');
      const res = dbService.saveIdentity({ name, beliefStatement });
      setIdentities(dbService.getIdentities());
      return res;
    }
    return await firestoreService.saveIdentity(currentUser.uid, { name, beliefStatement });
  };

  const updateIdentity = async (id, fields) => {
    if (!currentUser) return;
    if (useLocalStorage) {
      localStorage.setItem('atomic_offline_edits', 'true');
      dbService.updateIdentity(id, fields);
      setIdentities(dbService.getIdentities());
      setHabits(dbService.getHabits());
      setBadHabits(dbService.getBadHabits());
      setCompletions(dbService.getCompletions());
      return;
    }
    await firestoreService.updateIdentity(currentUser.uid, id, fields);
    
    // Cascade renames
    if (fields.name) {
      await firestoreService.cascadeIdentityRename(
        currentUser.uid, 
        id, 
        fields.name, 
        habits, 
        badHabits, 
        completions
      );
    }
  };

  const deleteIdentity = async (id) => {
    if (!currentUser) return;
    if (useLocalStorage) {
      localStorage.setItem('atomic_offline_edits', 'true');
      dbService.deleteIdentity(id);
      setIdentities(dbService.getIdentities());
      setHabits(dbService.getHabits());
      setBadHabits(dbService.getBadHabits());
      setCompletions(dbService.getCompletions());
      return;
    }
    await firestoreService.deleteIdentity(currentUser.uid, id);
    await firestoreService.cascadeIdentityDelete(
      currentUser.uid, 
      id, 
      habits, 
      badHabits, 
      completions
    );
  };

  // --- Habit CRUD ---
  const addHabit = async (habitFields) => {
    if (!currentUser) throw new Error("User must be authenticated to create a habit.");
    if (useLocalStorage) {
      localStorage.setItem('atomic_offline_edits', 'true');
      const res = dbService.saveHabit(habitFields);
      setHabits(dbService.getHabits());
      return res;
    }
    return await firestoreService.saveHabit(currentUser.uid, habitFields);
  };

  const updateHabit = async (id, fields) => {
    if (!currentUser) return;
    if (useLocalStorage) {
      localStorage.setItem('atomic_offline_edits', 'true');
      dbService.updateHabit(id, fields);
      setHabits(dbService.getHabits());
      return;
    }
    await firestoreService.updateHabit(currentUser.uid, id, fields);
  };

  const deleteHabit = async (id) => {
    if (!currentUser) return;
    if (useLocalStorage) {
      localStorage.setItem('atomic_offline_edits', 'true');
      dbService.deleteHabit(id);
      setHabits(dbService.getHabits());
      setCompletions(dbService.getCompletions());
      return;
    }
    await firestoreService.deleteHabit(currentUser.uid, id, completions);
  };

  // --- Bad Habit CRUD ---
  const addBadHabit = async (badHabitFields) => {
    if (!currentUser) return;
    if (useLocalStorage) {
      localStorage.setItem('atomic_offline_edits', 'true');
      const res = dbService.saveBadHabit(badHabitFields);
      setBadHabits(dbService.getBadHabits());
      return res;
    }
    return await firestoreService.saveBadHabit(currentUser.uid, badHabitFields);
  };

  const updateBadHabit = async (id, fields) => {
    if (!currentUser) return;
    if (useLocalStorage) {
      localStorage.setItem('atomic_offline_edits', 'true');
      dbService.updateBadHabit(id, fields);
      setBadHabits(dbService.getBadHabits());
      return;
    }
    await firestoreService.updateBadHabit(currentUser.uid, id, fields);
  };

  const deleteBadHabit = async (id) => {
    if (!currentUser) return;
    if (useLocalStorage) {
      localStorage.setItem('atomic_offline_edits', 'true');
      dbService.deleteBadHabit(id);
      setBadHabits(dbService.getBadHabits());
      return;
    }
    await firestoreService.deleteBadHabit(currentUser.uid, id);
  };

  const logRelapse = async (id, relapseFields) => {
    if (!currentUser) return;
    if (useLocalStorage) {
      localStorage.setItem('atomic_offline_edits', 'true');
      dbService.logRelapse(id, relapseFields);
      setBadHabits(dbService.getBadHabits());
      return;
    }
    const targetBadHabit = uniqueBadHabits.find(b => b.id === id);
    await firestoreService.logRelapse(currentUser.uid, id, { 
      ...relapseFields, 
      badHabit: targetBadHabit 
    });
  };

  // --- Completion CRUD ---
  const toggleCompletion = async (habitId, dateNormalized, isTwoMinVersion = false, notes = "") => {
    if (!currentUser) return;
    if (useLocalStorage) {
      localStorage.setItem('atomic_offline_edits', 'true');
      const res = dbService.toggleCompletion(habitId, dateNormalized, isTwoMinVersion, notes, currentUser.uid);
      setCompletions(dbService.getCompletions());
      setUserProfile(dbService.getUserProfile());
      return res;
    }
    const targetHabit = uniqueHabits.find(h => h.id === habitId);
    return await firestoreService.toggleCompletion(
      currentUser.uid,
      habitId,
      dateNormalized,
      isTwoMinVersion,
      notes,
      targetHabit,
      uniqueCompletions,
      userProfile.totalVotes || 0
    );
  };

  // --- Weekly Reviews CRUD ---
  const saveWeeklyReview = async (reviewFields) => {
    if (!currentUser) return;
    const cleanReview = { ...reviewFields, userId: currentUser.uid };
    if (useLocalStorage) {
      localStorage.setItem('atomic_offline_edits', 'true');
      const res = dbService.saveWeeklyReview(cleanReview);
      setWeeklyReviews(dbService.getWeeklyReviews());
      return res;
    }
    return await firestoreService.saveWeeklyReview(currentUser.uid, cleanReview);
  };

  // --- Stat Calculations ---
  const getIdentityStrength = (identityId) => {
    const idCompletions = uniqueCompletions.filter(c => c.identityId === identityId).length;
    const badHabitsForId = uniqueBadHabits.filter(b => b.identityId === identityId);
    const totalLapses = badHabitsForId.reduce((sum, bh) => sum + (bh.lapses ? bh.lapses.length : 0), 0);
    
    const denominator = idCompletions + totalLapses;
    if (denominator === 0) return 100;
    return Math.round((idCompletions / denominator) * 100);
  };

  const getDaysFree = (badHabit) => {
    if (!badHabit.lapses || badHabit.lapses.length === 0) {
      const createdDate = new Date(badHabit.createdAt || new Date());
      const diffTime = Math.abs(new Date() - createdDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    
    const sortedLapses = [...badHabit.lapses].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestLapse = new Date(sortedLapses[0].date);
    
    const today = new Date();
    if (latestLapse > today) return 0;
    
    const diffTime = Math.abs(today - latestLapse);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getLevelProgress = () => {
    const totalVotes = userProfile.totalVotes || 0;
    const currentLvl = userProfile.level || 1;
    
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
  };

  return (
    <HabitsContext.Provider value={{
      currentUser,
      authLoading,
      userProfile,
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
      logout
    }}>
      {children}
    </HabitsContext.Provider>
  );
};

export const useHabits = () => {
  const context = useContext(HabitsContext);
  if (!context) throw new Error("useHabits must be used within a HabitsProvider");
  return context;
};
