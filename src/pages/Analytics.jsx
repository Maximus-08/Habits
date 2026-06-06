import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, 
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import { useHabits } from '../context/HabitsContext';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../components/ui/Primitives';
import { ArrowLeft, Award, ShieldAlert, Sparkles, TrendingUp, Calendar, FileText } from 'lucide-react';

export default function Analytics() {
  const navigate = useNavigate();
  const { 
    habits = [], 
    badHabits = [], 
    completions = [], 
    identities = [], 
    weeklyReviews = [],
    getIdentityStrength, 
    getDaysFree 
  } = useHabits() || {};

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    // Smooth scroll to hash anchor on load
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center font-serif text-text">
        <div className="flex flex-col items-center gap-4">
          <svg className="w-12 h-12 animate-spin text-[#DF8559]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-xs font-mono font-bold tracking-widest uppercase text-muted">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  // 1. Calculate Completion Trends over past 14 days
  const getCompletionTrends = () => {
    const today = new Date();
    const data = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().split('T')[0];

      // Get count of completions on this day
      const dayCompletions = completions.filter(c => c.dateNormalized === dStr).length;
      const activeHabitsCount = habits.length;
      
      const rate = activeHabitsCount > 0 
        ? Math.round((dayCompletions / activeHabitsCount) * 100) 
        : 0;

      data.push({
        date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        "Completion Rate (%)": Math.min(100, rate),
        "Votes Cast": dayCompletions
      });
    }
    return data;
  };

  const trendData = getCompletionTrends();

  // 2. Sobriety curve (Days free comparison for all bad habits)
  const getSobrietyData = () => {
    return badHabits.map(bh => ({
      name: bh.name,
      "Days Free": getDaysFree(bh),
      "Slips Logged": bh.lapses ? bh.lapses.length : 0
    }));
  };

  const sobrietyData = getSobrietyData();



  return (
    <div className="max-w-7xl mx-auto px-4 py-8 select-none">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/40 pb-5 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-text">Performance Analytics</h1>
          <p className="text-sm text-muted mt-1">Review statistical evidence supporting your identities.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Chart 1: AreaChart showing Good Habit Completion Rates (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-8">
          
          <Card hoverLift={false} className="border border-border/60 shadow-sm">
            <CardHeader className="py-4 border-b border-border/40">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-success" />
                14-Day Completion Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-72 w-full text-xs font-mono">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#A3C9A8" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#A3C9A8" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAE4DD" />
                    <XAxis dataKey="date" stroke="#8C7C6B" />
                    <YAxis domain={[0, 100]} stroke="#8C7C6B" />
                    <ChartTooltip 
                      contentStyle={{ background: '#FFFAF3', border: '1px solid #EAE4DD', borderRadius: '8px' }}
                      labelStyle={{ fontWeight: 'bold', color: '#4A4036' }}
                    />
                    <Area type="monotone" dataKey="Completion Rate (%)" stroke="#A3C9A8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRate)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted text-center mt-3 leading-relaxed">
                Graph plots the percentage of active good habits checked off daily. Consistent marks build identity.
              </p>
            </CardContent>
          </Card>

          {/* Chart 2: Sobriety Comparison */}
          <Card hoverLift={false} className="border border-border/60 shadow-sm">
            <CardHeader className="py-4 border-b border-border/40">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-primary" />
                Anti-Habit Sobriety Streaks
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {badHabits.length === 0 ? (
                <p className="text-xs text-muted italic text-center py-10">Define anti-habits to see sobriety curves.</p>
              ) : (
                <div className="h-72 w-full text-xs font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sobrietyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EAE4DD" />
                      <XAxis dataKey="name" stroke="#8C7C6B" />
                      <YAxis stroke="#8C7C6B" />
                      <ChartTooltip 
                        contentStyle={{ background: '#FFFAF3', border: '1px solid #EAE4DD', borderRadius: '8px' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="Days Free" stroke="#F6C879" strokeWidth={2.5} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Slips Logged" stroke="#EFA683" strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="text-[10px] text-muted text-center mt-3 leading-relaxed">
                Aim to maximize "Days Free" (sobriety count) and minimize slips by refining environment brakes.
              </p>
            </CardContent>
          </Card>

          {/* Completed Weekly Reviews Section */}
          <div id="reflections" className="space-y-4 pt-6 border-t border-border/20">
            <h2 className="text-xl font-bold font-serif text-text flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Weekly Reflections History
            </h2>
            {weeklyReviews.filter(r => r.status === 'completed' && r.userId !== 'user_default' && !r.isSeed).length === 0 ? (
              <p className="text-xs text-muted italic p-5 bg-hoverBg/10 rounded-xl border border-dashed border-border/80">
                No weekly reviews completed yet. Your reflections will appear here once locked.
              </p>
            ) : (
              <div className="space-y-4">
                {weeklyReviews
                  .filter(r => r.status === 'completed' && r.userId !== 'user_default' && !r.isSeed)
                  .sort((a, b) => {
                    const yearDiff = (b.year || 0) - (a.year || 0);
                    if (yearDiff !== 0) return yearDiff;
                    return (b.weekNumber || 0) - (a.weekNumber || 0);
                  })
                  .map(review => (
                    <Card key={review.id} hoverLift={true} className="border border-border/60">
                      <div className="p-5 bg-bg/25 border-b border-border/30 flex flex-row items-center justify-between">
                        <h4 className="text-sm font-semibold font-serif text-text">
                          Week {review.weekNumber}, {review.year}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-mono tracking-widest text-muted">Satisfaction:</span>
                          <span className="text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">
                            {review.satisfaction}/10
                          </span>
                        </div>
                      </div>
                      <div className="p-5 text-xs space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-mono tracking-wider text-primary font-bold">🎉 Wins & Successes</span>
                            <p className="text-text leading-relaxed font-sans">{review.reflection?.wins || 'None recorded.'}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-mono tracking-wider text-secondary font-bold">⚠️ Challenges Faced</span>
                            <p className="text-text leading-relaxed font-sans">{review.reflection?.challenges || 'None recorded.'}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-mono tracking-wider text-success font-bold">💡 Lessons Learned</span>
                            <p className="text-text leading-relaxed font-sans">{review.reflection?.learning || 'None recorded.'}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-mono tracking-wider text-amber-600 font-bold">🎯 Next Week's Focus</span>
                            <p className="text-text leading-relaxed font-sans">{review.reflection?.nextWeek || 'None recorded.'}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Identity Summaries */}
        <div className="space-y-6">
          
          <Card hoverLift={false} className="border border-border/60 shadow-sm">
            <CardHeader className="py-4 border-b border-border/40">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-primary" />
                Evidence Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4 space-y-4">
              {identities.map(identity => {
                const strength = getIdentityStrength(identity.id);
                const habitCount = habits.filter(h => h.identityId === identity.id).length;
                const totalComp = completions.filter(c => c.identityId === identity.id).length;

                return (
                  <div key={identity.id} className="p-4 rounded-xl bg-hoverBg/25 border border-border/40 space-y-3">
                    <div className="flex justify-between items-center border-b border-border/30 pb-2">
                      <h4 className="font-serif font-bold text-text text-sm">{identity.name}</h4>
                      <span className="text-[10px] font-mono font-bold bg-success/15 text-success px-2 py-0.5 rounded border border-success/15">
                        {strength}% strength
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted text-[10px] uppercase font-mono block">Habits Setup</span>
                        <span className="font-semibold text-text">{habitCount} active</span>
                      </div>
                      <div>
                        <span className="text-muted text-[10px] uppercase font-mono block">Total Votes</span>
                        <span className="font-semibold text-text">{totalComp} votes cast</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Identity Philosophy Banner */}
          <Card hoverLift={false} className="border border-border/60 bg-hoverBg/10">
            <CardContent className="p-5 space-y-3 text-xs leading-relaxed text-muted">
              <div className="flex items-center space-x-1.5 text-text font-serif font-bold text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>The 1% Compounding Philosophy</span>
              </div>
              <p>
                "If you can get 1 percent better each day for one year, you’ll end up thirty-seven times better by the time you’re done. Conversely, if you get 1 percent worse each day for one year, you’ll decline nearly down to zero."
              </p>
              <p className="font-medium text-text">
                Every completion - even the 2-minute rule version - is another vote cast for your desired self. Keep casting votes.
              </p>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
