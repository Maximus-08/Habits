import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHabits } from '../context/HabitsContext';
import { Card, CardHeader, CardTitle, CardContent, Button, Textarea, Slider } from '../components/ui/Primitives';
import { FileText, ClipboardCheck, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WeeklyReview() {
  const navigate = useNavigate();
  const { weeklyReviews, saveWeeklyReview, currentUser, initialSyncCompleted } = useHabits();

  // Determine current year & week number
  const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return weekNo;
  };

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentWeekNumber = getWeekNumber(today);
  const reviewId = `${currentYear}-week-${currentWeekNumber}`;

  const getWeekRange = (year, week) => {
    const simple = new Date(year, 0, 4);
    const dayOfWeek = simple.getDay();
    const ISOweekStart = new Date(simple.setDate(simple.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)));
    const start = new Date(ISOweekStart.setDate(ISOweekStart.getDate() + (week - 1) * 7));
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    const formatDate = (date) => {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };
    return `${formatDate(start)} – ${formatDate(end)}`;
  };

  // Form states
  const [satisfaction, setSatisfaction] = useState(7);
  const [wins, setWins] = useState('');
  const [challenges, setChallenges] = useState('');
  const [learning, setLearning] = useState('');
  const [nextWeek, setNextWeek] = useState('');
  const [status, setStatus] = useState('draft'); // 'draft' or 'completed'
  const [submitting, setSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load existing review if present
  useEffect(() => {
    if (isInitialized || !initialSyncCompleted) return;
    const existingReview = weeklyReviews.find(r => r.id === reviewId);
    if (existingReview) {
      setSatisfaction(existingReview.satisfaction ?? 7);
      setWins(existingReview.reflection?.wins || '');
      setChallenges(existingReview.reflection?.challenges || '');
      setLearning(existingReview.reflection?.learning || '');
      setNextWeek(existingReview.reflection?.nextWeek || '');
      setStatus(existingReview.status || 'draft');
    }
    setIsInitialized(true);
  }, [weeklyReviews, reviewId, initialSyncCompleted, isInitialized]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const reviewData = {
        id: reviewId,
        userId: currentUser?.uid || "user_default",
        year: currentYear,
        weekNumber: currentWeekNumber,
        satisfaction,
        reflection: {
          wins,
          challenges,
          learning,
          nextWeek
        },
        status
      };

      await saveWeeklyReview(reviewData);

      const message = status === 'completed' 
        ? "Weekly review locked in! System updated." 
        : "Draft saved successfully.";
      
      toast.success(message, {
        style: { background: '#FFFAF3', color: '#4A4036', border: '1px solid #EAE4DD' }
      });

      navigate(status === 'completed' ? '/analytics#reflections' : '/dashboard');
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to save weekly review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 select-none">

      <div className="flex items-center space-x-3 mb-6 border-b border-border/40 pb-5">
        <FileText className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold font-serif text-text">Weekly Reflection</h1>
          <p className="text-sm text-muted mt-1 font-mono">
            Year {currentYear} • Week {currentWeekNumber} ({getWeekRange(currentYear, currentWeekNumber)})
          </p>
        </div>
      </div>

      <Card hoverLift={false} className="border border-border/60 shadow-md">
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Warning block about review philosophy */}
            <div className="bg-bg/50 border border-border/60 p-4 rounded-xl text-xs text-muted flex gap-2.5">
              <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="leading-relaxed space-y-1">
                <span className="font-semibold text-text">James Clear's Reflection System:</span>
                <p>
                  Reviewing your systems is essential. It's not about measuring flawless performance, but auditing your environment and habits. Where did you slip? How can you make good habits easier and bad habits harder next week?
                </p>
              </div>
            </div>

            {/* Satisfaction score slider */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text uppercase tracking-wider block">
                How satisfied are you with your systems this week? (0–10)
              </label>
              <Slider
                value={satisfaction}
                onChange={(e) => setSatisfaction(parseInt(e.target.value, 10))}
                min={0}
                max={10}
              />
            </div>

            {/* The 4 Reflection blocks */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text uppercase tracking-wider block">
                  1. What were your wins? (What worked in your systems?)
                </label>
                <Textarea
                  value={wins}
                  onChange={(e) => setWins(e.target.value)}
                  placeholder="E.g., Did 5 workouts, the cue of laying out the exercise mat worked perfectly..."
                  rows={3}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text uppercase tracking-wider block">
                  2. What challenges did you face? (Where did you drift?)
                </label>
                <Textarea
                  value={challenges}
                  onChange={(e) => setChallenges(e.target.value)}
                  placeholder="E.g., Felt too lazy to write on Thursday, stayed up late scrolling phone in bed on Friday..."
                  rows={3}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text uppercase tracking-wider block">
                  3. What did you learn this week?
                </label>
                <Textarea
                  value={learning}
                  onChange={(e) => setLearning(e.target.value)}
                  placeholder="E.g., Phone screen cue in bedroom is too strong. Must move charger to kitchen corridor..."
                  rows={3}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text uppercase tracking-wider block">
                  4. What will you focus on next week? (Environment refinements)
                </label>
                <Textarea
                  value={nextWeek}
                  onChange={(e) => setNextWeek(e.target.value)}
                  placeholder="E.g., Keep snacks locked in safe, enforce brush-teeth rule at 9:00 PM..."
                  rows={3}
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Toggle Draft vs Complete */}
            <div className="flex items-center gap-4 border-t border-border/25 pt-5 mt-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="mark-complete"
                  checked={status === 'completed'}
                  onChange={(e) => setStatus(e.target.checked ? 'completed' : 'draft')}
                  className="w-4 w-4 text-primary rounded border-border focus:ring-primary accent-primary cursor-pointer"
                  disabled={submitting}
                />
                <label htmlFor="mark-complete" className="text-xs font-semibold text-text uppercase tracking-wide cursor-pointer">
                  Mark Review as Complete (Lock reflection)
                </label>
              </div>
            </div>

            {/* Form actions */}
            <div className="flex items-center justify-end gap-2 border-t border-border/20 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard')} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                <ClipboardCheck className="w-4 h-4 mr-2" />
                {submitting ? "Saving..." : (status === 'completed' ? "Lock Review" : "Save Draft")}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
