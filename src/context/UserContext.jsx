import { createContext, useContext, useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import * as firestoreService from '../services/firestoreService';
import { getTodaysCompletion } from '../utils/dateHelpers';
import { logAnalyticsEvent } from '../config/firebase';

const UserContext = createContext();
const DEFAULT_IDENTITY = 'The Athlete';

export function UserProvider({ children }) {
  const { user } = useAuth();
  const [identity, setIdentityState] = useState(DEFAULT_IDENTITY);
  const [habits, setHabitsState] = useState([]);
  const [allCompletions, setAllCompletions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadingUserRef = useRef(null); // Track which user we're loading data for
  const habitsRef = useRef([]); // Track latest habits for race condition prevention
  const completionsRef = useRef([]); // Track latest completions for race condition prevention

  const defaultHabitsTemplate = useRef([
    {
      title: 'Morning Run (5km)',
      description: 'Build endurance and clear the mind before work.',
      category: 'Morning • Cardio',
      time: '07:00 AM',
      location: 'The Park',
      stackedHabit: 'Drinking Coffee',
      twoMinRule: 'Put on running shoes',
      progress: null
    },
    {
      title: 'Drink 3L Water',
      description: 'Stay hydrated for optimal cognitive function.',
      category: 'All Day • Health',
      time: '09:00 AM',
      location: 'Office',
      stackedHabit: 'Arriving at Desk',
      twoMinRule: 'Fill one glass',
      progress: 33
    },
    {
      title: 'Stretching Routine',
      description: '15 minute session to improve flexibility and rest.',
      category: 'Evening • Recovery',
      time: '08:00 PM',
      location: 'Living Room',
      stackedHabit: 'Closing Laptop',
      twoMinRule: 'Touch toes once',
      progress: null
    }
  ]);

  // Load user data when authenticated
  useEffect(() => {
    if (user) {
      loadUserData(user.uid);
    } else {
      // Reset to default when logged out
      loadingUserRef.current = null;
      habitsRef.current = [];
      completionsRef.current = [];
      setIdentityState(DEFAULT_IDENTITY);
      setHabitsState([]);
      setAllCompletions([]);
    }
  }, [user]);

  const loadUserData = async (userId) => {
    if (!userId) return;

    // Track which user we're loading for to prevent race conditions
    const requestId = userId;
    loadingUserRef.current = requestId;

    setLoading(true);
    try {
      // Load profile, habits, and completions in PARALLEL for faster loading
      const [profileResult, habitsResult, completionsResult] = await Promise.all([
        firestoreService.getUserProfile(userId),
        firestoreService.getUserHabits(userId),
        firestoreService.getAllCompletions(userId)
      ]);

      // Check if we're still loading for the same user (race condition check)
      if (loadingUserRef.current !== requestId) return;

      const { data: profile, error: profileError } = profileResult;
      const { data: habitsData, error: habitsError, source: habitsSource } = habitsResult;
      const { data: completionsData, error: completionsError, source: completionsSource } = completionsResult;

      const isProbablyBlocked = (msg) => String(msg || '').toLowerCase().includes('offline') ||
        String(msg || '').toLowerCase().includes('blocked') ||
        String(msg || '').toLowerCase().includes('failed to fetch') ||
        String(msg || '').toLowerCase().includes('network');

      // Handle profile - set identity immediately
      if (profile) {
        setIdentityState(profile.identity || DEFAULT_IDENTITY);
      } else if (!profileError) {
        // Create initial profile only if no error occurred
        const { success } = await firestoreService.createUserProfile(userId, {
          identity: DEFAULT_IDENTITY,
          level: 1,
          totalVotes: 0
        });

        // Check again after async operation
        if (loadingUserRef.current !== requestId) return;

        if (!success) {
          console.error('Failed to create user profile');
        }
      }

      // Handle habits - show immediately if available
      if (habitsData && habitsData.length > 0) {
        setHabitsState(habitsData);
        habitsRef.current = habitsData;
      } else if (!habitsError) {
        const defaultHabits = defaultHabitsTemplate.current;

        // Check again before creating default habits
        if (loadingUserRef.current !== requestId) return;

        // If Firestore is blocked/offline, do NOT attempt writes (they will hang/retry).
        // Instead, show local defaults immediately so the UI is responsive.
        if (
          isProbablyBlocked(completionsError) ||
          isProbablyBlocked(habitsError) ||
          (habitsSource === 'cache' && completionsSource === 'cache' && (!habitsData || habitsData.length === 0))
        ) {
          const localDefaults = defaultHabits.map((h, idx) => ({ id: `local-default-${idx}`, ...h }));
          setHabitsState(localDefaults);
          habitsRef.current = localDefaults;
          toast.error('Network requests to Firebase are being blocked (likely an ad blocker). Showing local defaults.');
          return;
        }

        // Create all default habits in parallel for faster creation
        const habitPromises = defaultHabits.map(habit =>
          firestoreService.addHabit(userId, habit)
        );
        await Promise.all(habitPromises);

        // Check again before reloading
        if (loadingUserRef.current !== requestId) return;

        // Reload habits
        const { data: reloadedHabits } = await firestoreService.getUserHabits(userId);
        if (loadingUserRef.current === requestId) {
          setHabitsState(reloadedHabits || []);
          habitsRef.current = reloadedHabits || [];
        }
      }

      // Handle completions - show immediately
      if (completionsError && !completionsData) {
        console.error('Error loading completions:', completionsError);
      }

      const completions = completionsData || [];
      setAllCompletions(completions);
      completionsRef.current = completions;
    } catch (error) {
      console.error('Error loading user data:', error);
      // Only reset loading state if this is still the current request
      if (loadingUserRef.current === requestId) {
        toast.error(error?.message || 'Failed to load user data');
        // Reset state on error to prevent showing stale data
        setIdentityState(DEFAULT_IDENTITY);
        setHabitsState([]);
        setAllCompletions([]);
        habitsRef.current = [];
        completionsRef.current = [];
      }
    } finally {
      // Only update loading state if this is still the current request
      if (loadingUserRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  const setIdentity = async (newIdentity) => {
    if (!user) return;

    // Optimistic update
    const previousIdentity = identity;
    setIdentityState(newIdentity);

    // Update in Firestore
    const { success, error } = await firestoreService.updateUserProfile(user.uid, { identity: newIdentity });

    if (!success) {
      // Revert on error
      setIdentityState(previousIdentity);
      toast.error(error || 'Failed to update identity');
    }
  };

  const addHabit = async (habit) => {
    if (!user) return;

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const newHabit = {
      id: tempId,
      ...habit,
      progress: habit.progress || null,
      currentProgress: 0,
      targetSteps: habit.targetSteps || 1
    };

    setHabitsState(prev => {
      const updated = [...prev, newHabit];
      habitsRef.current = updated;
      return updated;
    });

    const { id, success, error } = await firestoreService.addHabit(user.uid, {
      ...habit,
      progress: habit.progress || null,
      currentProgress: 0,
      targetSteps: habit.targetSteps || 1
    });

    if (success) {
      // Replace temp ID with real ID
      setHabitsState(prev => {
        const updated = prev.map(h => h.id === tempId ? { ...h, id } : h);
        habitsRef.current = updated;
        return updated;
      });
      logAnalyticsEvent('habit_created', { habitId: id });
      toast.success('Habit added successfully!');
    } else {
      // Revert on error
      setHabitsState(prev => {
        const updated = prev.filter(h => h.id !== tempId);
        habitsRef.current = updated;
        return updated;
      });
      toast.error(error?.message || 'Failed to add habit');
    }
  };

  const updateHabit = async (habitId, updates) => {
    if (!user) return;

    // Optimistic update
    const previousHabits = [...habitsRef.current];
    setHabitsState(prev => {
      const updated = prev.map(h => h.id === habitId ? { ...h, ...updates } : h);
      habitsRef.current = updated;
      return updated;
    });

    const { success, error } = await firestoreService.updateHabit(user.uid, habitId, updates);

    if (success) {
      toast.success('Habit updated!');
    } else {
      // Revert on error
      setHabitsState(previousHabits);
      habitsRef.current = previousHabits;
      toast.error(error?.message || 'Failed to update habit');
    }
  };

  const deleteHabit = async (habitId) => {
    if (!user) return;

    // Optimistic update
    const previousHabits = [...habitsRef.current];
    setHabitsState(prev => {
      const updated = prev.filter(h => h.id !== habitId);
      habitsRef.current = updated;
      return updated;
    });

    const { success, error } = await firestoreService.deleteHabit(user.uid, habitId);

    if (success) {
      toast.success('Habit deleted');
    } else {
      // Revert on error
      setHabitsState(previousHabits);
      habitsRef.current = previousHabits;
      toast.error(error?.message || 'Failed to delete habit');
    }
  };

  const incrementHabitProgress = async (habitId) => {
    if (!user) return;

    const habit = habitsRef.current.find(h => h.id === habitId);
    if (!habit || habit.targetSteps <= 1) return;

    const newProgress = (habit.currentProgress || 0) + 1;

    // Check if completed
    if (newProgress >= habit.targetSteps) {
      // Reset progress and complete for the day
      const updates = { currentProgress: 0 };
      updateHabit(habitId, updates);
      toggleHabitComplete(habitId);
      return;
    }

    // Otherwise just increment progress
    updateHabit(habitId, { currentProgress: newProgress });
  };

  const toggleHabitComplete = async (habitId) => {
    if (!user) return;

    // Use refs to get latest state values
    const currentHabit = habitsRef.current.find(h => h.id === habitId);
    const currentCompletions = completionsRef.current;
    const todaysCompletion = getTodaysCompletion(habitId, currentCompletions);

    // Store previous state for reversion
    const previousCompletions = [...currentCompletions];

    if (todaysCompletion) {
      // Optimistic delete
      setAllCompletions(prev => {
        const updated = prev.filter(c => c.id !== todaysCompletion.id);
        completionsRef.current = updated;
        return updated;
      });

      const { success, error } = await firestoreService.deleteCompletion(user.uid, todaysCompletion.id);

      if (success) {
        logAnalyticsEvent('habit_uncompleted', { habitId });
      } else {
        // Revert
        setAllCompletions(previousCompletions);
        completionsRef.current = previousCompletions;
        toast.error(error || 'Failed to undo completion');
      }
    } else {
      // Optimistic add (with temp ID)
      const tempId = `temp-${Date.now()}`;
      const newCompletion = {
        id: tempId,
        habitId,
        completedAt: new Date(),
        progress: currentHabit?.progress || 100
      };

      setAllCompletions(prev => {
        const updated = [newCompletion, ...prev];
        completionsRef.current = updated;
        return updated;
      });

      const { id, success, error } = await firestoreService.logHabitCompletion(user.uid, habitId, {
        progress: currentHabit?.progress || 100
      });

      if (success && id) {
        logAnalyticsEvent('habit_completed', { habitId });
        // Update temp ID with real ID
        setAllCompletions(prev => {
          const updated = prev.map(c => c.id === tempId ? { ...c, id } : c);
          completionsRef.current = updated;
          return updated;
        });
      } else {
        // Revert
        setAllCompletions(previousCompletions);
        completionsRef.current = previousCompletions;
        toast.error(error || 'Failed to log completion');
      }
    }
  };

  return (
    <UserContext.Provider value={{
      identity,
      setIdentity,
      habits,
      addHabit,
      updateHabit,
      deleteHabit,
      toggleHabitComplete,
      incrementHabitProgress,
      allCompletions,
      loading,
      refreshData: () => user && loadUserData(user.uid)
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
