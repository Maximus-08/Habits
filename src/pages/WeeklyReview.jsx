import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import NavBar from '../components/NavBar'
import { useAuth } from '../context/AuthContext'
import { useUser } from '../context/UserContext'
import * as firestoreService from '../services/firestoreService'
import { getCurrentWeekNumber, getCurrentWeekDateRange, calculateHabitStreak, calculateGrowthRate } from '../utils/statistics'

export default function WeeklyReview() {
  const { user } = useAuth();
  const { habits, allCompletions } = useUser();
  const [reflection, setReflection] = useState({
    wins: '',
    challenges: '',
    learning: '',
    nextWeek: ''
  })

  const [satisfaction, setSatisfaction] = useState(7)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingReview, setLoadingReview] = useState(true)

  const weekNumber = getCurrentWeekNumber();
  const weekDateRange = getCurrentWeekDateRange();
  const currentYear = new Date().getFullYear();

  // Load existing review for current week
  useEffect(() => {
    const loadExistingReview = async () => {
      if (!user) {
        setLoadingReview(false);
        return;
      }

      const { data: existingReview } = await firestoreService.getWeeklyReview(user.uid, currentYear, weekNumber);

      if (existingReview) {
        setReflection(existingReview.reflection || {
          wins: '',
          challenges: '',
          learning: '',
          nextWeek: ''
        });
        setSatisfaction(existingReview.satisfaction || 7);
      }
      setLoadingReview(false);
    };

    loadExistingReview();
  }, [user, currentYear, weekNumber]);

  // Calculate real stats
  const weeklyCompletions = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return (allCompletions || []).filter(c => {
      const date = c.completedAt?.toDate?.() || new Date(c.completedAt);
      return date >= oneWeekAgo;
    });
  }, [allCompletions]);

  const completedThisWeek = weeklyCompletions.length;
  const targetThisWeek = habits.length * 7;

  const bestStreak = useMemo(() => {
    let maxStreak = 0;
    habits.forEach(habit => {
      const habitCompletions = (allCompletions || []).filter(c => c.habitId === habit.id);
      const { currentStreak } = calculateHabitStreak(habitCompletions);
      maxStreak = Math.max(maxStreak, currentStreak);
    });
    return maxStreak;
  }, [habits, allCompletions]);

  const weeklyGrowth = useMemo(() => calculateGrowthRate(allCompletions || [], 7), [allCompletions]);

  const handleSaveDraft = async () => {
    if (!user) return;

    setSaving(true);
    setSaved(false);

    const { success } = await firestoreService.saveWeeklyReview(user.uid, {
      weekNumber,
      year: currentYear,
      reflection,
      satisfaction,
      status: 'draft'
    });

    setSaving(false);
    if (success) {
      setSaved(true);
      toast.success('Draft saved!');
      setTimeout(() => setSaved(false), 3000);
    } else {
      toast.error('Failed to save draft');
    }
  };

  const handleCompleteReview = async () => {
    if (!user) return;

    // Validate that at least one field is filled
    if (!reflection.wins && !reflection.challenges && !reflection.learning && !reflection.nextWeek) {
      toast.error('Please fill in at least one reflection field');
      return;
    }

    setSaving(true);
    setSaved(false);

    const { success } = await firestoreService.saveWeeklyReview(user.uid, {
      weekNumber,
      year: currentYear,
      reflection,
      satisfaction,
      status: 'completed'
    });

    setSaving(false);
    if (success) {
      setSaved(true);
      toast.success('Weekly review completed! 🎉');
    } else {
      toast.error('Failed to save review');
    }
  };

  return (
    <div className="bg-background-light dark:bg-zinc-900 font-display text-zinc-900 antialiased min-h-screen flex flex-col">
      <NavBar currentPage="review" />

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-full border border-primary/20">Week {weekNumber} • {currentYear}</span>
            <span className="text-zinc-400 text-sm font-medium">{weekDateRange}</span>
          </div>
          <h1 className="text-4xl font-black text-zinc-900 mb-3">Weekly System Review</h1>
          <p className="text-zinc-500 text-lg">Reflect, learn, and adjust your atomic systems.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <StatCard icon="check_circle" label="Completed" value={`${completedThisWeek}/${targetThisWeek || '—'}`} subtitle="Tasks" color="primary" />
          <StatCard icon="local_fire_department" label="Best Streak" value={bestStreak.toString()} subtitle="Days" color="primary" />
          <StatCard icon="trending_up" label="Growth" value={`${weeklyGrowth >= 0 ? '+' : ''}${weeklyGrowth}%`} subtitle="vs Last Week" color="secondary" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-soft-blue">
            <label className="block mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary">star</span>
                <span className="text-lg font-bold text-zinc-900">What Went Well?</span>
              </div>
              <textarea
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 min-h-[120px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none text-zinc-700 text-sm"
                placeholder="Celebrate your wins, no matter how small..."
                value={reflection.wins}
                onChange={(e) => setReflection({ ...reflection, wins: e.target.value })}
              />
            </label>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-soft-blue">
            <label className="block mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-amber-500">flag</span>
                <span className="text-lg font-bold text-zinc-900">What Was Challenging?</span>
              </div>
              <textarea
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 min-h-[120px] focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none text-zinc-700 text-sm"
                placeholder="Identify obstacles and friction points..."
                value={reflection.challenges}
                onChange={(e) => setReflection({ ...reflection, challenges: e.target.value })}
              />
            </label>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-soft-blue">
            <label className="block mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-blue-500">lightbulb</span>
                <span className="text-lg font-bold text-zinc-900">What Did You Learn?</span>
              </div>
              <textarea
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 min-h-[120px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none text-zinc-700 text-sm"
                placeholder="Insights and discoveries from this week..."
                value={reflection.learning}
                onChange={(e) => setReflection({ ...reflection, learning: e.target.value })}
              />
            </label>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-soft-blue">
            <label className="block mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-secondary">rocket_launch</span>
                <span className="text-lg font-bold text-zinc-900">Next Week's Focus</span>
              </div>
              <textarea
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 min-h-[120px] focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none resize-none text-zinc-700 text-sm"
                placeholder="What will you adjust or improve?"
                value={reflection.nextWeek}
                onChange={(e) => setReflection({ ...reflection, nextWeek: e.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-zinc-200 shadow-soft-blue mt-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary">mood</span>
            <span className="text-lg font-bold text-zinc-900">Overall Satisfaction</span>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="text-5xl font-black text-primary">{satisfaction}/10</div>
            <div className="w-full">
              <style>{`
                .satisfaction-slider::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 20px;
                  height: 20px;
                  background: #2563eb;
                  border-radius: 50%;
                  cursor: pointer;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .satisfaction-slider::-moz-range-thumb {
                  width: 20px;
                  height: 20px;
                  background: #2563eb;
                  border-radius: 50%;
                  cursor: pointer;
                  border: none;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .satisfaction-slider::-webkit-slider-runnable-track {
                  width: 100%;
                  height: 12px;
                  cursor: pointer;
                  border-radius: 9999px;
                }
                .satisfaction-slider::-moz-range-track {
                  width: 100%;
                  height: 12px;
                  cursor: pointer;
                  border-radius: 9999px;
                }
              `}</style>
              <input
                type="range"
                min="0"
                max="10"
                value={satisfaction}
                onChange={(e) => setSatisfaction(parseInt(e.target.value))}
                className="satisfaction-slider w-full h-3 rounded-full cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #2563eb 0%, #2563eb ${satisfaction * 10}%, #e4e4e7 ${satisfaction * 10}%, #e4e4e7 100%)`,
                  WebkitAppearance: 'none',
                  appearance: 'none'
                }}
              />
            </div>
            <div className="flex justify-between w-full text-xs text-zinc-400 font-medium">
              <span>Not Satisfied</span>
              <span>Very Satisfied</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-4">
          {saved && (
            <div className="flex items-center gap-2 text-primary font-medium">
              <span className="material-symbols-outlined">check_circle</span>
              <span>Saved successfully!</span>
            </div>
          )}
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={handleCompleteReview}
            disabled={saving}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">check</span>
            {saving ? 'Saving...' : 'Complete Review'}
          </button>
        </div>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value, subtitle, color }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-soft flex flex-col gap-2">
      <div className={`w-12 h-12 rounded-xl ${color === 'primary' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'} flex items-center justify-center mb-2`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <p className="text-3xl font-black text-zinc-900">{value}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm font-bold text-zinc-700">{label}</p>
        <span className="text-xs text-zinc-400">{subtitle}</span>
      </div>
    </div>
  )
}
