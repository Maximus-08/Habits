import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useHabits } from '../context/HabitsContext';
import { Button, Card, CardContent, Input, Textarea, Select, InfoTooltip } from '../components/ui/Primitives';
import { Sparkles, ArrowRight, ArrowLeft, Target, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ["Physical Health", "Mind & Creativity", "Work & Finance", "Relationships & Social", "Personal Growth"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { addIdentity, addHabit } = useHabits();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form states
  const [identityName, setIdentityName] = useState('');
  const [beliefStatement, setBeliefStatement] = useState('');
  
  const [habitTitle, setHabitTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [time, setTime] = useState('08:00 AM');
  const [location, setLocation] = useState('My Desk');
  const [stackedHabit, setStackedHabit] = useState('');
  const [twoMinRule, setTwoMinRule] = useState('');
  const [environmentPrep, setEnvironmentPrep] = useState('');
  const [immediateReward, setImmediateReward] = useState('');

  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Simple heuristic/local AI coaches based on identity name
  const fetchLocalSuggestions = () => {
    setAiLoading(true);
    setTimeout(() => {
      const name = identityName.toLowerCase();
      let suggestions = {
        stackedHabit: "After I pour my morning cup of coffee",
        twoMinRule: "Read 1 page of a book or write 1 sentence",
        environmentPrep: "Place my notebook open on the desk with a pen next to it before bed",
        immediateReward: "Tick off my tracker and drink a warm cup of coffee"
      };

      if (name.includes('athlete') || name.includes('fit') || name.includes('health') || name.includes('runner')) {
        suggestions = {
          stackedHabit: "After I drink my first glass of water in the morning",
          twoMinRule: "Do 5 bodyweight squats and 1 stretch",
          environmentPrep: "Lay out my workout shoes and clothes next to my bed the night before",
          immediateReward: "Enjoy a cold glass of lemon water or protein shake"
        };
      } else if (name.includes('writer') || name.includes('creative') || name.includes('book') || name.includes('journal')) {
        suggestions = {
          stackedHabit: "After I close my laptop screen at the end of my workday",
          twoMinRule: "Write 10 words or sketch for 2 minutes",
          environmentPrep: "Leave my journal open on my favorite desk spot with a pilot pen",
          immediateReward: "Listen to 1 favorite ambient track with headphones"
        };
      } else if (name.includes('mind') || name.includes('zen') || name.includes('calm') || name.includes('meditat')) {
        suggestions = {
          stackedHabit: "After I brush my teeth in the morning",
          twoMinRule: "Sit in silence and take 3 deep breaths",
          environmentPrep: "Put a meditation cushion in the quiet corner of the bedroom",
          immediateReward: "Gently stretch my shoulders and smile for 5 seconds"
        };
      }
      setAiSuggestions(suggestions);
      setAiLoading(false);
    }, 800);
  };

  const applySuggestion = (field) => {
    if (!aiSuggestions) return;
    if (field === 'stackedHabit') setStackedHabit(aiSuggestions.stackedHabit);
    if (field === 'twoMinRule') setTwoMinRule(aiSuggestions.twoMinRule);
    if (field === 'environmentPrep') setEnvironmentPrep(aiSuggestions.environmentPrep);
    if (field === 'immediateReward') setImmediateReward(aiSuggestions.immediateReward);
  };

  const handleNext = () => {
    if (step === 1 && !identityName.trim()) return;
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleFinish = async (e) => {
    e.preventDefault();
    if (!habitTitle.trim()) return;

    setLoading(true);
    sessionStorage.setItem('onboarding_submitted', 'true');

    try {
      // 1. Save Identity
      const identityRes = await addIdentity(
        identityName, 
        beliefStatement || `I am the type of person who is a committed ${identityName}.`
      );

      // 2. Save Habit linked to this Identity
      await addHabit({
        identityId: identityRes.id,
        identityName: identityRes.name,
        title: habitTitle,
        description: `Core daily routine supporting my identity as ${identityRes.name}.`,
        category,
        time,
        location,
        stackedHabit,
        twoMinRule,
        environmentPrep,
        immediateReward
      });

      // Navigate directly - Firestore snapshots handles context sync
      navigate('/dashboard');
    } catch (err) {
      console.error("Onboarding setup error:", err);
      sessionStorage.removeItem('onboarding_submitted');
      toast.error(`Setup failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const variants = {
    enter: { opacity: 0, y: 15 },
    center: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg select-none">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <span className="text-xs uppercase tracking-widest text-primary font-mono font-bold bg-hoverBg px-3 py-1 rounded-full border border-border/50">
            Step {step} of 2
          </span>
          <h1 className="text-3xl font-serif font-bold text-text mt-3">Habits</h1>
          <p className="text-sm text-muted mt-1">Design a system that locks in your identity.</p>
        </div>

        <Card hoverLift={false} className="border border-border/60 shadow-lg">
          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-hoverBg text-primary rounded-full border border-border/40">
                      <Target className="w-8 h-8" />
                    </div>
                  </div>
                  
                  <div className="text-center space-y-1">
                    <h2 className="text-xl font-serif font-semibold text-text">
                      Who do you want to become?
                    </h2>
                    <p className="text-xs text-muted">
                      Start at the core: change your identity before you change your processes.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-text uppercase tracking-wide flex items-center">
                        Identity Name
                        <InfoTooltip content="The noun of who you want to become. E.g. 'The Athlete', 'The Writer', 'The Scholar', 'The Creator'." />
                      </label>
                      <Input
                        value={identityName}
                        onChange={(e) => setIdentityName(e.target.value)}
                        placeholder="e.g. The Athlete"
                        required
                        className="h-11 text-base"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-text uppercase tracking-wide flex items-center">
                        Belief Statement
                        <InfoTooltip content="Your core belief statement about this identity. Formulation: 'I am a person who...'" />
                      </label>
                      <Textarea
                        value={beliefStatement}
                        onChange={(e) => setBeliefStatement(e.target.value)}
                        placeholder="e.g. I am a healthy person who respects my body and builds strength daily."
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleNext}
                    disabled={!identityName.trim()}
                    className="w-full mt-4 h-11"
                  >
                    <span>Define Habit System</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={handleBack} 
                      className="text-xs text-muted hover:text-text flex items-center font-medium transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                      Back
                    </button>
                    
                    <button
                      type="button"
                      onClick={fetchLocalSuggestions}
                      disabled={aiLoading}
                      className="text-xs font-semibold text-primary hover:bg-hoverBg border border-primary/20 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {aiLoading ? "Coaching..." : "✨ Ask Environment Coach"}
                    </button>
                  </div>

                  <div className="text-center space-y-1">
                    <h2 className="text-xl font-serif font-semibold text-text">
                      Create Your First Habit Loop
                    </h2>
                    <p className="text-xs text-muted">
                      Map this habit to the 4 Laws of Behavior Change to make it inevitable.
                    </p>
                  </div>

                  <form onSubmit={handleFinish} className="space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-semibold text-text uppercase">Habit Title</label>
                        <Input
                          value={habitTitle}
                          onChange={(e) => setHabitTitle(e.target.value)}
                          placeholder="e.g. Morning Bodyweight Workout"
                          required
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-text uppercase">Category</label>
                        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-text uppercase">Time & Location</label>
                        <div className="flex gap-1.5">
                          <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="07:30 AM" className="text-xs px-2" />
                          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Living Room" className="text-xs px-2" />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border/40 my-3" />

                    {/* 4 Laws Form Blocks */}
                    <div className="space-y-3.5">
                      <div className="bg-bg/40 p-3 rounded-lg border border-border/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-text uppercase tracking-wider flex items-center">
                            1. Stacked Routine (Obvious)
                            <InfoTooltip content="Stacked Routine (1st Law): Anchor your new habit to a current daily anchor. Formulation: 'After I [current habit], I will [new habit].'" />
                          </label>
                          {aiSuggestions && (
                            <button type="button" onClick={() => applySuggestion('stackedHabit')} className="text-[10px] text-primary hover:underline font-semibold cursor-pointer">
                              Use Coach Suggestion
                            </button>
                          )}
                        </div>
                        <Input
                          value={stackedHabit}
                          onChange={(e) => setStackedHabit(e.target.value)}
                          placeholder="e.g. After I drink my morning glass of water"
                        />
                      </div>

                      <div className="bg-bg/40 p-3 rounded-lg border border-border/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-text uppercase tracking-wider flex items-center">
                            2. Environment Prep (Easy)
                            <InfoTooltip content="Environment Prep (3rd Law): Set up your physical space to make the trigger highly obvious and reduce friction. E.g. Lay out clothes, open laptop." />
                          </label>
                          {aiSuggestions && (
                            <button type="button" onClick={() => applySuggestion('environmentPrep')} className="text-[10px] text-primary hover:underline font-semibold cursor-pointer">
                              Use Coach Suggestion
                            </button>
                          )}
                        </div>
                        <Input
                          value={environmentPrep}
                          onChange={(e) => setEnvironmentPrep(e.target.value)}
                          placeholder="e.g. Lay out exercise mat next to the coffee table before bed"
                        />
                      </div>

                      <div className="bg-bg/40 p-3 rounded-lg border border-border/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-text uppercase tracking-wider flex items-center">
                            3. Two-Minute Rule (Easy Starter)
                            <InfoTooltip content="Two-Minute Rule (3rd Law): Simplify the habit to a version that takes 2 minutes or less. This keeps the loop active when you are tired. E.g. Do 5 squats." />
                          </label>
                          {aiSuggestions && (
                            <button type="button" onClick={() => applySuggestion('twoMinRule')} className="text-[10px] text-primary hover:underline font-semibold cursor-pointer">
                              Use Coach Suggestion
                            </button>
                          )}
                        </div>
                        <Input
                          value={twoMinRule}
                          onChange={(e) => setTwoMinRule(e.target.value)}
                          placeholder="e.g. Do 5 bodyweight squats and 1 plank"
                        />
                      </div>

                      <div className="bg-bg/40 p-3 rounded-lg border border-border/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-text uppercase tracking-wider flex items-center">
                            4. Immediate Reward (Satisfying)
                            <InfoTooltip content="Immediate Reward (4th Law): Reward yourself immediately after completing the habit. Formulation: E.g. enjoy a fresh drink." />
                          </label>
                          {aiSuggestions && (
                            <button type="button" onClick={() => applySuggestion('immediateReward')} className="text-[10px] text-primary hover:underline font-semibold cursor-pointer">
                              Use Coach Suggestion
                            </button>
                          )}
                        </div>
                        <Input
                          value={immediateReward}
                          onChange={(e) => setImmediateReward(e.target.value)}
                          placeholder="e.g. Enjoy a cool protein shake and sit down to read"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading || !habitTitle.trim()}
                      className="w-full mt-4 h-11"
                    >
                      {loading ? "Locking in Identity..." : "Lock in Identity & Go to Dashboard"}
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
