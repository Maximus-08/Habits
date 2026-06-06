import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signOutUser } from '../config/firebase';
import { firestoreService } from '../services/firestoreService';
import { runDatabaseCleanup } from '../utils/dbCleanup';
import toast from 'react-hot-toast';
import { getLocalDateString } from '../utils/dateUtils';

const HabitsContext = createContext(null);

import { LEVELS, calculateLevelFromVotes } from '../utils/constants';
export { LEVELS };

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
  const [initialSyncCompleted, setInitialSyncCompleted] = useState(false);
  
  // Track cleanup loading state (from console triggers)
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const [userProfile, setUserProfile] = useState({});
  const [identities, setIdentities] = useState([]);
  const [habits, setHabits] = useState([]);
  const [badHabits, setBadHabits] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [weeklyReviews, setWeeklyReviews] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  
  // Ref to prevent unsubscribing & resubscribing on token refreshes or wake-ups
  const subscribedUserIdRef = useRef(null);

  // Client-Side Deduplication
  const uniqueIdentities = useMemo(() => {
    const seen = new Set();
    const unique = [];
    identities.forEach(item => {
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
      const key = `${(item.title || "").trim().toLowerCase()}_${item.identityId}`;
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
      const key = `${(item.name || "").trim().toLowerCase()}_${item.identityId}`;
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
      const key = `${item.habitId || ''}_${item.dateNormalized || ''}`;
      if (item.habitId && !seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });
    return unique;
  }, [completions]);

  // Auth State Listener and Firestore Data Syncer
  useEffect(() => {
    let active = true;
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
      if (user) {
        // Optimization: Do not recreate subscriptions if already listening to this user session
        if (subscribedUserIdRef.current === user.uid) {
          setCurrentUser(user);
          return;
        }

        subscribedUserIdRef.current = user.uid;
        setCurrentUser(user);
        setDbError(false);

        if (safetyTimeout) {
          clearTimeout(safetyTimeout);
          safetyTimeout = null;
        }
        cleanUpCloudListeners();

        setAuthLoading(true);
        let profileLoaded = false;
        let identitiesLoaded = false;
        let habitsLoaded = false;
        let isFallbackActive = false;

        const checkLoadComplete = () => {
          if (profileLoaded && identitiesLoaded && habitsLoaded) {
            setAuthLoading(false);
            setInitialSyncCompleted(true);
          }
        };

        const handleSyncError = (err) => {
          console.error("Firestore sync error:", err);
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
            if (!active) return;
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
        // Logged out: Clear data state and session ref
        subscribedUserIdRef.current = null;
        setCurrentUser(null);
        setUserProfile({});
        setIdentities([]);
        setHabits([]);
        setBadHabits([]);
        setCompletions([]);
        setWeeklyReviews([]);
        setAuthLoading(false);
        setInitialSyncCompleted(false);
      }
    });

    return () => {
      active = false;
      unsubscribeAuth();
      if (safetyTimeout) clearTimeout(safetyTimeout);
      cleanUpCloudListeners();
    };
  }, []);

  // Expose a database cleanup trigger function in the developer console
  useEffect(() => {
    if (currentUser) {
      window.runCleanup = async () => {
        if (isCleaningUp) {
          console.warn("[Cleanup] Cleanup task already in progress.");
          return;
        }
        setIsCleaningUp(true);
        try {
          const res = await runDatabaseCleanup(currentUser.uid);
          if (res && res.success) {
            toast.success(`Database optimized! Deleted ${res.deletes} documents, updated ${res.updates} documents.`);
          } else {
            toast.error(`Purge failed: ${res?.error || 'Unknown error'}`);
          }
        } catch (err) {
          console.error(err);
          toast.error("Cleanup runtime error.");
        } finally {
          setIsCleaningUp(false);
        }
      };
      console.log("%c[Cleanup] To clean seed data and optimize, type runCleanup() in your dev console.", "color: #2196f3; font-weight: bold;");
    } else {
      delete window.runCleanup;
    }
    return () => {
      delete window.runCleanup;
    };
  }, [currentUser, isCleaningUp]);

  // Trigger automated weekly cleanup on login
  useEffect(() => {
    if (currentUser && userProfile.createdAt && !sessionStorage.getItem(`db_cleaned_${currentUser.uid}`)) {
      const lastOpt = userProfile.lastOptimizedAt ? new Date(userProfile.lastOptimizedAt) : null;
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      if (!lastOpt || isNaN(lastOpt.getTime()) || lastOpt < oneWeekAgo) {
        sessionStorage.setItem(`db_cleaned_${currentUser.uid}`, 'true');
        console.log("[Cleanup] Triggering weekly automated database optimization...");
        runDatabaseCleanup(currentUser.uid).catch(err => {
          console.warn("[Cleanup] Automated cleanup failed:", err);
        });
      } else {
        sessionStorage.setItem(`db_cleaned_${currentUser.uid}`, 'true');
        console.log("[Cleanup] Database was optimized recently. Skipping automated cleanup.");
      }
    }
  }, [currentUser, userProfile]);

  // Ensure onboarding flag is set if user has setup data
  useEffect(() => {
    if (currentUser && uniqueIdentities.length > 0 && uniqueHabits.length > 0) {
      localStorage.setItem(`atomic_onboarded_${currentUser.uid}`, 'true');
    }
  }, [currentUser, uniqueIdentities, uniqueHabits]);

  // --- Memoized Precomputations ---

  const completionsIndex = useMemo(() => {
    const index = new Map();
    uniqueCompletions.forEach(c => {
      if (c.habitId) {
        if (!index.has(c.habitId)) {
          index.set(c.habitId, new Map());
        }
        index.get(c.habitId).set(c.dateNormalized, c);
      }
    });
    return index;
  }, [uniqueCompletions]);

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
      const totalVotes = identity.totalVotes || 0;
      
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
  }, [uniqueIdentities]);

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
    const totalVotes = userProfile.totalVotes || 0;
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
  }, [userProfile]);

  const logout = useCallback(async () => {
    subscribedUserIdRef.current = null;
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
    const isDuplicate = uniqueIdentities.some(i => i.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (isDuplicate) {
      throw new Error("An identity with this name already exists.");
    }
    const res = await withTimeout(firestoreService.saveIdentity(currentUser.uid, { name, beliefStatement }));
    return res;
  }, [currentUser, uniqueIdentities]);

  const updateIdentity = useCallback(async (id, fields) => {
    if (!currentUser) return;
    if (fields.name) {
      const isDuplicate = uniqueIdentities.some(i => i.id !== id && i.name.trim().toLowerCase() === fields.name.trim().toLowerCase());
      if (isDuplicate) {
        throw new Error("An identity with this name already exists.");
      }
    }
    await withTimeout(firestoreService.updateIdentity(currentUser.uid, id, fields));
  }, [currentUser, uniqueIdentities]);

  const deleteIdentity = useCallback(async (id) => {
    if (!currentUser) return;
    await withTimeout(firestoreService.deleteIdentityAtomic(
      currentUser.uid,
      id,
      habits,
      badHabits,
      completions,
      userProfile.totalVotes || 0
    ));
  }, [currentUser, habits, badHabits, completions, userProfile.totalVotes]);

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
      userProfile.totalVotes || 0
    ));
  }, [currentUser, completions, userProfile.totalVotes]);

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
    return await withTimeout(firestoreService.toggleCompletion(
      currentUser.uid,
      habitId,
      dateNormalized,
      isTwoMinVersion,
      notes
    ));
  }, [currentUser]);

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
    initialSyncCompleted,
    isCleaningUp,
    userProfile: {
      ...userProfile,
      totalVotes: userProfile.totalVotes || 0,
      level: userProfile.level || 1
    },
    identities: uniqueIdentities,
    habits: uniqueHabits,
    badHabits: uniqueBadHabits,
    completions: uniqueCompletions,
    completionsIndex,
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
    initialSyncCompleted,
    isCleaningUp,
    userProfile,
    uniqueIdentities,
    uniqueHabits,
    uniqueBadHabits,
    uniqueCompletions,
    completionsIndex,
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
