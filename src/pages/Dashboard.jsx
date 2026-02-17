import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import HabitCard from '../components/HabitCard'
import Heatmap from '../components/Heatmap'
import { useUser } from '../context/UserContext'
import { useAuth } from '../context/AuthContext'
import { isHabitCompletedToday, normalizeDate } from '../utils/dateHelpers'
import { logAnalyticsEvent } from '../config/firebase'
import * as firestoreService from '../services/firestoreService'
import {
  calculateHabitStreak,
  calculateIdentityVotes,
  calculateUserLevel,
  calculateVotesForNextLevel,
  getHeatmapData,
  getCurrentWeekNumber,
  getCurrentWeekDateRange,
  getWeekDateRange
} from '../utils/statistics'

export default function Dashboard() {
  const { identity, setIdentity, habits, toggleHabitComplete, deleteHabit, allCompletions } = useUser();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Bad habits state
  const [badHabits, setBadHabits] = useState([]);
  const [loadingBadHabits, setLoadingBadHabits] = useState(false);

  // Log page view
  useEffect(() => {
    logAnalyticsEvent('page_view', { page_name: 'dashboard' });
  }, []);

  // Load bad habits
  useEffect(() => {
    if (user) {
      loadBadHabits();
    }
  }, [user]);

  const loadBadHabits = async () => {
    if (!user) return;
    setLoadingBadHabits(true);
    const { data } = await firestoreService.getBadHabits(user.uid);
    setBadHabits(data || []);
    setLoadingBadHabits(false);
  };


  const identityOptions = useMemo(() => {
    const identitySet = new Set();
    if (identity) identitySet.add(identity);
    habits.forEach(h => { if (h.identityName) identitySet.add(h.identityName); });
    badHabits.forEach(h => { if (h.identityName) identitySet.add(h.identityName); });
    return Array.from(identitySet);
  }, [identity, habits, badHabits]);
  // Calculate real statistics
  const totalVotes = useMemo(() => calculateIdentityVotes(allCompletions), [allCompletions]);
  const userLevel = useMemo(() => calculateUserLevel(totalVotes), [totalVotes]);
  const levelProgress = useMemo(() => calculateVotesForNextLevel(totalVotes), [totalVotes]);
  const heatmapData = useMemo(() => getHeatmapData(allCompletions || []), [allCompletions]);
  const weekNumber = getCurrentWeekNumber();
  const viewingDateRange = useMemo(() => getWeekDateRange(selectedDate), [selectedDate]);

  // Check if viewing current week
  const isViewingCurrentWeek = useMemo(() => {
    const today = new Date();
    const todayWeekStart = new Date(today);
    todayWeekStart.setDate(todayWeekStart.getDate() - todayWeekStart.getDay());
    todayWeekStart.setHours(0, 0, 0, 0);

    const selectedWeekStart = new Date(selectedDate);
    selectedWeekStart.setDate(selectedWeekStart.getDate() - selectedWeekStart.getDay());
    selectedWeekStart.setHours(0, 0, 0, 0);

    return todayWeekStart.getTime() === selectedWeekStart.getTime();
  }, [selectedDate]);

  // Filter completions based on selected date range
  const filteredCompletions = useMemo(() => {
    if (!allCompletions) return [];
    const weekStart = new Date(selectedDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return allCompletions.filter(c => {
      const date = normalizeDate(c.completedAt);
      return date && date >= weekStart && date < weekEnd;
    });
  }, [allCompletions, selectedDate]);

  // Filter habits for current identity
  const currentIdentityHabits = useMemo(() => {
    if (!identity) return habits; // Should ideally always have identity
    return habits.filter(h => h.identityName === identity || !h.identityName); // Fallback for legacy
  }, [habits, identity]);


  // Calculate streaks for each habit (for passing props)
  const getHabitStreakData = (habitId) => {
    const habitCompletions = (allCompletions || []).filter(c => c.habitId === habitId);
    return calculateHabitStreak(habitCompletions);
  };

  // Calculate days free for a bad habit
  const getDaysFree = (badHabit) => {
    const lapses = badHabit.lapses || [];
    if (lapses.length === 0) {
      const createdAt = badHabit.createdAt?.toDate?.() || new Date(badHabit.createdAt);
      const diffTime = Date.now() - createdAt.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
    const lastLapse = lapses[lapses.length - 1];
    const lapseDate = lastLapse?.toDate?.() || new Date(lastLapse);
    const diffTime = Date.now() - lapseDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Handle edit — navigate to Identity Log
  const handleEditHabit = (habit) => {
    navigate(`/identity?edit=${habit.id}`);
  };

  const handleLogRelapse = async (badHabitId) => {
    if (!confirm('Are you sure you want to log a relapse? This will reset your current streak.')) return;

    // Optimistic update
    setBadHabits(prev => prev.map(bh => {
      if (bh.id === badHabitId) {
        return {
          ...bh,
          lapses: [...(bh.lapses || []), new Date()]
        };
      }
      return bh;
    }));

    const result = await firestoreService.logBadHabitLapse(user.uid, badHabitId);
    if (!result.success) {
      alert('Failed to log relapse. Please try again.');
      loadBadHabits(); // Revert on failure
    }
  };

  return (
    <div className="bg-background-light text-zinc-900 min-h-screen flex flex-col">
      <NavBar currentPage="dashboard" />

      <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-10">
        {/* Header Section */}
        <section className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
          <div className="flex flex-col gap-2 max-w-3xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                Current Focus
              </span>
              <span className="text-slate-400 text-xs">• Week {weekNumber}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Identity: {identity}
              </h1>
              {identityOptions.length > 1 && (
                <select
                  value={identity || ''}
                  onChange={(e) => setIdentity(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  {identityOptions.map((identityName) => (
                    <option key={identityName} value={identityName}>{identityName}</option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-slate-500 mt-2 text-lg">
              "Every action you take is a vote for the type of person you wish to become."
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0 relative">
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-3 bg-white border border-slate-200 hover:border-slate-300 px-5 py-2.5 rounded-lg shadow-sm transition-all text-sm font-bold text-slate-600"
              >
                <span className="material-symbols-outlined text-lg">calendar_month</span>
                <span>{viewingDateRange}</span>
              </button>

              {showDatePicker && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg p-4 z-50 w-72">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-zinc-900">Select Date</span>
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="text-zinc-400 hover:text-zinc-600"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                    <input
                      type="date"
                      value={selectedDate.toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(new Date(e.target.value))}
                      className="w-full border border-zinc-200 rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    />
                    <button
                      onClick={() => setSelectedDate(new Date())}
                      className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-lg transition-colors text-sm"
                    >
                      Back to Today
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Level Progress (moved from header for cleaner look) */}
        <div className="bg-white p-1 rounded-full border border-slate-100 shadow-sm inline-flex items-center gap-4 pr-6 max-w-fit">
          <div className="bg-slate-900 text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            Level {userLevel}
          </div>
          <div className="flex flex-col gap-0.5 min-w-[200px]">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-300 rounded-full" style={{ width: `${levelProgress.percentage}%` }}></div>
            </div>
            <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              <span>{totalVotes.toLocaleString()} votes cast</span>
              <span>{levelProgress.remaining} to next level</span>
            </div>
          </div>
        </div>


        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Column - Good Habits (8 cols) */}
          <section className="lg:col-span-8 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <span className="material-symbols-outlined text-blue-600">visibility</span>
                <h2 className="font-bold text-xl">Make it Obvious</h2>
              </div>
              <span className="text-xs font-bold text-zinc-400 bg-zinc-50 px-3 py-1.5 rounded-full border border-zinc-100 uppercase tracking-wide">
                {currentIdentityHabits.filter(h => !isViewingCurrentWeek ? !isHabitCompletedToday(h.id, filteredCompletions) : !isHabitCompletedToday(h.id, allCompletions)).length} tasks remaining
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {/* Habit Cards */}
              {currentIdentityHabits.map((habit) => {
                const streakData = getHabitStreakData(habit.id);
                return (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    completed={isViewingCurrentWeek
                      ? isHabitCompletedToday(habit.id, allCompletions)
                      : isHabitCompletedToday(habit.id, filteredCompletions)
                    }
                    streak={getHabitStreakData(habit.id).currentStreak}
                    longestStreak={getHabitStreakData(habit.id).longestStreak}
                    onComplete={toggleHabitComplete}
                    onEdit={handleEditHabit}
                    onDelete={deleteHabit}
                  />
                );
              })}

              <button
                onClick={() => navigate('/identity?add=true')}
                className="w-full py-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-500 transition-all flex items-center justify-center gap-2 text-sm font-bold bg-white/50 hover:bg-emerald-50/30"
              >
                <span className="material-symbols-outlined">add_circle</span>
                Add New Habit
              </button>
            </div>
          </section>

          {/* Right Column - Bad Habits (4 cols) */}
          <section className="lg:col-span-4 flex flex-col gap-6">
            <div className="flex items-center gap-2 text-slate-900">
              <span className="material-symbols-outlined text-red-500">gpp_bad</span>
              <h2 className="font-bold text-xl">Make it Invisible</h2>
            </div>

            <div className="flex flex-col gap-4">
              {badHabits.filter(h => (h.identityName || identity) === identity).length === 0 && (
                <div className="bg-white rounded-xl p-8 border border-slate-100 text-center flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-slate-300 text-4xl">check_circle</span>
                  <p className="text-slate-500 font-medium">No bad habits tracked yet.</p>
                  <button
                    onClick={() => navigate('/identity')}
                    className="text-sm font-bold text-primary hover:text-primary-dark transition-colors"
                  >
                    Design your anti-habits
                  </button>
                </div>
              )}

              {badHabits.filter(h => (h.identityName || identity) === identity).map(badHabit => {
                const daysFree = getDaysFree(badHabit);
                const totalLapses = badHabit.lapses?.length || 0;
                // Calculate record (simplified for now, ideally would calculate max gap between lapses)
                // For MVP, we can treat "Record" as longest streak if we compute it, or just current for now if complex
                // Let's just user "Days Free" as primary metric.

                return (
                  <div key={badHabit.id} className="bg-white rounded-xl shadow-card p-6 border border-slate-100 flex flex-col gap-6 group hover:border-red-100 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-50 rounded-xl text-red-500 border border-red-100">
                          <span className="material-symbols-outlined text-xl">block</span>
                        </div>
                        <h3 className="font-extrabold text-slate-900 text-lg leading-tight">{badHabit.name}</h3>
                      </div>
                      <button
                        onClick={() => navigate(`/identity?editBad=${badHabit.id}`)}
                        className="text-slate-300 hover:text-slate-500 transition-colors"
                      >
                        <span className="material-symbols-outlined">more_horiz</span>
                      </button>
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <span className={`block text-5xl font-black leading-none ${daysFree === 0 ? 'text-red-500' : 'text-slate-900'}`}>
                          {daysFree}
                        </span>
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-1 block">Days Free</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] px-3 py-1 rounded-full font-bold border flex items-center gap-1 ${daysFree >= 7 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          daysFree > 0 ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            'bg-red-50 text-red-700 border-red-100'
                          }`}>
                          {daysFree >= 7 ? 'STRONG 💪' : daysFree > 0 ? 'BUILDING' : 'SLIPPED TODAY'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Total Relapses: {totalLapses}</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${daysFree === 0 ? 'bg-red-400' : 'bg-emerald-400'}`}
                        style={{ width: `${Math.min((daysFree / 30) * 100, 100)}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <button
                        onClick={() => navigate(`/identity?editBad=${badHabit.id}`)}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all w-full flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        Edit
                      </button>
                      <button
                        onClick={() => handleLogRelapse(badHabit.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all w-full flex items-center justify-center gap-2 group-hover:bg-red-100"
                      >
                        <span className="material-symbols-outlined text-sm">restart_alt</span>
                        Log Relapse
                      </button>
                    </div>
                    <button
                      onClick={async () => {
                        if (!window.confirm('Delete this bad habit? This action cannot be undone.')) return;
                        const result = await firestoreService.deleteBadHabit(user.uid, badHabit.id);
                        if (result.success) {
                          setBadHabits(prev => prev.filter(h => h.id !== badHabit.id));
                        } else {
                          alert('Failed to delete bad habit.');
                        }
                      }}
                      className="text-xs text-red-500 font-bold hover:text-red-700 self-end"
                    >
                      Delete Habit
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer Section - Satisfying / Heatmap */}
        <footer className="w-full mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-900">
              <span className="material-symbols-outlined text-emerald-500">sentiment_satisfied</span>
              <h2 className="font-bold text-xl">Make it Satisfying</h2>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consistency Map</span>
          </div>
          <Heatmap data={heatmapData} />
        </footer>

      </main>
    </div>
  )
}
