import { useState, useMemo, useEffect } from 'react'
import toast from 'react-hot-toast'
import NavBar from '../components/NavBar'
import { useUser } from '../context/UserContext'
import { logAnalyticsEvent } from '../config/firebase'
import {
  calculateIdentityVotes,
  calculateHabitStreak,
  getCompletionRate,
  getBestDayOfWeek,
  calculateGrowthRate,
  getHeatmapData
} from '../utils/statistics'
import HeatMap from '@uiw/react-heat-map';

export default function PerformanceTracker() {
  const { habits, allCompletions, identity } = useUser();
  const [heatmapRange, setHeatmapRange] = useState('1Y'); // '1Y', '6M', '3M'

  // Log page view
  useEffect(() => {
    logAnalyticsEvent('page_view', { page_name: 'analytics' });
  }, []);

  // Export data as JSON
  const handleExportData = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      identity,
      habits: habits.map(h => ({
        title: h.title,
        category: h.category,
        time: h.time,
        location: h.location
      })),
      completions: allCompletions.map(c => ({
        habitId: c.habitId,
        completedAt: c.completedAt?.toDate?.()?.toISOString() || c.completedAt
      })),
      stats: {
        totalVotes: allCompletions.length,
        habitsCount: habits.length
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully!');
  };

  // Calculate overall statistics
  const totalVotes = useMemo(() => calculateIdentityVotes(allCompletions), [allCompletions]);
  const weeklyGrowth = useMemo(() => calculateGrowthRate(allCompletions || [], 7), [allCompletions]);
  const completionRate = useMemo(() => getCompletionRate(allCompletions || [], habits.length, 7), [allCompletions, habits]);
  const bestDay = useMemo(() => getBestDayOfWeek(allCompletions || []), [allCompletions]);
  const quarterlyGrowth = useMemo(() => calculateGrowthRate(allCompletions || [], 90), [allCompletions]);

  // Calculate date range for heatmap
  const heatmapStartDate = useMemo(() => {
    const date = new Date();
    if (heatmapRange === '6M') date.setMonth(date.getMonth() - 6);
    else if (heatmapRange === '3M') date.setMonth(date.getMonth() - 3);
    else date.setFullYear(date.getFullYear() - 1);
    return date;
  }, [heatmapRange]);

  const heatmapData = useMemo(() => getHeatmapData(allCompletions || []), [allCompletions]);

  // Calculate best streak across all habits
  const { currentStreak, longestStreak } = useMemo(() => {
    let maxCurrent = 0;
    let maxLongest = 0;

    habits.forEach(habit => {
      const habitCompletions = (allCompletions || []).filter(c => c.habitId === habit.id);
      const streakData = calculateHabitStreak(habitCompletions);
      maxCurrent = Math.max(maxCurrent, streakData.currentStreak);
      maxLongest = Math.max(maxLongest, streakData.longestStreak);
    });

    return { currentStreak: maxCurrent, longestStreak: maxLongest };
  }, [habits, allCompletions]);

  const stats = [
    {
      label: 'Identity Votes',
      value: totalVotes.toLocaleString(),
      change: weeklyGrowth > 0 ? `+${weeklyGrowth}% this week` : weeklyGrowth < 0 ? `${weeklyGrowth}% this week` : 'No change',
      icon: 'how_to_vote',
      color: 'royal-blue'
    },
    {
      label: 'Current Streak',
      value: currentStreak.toString(),
      unit: 'Days',
      subtitle: currentStreak > 0 ? 'Keep the momentum!' : 'Start a new streak today!',
      icon: 'local_fire_department',
      color: 'primary'
    },
    {
      label: 'Longest Streak',
      value: longestStreak.toString(),
      unit: 'Days',
      subtitle: longestStreak > 0 ? 'Personal Best' : 'Complete habits to start',
      icon: 'emoji_events',
      color: 'amber'
    }
  ];

  return (
    <div className="bg-background-light font-display text-text-main overflow-x-hidden min-h-screen flex flex-col antialiased">
      <NavBar currentPage="analytics" />

      <div className="layout-container flex h-full grow flex-col px-4 md:px-10 lg:px-20 xl:px-40 py-8">
        <div className="layout-content-container flex flex-col max-w-[1200px] mx-auto w-full flex-1 gap-6">
          <div className="flex flex-wrap justify-between gap-3 p-4 items-end">
            <div className="flex min-w-72 flex-col gap-2">
              <p className="text-text-main text-4xl font-black leading-tight tracking-[-0.033em]">Performance & History</p>
              <p className="text-text-muted text-base font-normal leading-normal">Your journey to becoming your ideal self, visualized.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportData}
                className="flex items-center justify-center rounded-xl h-12 px-6 bg-secondary text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-soft hover:shadow-lg hover:-translate-y-0.5"
              >
                <span className="material-symbols-outlined mr-2 text-[20px]">download</span>
                Export Data
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
            {stats.map((stat, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-2xl p-6 bg-white border border-slate-100 shadow-soft hover:shadow-lg transition-shadow relative overflow-hidden group">
                <div className={`absolute right-0 top-0 w-32 h-32 ${stat.color === 'royal-blue' ? 'bg-blue-50/50' :
                  stat.color === 'primary' ? 'bg-emerald-50/50' : 'bg-amber-50/50'
                  } rounded-bl-[4rem] -mr-6 -mt-6 transition-transform group-hover:scale-105`}></div>
                <div className="flex items-center gap-3 mb-2 relative z-10">
                  <div className={`p-2 rounded-lg ${stat.color === 'royal-blue' ? 'bg-royal-blue/10 text-royal-blue' :
                    stat.color === 'primary' ? 'bg-emerald-100/50 text-primary' : 'bg-amber-100/50 text-amber-500'
                    }`}>
                    <span className="material-symbols-outlined">{stat.icon}</span>
                  </div>
                  <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">{stat.label}</p>
                </div>
                <p className="text-text-main tracking-tight text-4xl font-bold leading-tight relative z-10">
                  {stat.value} {stat.unit && <span className="text-xl font-normal text-slate-400">{stat.unit}</span>}
                </p>
                {stat.change && (
                  <div className="flex items-center gap-1 mt-1 relative z-10">
                    <span className="material-symbols-outlined text-secondary text-sm">trending_up</span>
                    <p className="text-xs text-secondary font-bold">{stat.change}</p>
                  </div>
                )}
                {stat.subtitle && (
                  <p className="text-xs text-slate-500 font-medium mt-1 relative z-10">{stat.subtitle}</p>
                )}
              </div>
            ))}
          </div>

          {/* Yearly Consistency Heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 pt-0">
            <div className="lg:col-span-8 flex flex-col gap-6 relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-emerald-100/60 via-white to-blue-100/60 blur-3xl -z-10 rounded-[3rem]"></div>
              <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/60 p-8 shadow-soft min-h-[400px]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-text-main">Yearly Consistency</h3>
                    <p className="text-sm text-slate-500 mt-1">Visualizing your daily habits over the last year</p>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => setHeatmapRange('1Y')}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${heatmapRange === '1Y' ? 'bg-white text-text-main shadow-sm border border-slate-200' : 'text-slate-500 hover:text-text-main hover:bg-white/50'}`}
                    >1Y</button>
                    <button
                      onClick={() => setHeatmapRange('6M')}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${heatmapRange === '6M' ? 'bg-white text-text-main shadow-sm border border-slate-200' : 'text-slate-500 hover:text-text-main hover:bg-white/50'}`}
                    >6M</button>
                    <button
                      onClick={() => setHeatmapRange('3M')}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${heatmapRange === '3M' ? 'bg-white text-text-main shadow-sm border border-slate-200' : 'text-slate-500 hover:text-text-main hover:bg-white/50'}`}
                    >3M</button>
                  </div>
                </div>
                <div className="w-full overflow-x-auto custom-scrollbar pb-4">
                  <HeatMap
                    value={heatmapData}
                    width="100%"
                    style={{ color: '#a1a1aa' }}
                    startDate={heatmapStartDate}
                    rectSize={14}
                    space={4}
                    legendCellSize={0}
                    rectProps={{
                      rx: 3,
                    }}
                    panelColors={{
                      0: '#f4f4f5',
                      2: '#d1fae5',
                      4: '#6ee7b7',
                      10: '#34d399',
                      20: '#10b981',
                    }}
                  />
                </div>
                <div className="flex items-center gap-3 mt-6 text-xs text-slate-400">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <div className="size-3 rounded-sm bg-slate-100"></div>
                    <div className="size-3 rounded-sm bg-primary/20"></div>
                    <div className="size-3 rounded-sm bg-primary/50"></div>
                    <div className="size-3 rounded-sm bg-primary"></div>
                  </div>
                  <span>More</span>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Insights */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-soft">
                <h3 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">insights</span>
                  Key Insights
                </h3>
                <div className="flex flex-col gap-4">
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-xs font-bold text-emerald-700 uppercase mb-1">Best Day</p>
                    <p className="text-lg font-black text-emerald-900">{bestDay.day}</p>
                    <p className="text-xs text-emerald-600 mt-1">{bestDay.percentage}% of completions</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-bold text-blue-700 uppercase mb-1">Weekly Consistency</p>
                    <p className="text-lg font-black text-blue-900">{completionRate}%</p>
                    <p className="text-xs text-blue-600 mt-1">{completionRate >= 75 ? 'Above target of 75%' : 'Target: 75%'}</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs font-bold text-amber-700 uppercase mb-1">Quarterly Growth</p>
                    <p className="text-lg font-black text-amber-900">{quarterlyGrowth > 0 ? '+' : ''}{quarterlyGrowth}%</p>
                    <p className="text-xs text-amber-600 mt-1">vs previous quarter</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
