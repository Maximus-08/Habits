import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Sparkles, BookOpen, AlertCircle, Calendar, ArrowRight,
  TrendingUp, Activity, Award, ShieldAlert, FileText, Settings, UserPlus, HelpCircle,
  Edit2, Trash2
} from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { useHabits, LEVELS } from '../context/HabitsContext';
import HabitCard from '../components/HabitCard';
import BadHabitCard from '../components/BadHabitCard';
import Heatmap from '../components/Heatmap';
import InteractiveGuide from '../components/InteractiveGuide';
import { Button, Card, CardHeader, CardTitle, CardContent, Dialog, Input, Textarea, Select } from '../components/ui/Primitives';
import toast from 'react-hot-toast';
import { getLocalDateString, timeToMinutes, getWeekNumber } from '../utils/dateUtils';

const CATEGORIES = ["Physical Health", "Mind & Creativity", "Work & Finance", "Relationships & Social", "Personal Growth"];

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    currentUser,
    userProfile,
    identities,
    habits,
    badHabits,
    completions,
    weeklyReviews,
    selectedDate,
    setSelectedDate,
    addIdentity,
    updateIdentity,
    deleteIdentity,
    addHabit,
    updateHabit,
    deleteHabit,
    addBadHabit,
    deleteBadHabit,
    getIdentityStrength,
    getDaysFree,
    getLevelProgress,
    getIdentityLevelProgress
  } = useHabits();

  // Guide force start state
  const [guideForceStart, setGuideForceStart] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tutorial') === 'true') {
      setGuideForceStart(true);
      navigate('/dashboard', { replace: true });
    }
  }, [location, navigate]);

  // Dialog states
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [badHabitModalOpen, setBadHabitModalOpen] = useState(false);

  // Loading states
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingHabit, setSavingHabit] = useState(false);
  const [savingBadHabit, setSavingBadHabit] = useState(false);
  
  // Edit targets
  const [editingHabit, setEditingHabit] = useState(null);
  const [editingIdentity, setEditingIdentity] = useState(null);

  // Identity Form State
  const [idName, setIdName] = useState('');
  const [idBelief, setIdBelief] = useState('');

  // Habit Form State
  const [hTitle, setHTitle] = useState('');
  const [hCategory, setHCategory] = useState(CATEGORIES[0]);
  const [hTime, setHTime] = useState('');
  const [hLoc, setHLoc] = useState('');
  const [hStack, setHStack] = useState('');
  const [hTwoMin, setHTwoMin] = useState('');
  const [hPrep, setHPrep] = useState('');
  const [hReward, setHReward] = useState('');
  const [hIdentityId, setHIdentityId] = useState('');

  // Bad Habit Form State
  const [bhName, setBhName] = useState('');
  const [bhTrigger, setBhTrigger] = useState('');
  const [bhInvisible, setBhInvisible] = useState('');
  const [bhDifficult, setBhDifficult] = useState('');
  const [bhIdentityId, setBhIdentityId] = useState('');

  // Active identity filtering (default: All)
  const [filterIdentityId, setFilterIdentityId] = useState('all');

  // Reset filter if active identity is deleted
  useEffect(() => {
    if (filterIdentityId !== 'all' && !identities.some(i => i.id === filterIdentityId)) {
      setFilterIdentityId('all');
    }
  }, [identities, filterIdentityId]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Check if current week's manual review is completed (for reminder banner on Fri/Sat/Sun)
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
  const isReviewDay = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
  const currentYear = today.getFullYear();
  const currentWeekNum = getWeekNumber(today);
  const isReviewCompleted = weeklyReviews.some(
    r => r.year === currentYear && r.weekNumber === currentWeekNum && r.status === 'completed'
  );
  const showReviewReminder = isReviewDay && !isReviewCompleted;

  // Level Progression Math
  const levelProgress = getLevelProgress();

  // CRUD actions handlers
  const handleSaveIdentity = async (e) => {
    e.preventDefault();
    if (!idName.trim()) return;
    
    // Check for duplicate name
    const isDuplicate = identities.some(i => 
      (!editingIdentity || i.id !== editingIdentity.id) && 
      i.name.trim().toLowerCase() === idName.trim().toLowerCase()
    );
    if (isDuplicate) {
      toast.error("An identity with this name already exists. Focus on refining your current card!");
      return;
    }
    
    setSavingIdentity(true);
    try {
      if (editingIdentity) {
        await updateIdentity(editingIdentity.id, { name: idName, beliefStatement: idBelief });
        toast.success("Identity updated successfully");
      } else {
        await addIdentity(idName, idBelief || `I am the type of person who is a committed ${idName}.`);
        toast.success("Identity established successfully");
      }
      setIdName('');
      setIdBelief('');
      setEditingIdentity(null);
      setIdentityModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to save identity");
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleOpenEditIdentity = (identity) => {
    setEditingIdentity(identity);
    setIdName(identity.name);
    setIdBelief(identity.beliefStatement || '');
    setIdentityModalOpen(true);
  };

  const handleDeleteIdentity = async (id, name) => {
    if (confirm(`Delete identity "${name}" and all linked habits/completions?`)) {
      try {
        await deleteIdentity(id);
        toast.success("Identity deleted");
      } catch (error) {
        console.error(error);
        toast.error(error.message || "Failed to delete identity");
      }
    }
  };

  const handleSaveHabit = async (e) => {
    e.preventDefault();
    if (!hTitle.trim() || !hIdentityId) return;

    const habitData = {
      identityId: hIdentityId,
      title: hTitle,
      category: hCategory,
      time: hTime,
      location: hLoc,
      stackedHabit: hStack,
      twoMinRule: hTwoMin,
      environmentPrep: hPrep,
      immediateReward: hReward
    };

    setSavingHabit(true);
    try {
      if (editingHabit) {
        await updateHabit(editingHabit.id, habitData);
        toast.success("Habit system updated");
      } else {
        await addHabit(habitData);
        toast.success("Habit engine activated");
      }
      resetHabitForm();
      setHabitModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to save habit");
    } finally {
      setSavingHabit(false);
    }
  };

  const handleOpenEditHabit = (habit) => {
    setEditingHabit(habit);
    setHTitle(habit.title);
    setHCategory(habit.category);
    setHTime(habit.time);
    setHLoc(habit.location);
    setHStack(habit.stackedHabit || '');
    setHTwoMin(habit.twoMinRule || '');
    setHPrep(habit.environmentPrep || '');
    setHReward(habit.immediateReward || '');
    setHIdentityId(habit.identityId);
    setHabitModalOpen(true);
  };

  const handleDeleteHabit = async (id) => {
    if (confirm("Are you sure you want to delete this habit?")) {
      try {
        await deleteHabit(id);
        toast.success("Habit deleted");
      } catch (error) {
        console.error(error);
        toast.error(error.message || "Failed to delete habit");
      }
    }
  };

  const resetHabitForm = () => {
    setEditingHabit(null);
    setHTitle('');
    setHCategory(CATEGORIES[0]);
    setHTime('');
    setHLoc('');
    setHStack('');
    setHTwoMin('');
    setHPrep('');
    setHReward('');
    setHIdentityId(identities[0]?.id || '');
  };

  const handleSaveBadHabit = async (e) => {
    e.preventDefault();
    if (!bhName.trim() || !bhIdentityId) return;

    setSavingBadHabit(true);
    try {
      await addBadHabit({
        identityId: bhIdentityId,
        name: bhName,
        trigger: bhTrigger,
        invisibleStrategy: bhInvisible,
        difficultStrategy: bhDifficult
      });
      toast.success("Anti-habit brakes installed");
      setBhName('');
      setBhTrigger('');
      setBhInvisible('');
      setBhDifficult('');
      setBhIdentityId(identities[0]?.id || '');
      setBadHabitModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to save anti-habit");
    } finally {
      setSavingBadHabit(false);
    }
  };

  const handleDeleteBadHabit = async (id) => {
    if (confirm("Are you sure you want to delete this anti-habit?")) {
      try {
        await deleteBadHabit(id);
        toast.success("Anti-habit deleted");
      } catch (error) {
        console.error(error);
        toast.error(error.message || "Failed to delete anti-habit");
      }
    }
  };

  // Environment prep prompt / helper
  const openHabitWithIdentitySeed = (identityId) => {
    resetHabitForm();
    setHIdentityId(identityId);
    setHabitModalOpen(true);
  };

  const openBadHabitWithIdentitySeed = (identityId) => {
    setBhIdentityId(identityId);
    setBadHabitModalOpen(true);
  };

  // Filtered lists
  const filteredIdentities = filterIdentityId === 'all'
    ? identities
    : identities.filter(i => i.id === filterIdentityId);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 select-none">
      {/* 1. Header Greeting Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif text-text leading-tight">
            {greeting}, {currentUser?.displayName?.trim()?.split(' ')[0] || currentUser?.email?.split('@')[0] || 'Explorer'}
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            "Every action you take is a vote for the type of person you wish to become." - James Clear
          </p>
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted flex items-center gap-1 bg-hoverBg px-2.5 py-1.5 rounded-lg border border-border/50">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            Active Logging:
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-border/80 rounded-lg px-3 py-1 text-sm bg-surface text-text font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
            max={getLocalDateString()}
          />
        </div>
      </div>

      {/* 2. Level Progress Tally */}
      <Card hoverLift={false} className="mb-8 border border-border/60" id="walkthrough-level">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-3">
            <div className="flex items-center space-x-3">
              <div className="bg-hoverBg border border-border text-primary font-mono font-bold px-3 py-1 rounded-full text-xs flex items-center">
                <Award className="w-3.5 h-3.5 mr-1" />
                Level {levelProgress.currentLevel}
              </div>
              <h2 className="text-xl font-bold font-serif text-text">
                {levelProgress.currentName}
              </h2>
            </div>
            
            <div className="text-sm font-mono text-muted text-right">
              {userProfile.totalVotes || 0} <span className="font-sans text-[11px]">Total Votes Cast</span>
              {levelProgress.nextLevel && (
                <span className="block text-[11px] text-primary mt-0.5">
                  {levelProgress.votesRemaining} votes left for Level {levelProgress.nextLevel} ({levelProgress.nextName})
                </span>
              )}
            </div>
          </div>
          
          {/* Level slider bar */}
          <div className="relative">
            <div className="h-3 w-full bg-[#F2ECE4] rounded-full overflow-hidden border border-border/40">
              <motion.div
                className="h-full bg-success rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress.progressPercent}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-muted mt-1 px-1">
              <span>{levelProgress.minVotes} v</span>
              <span>{levelProgress.maxVotes ? `${levelProgress.maxVotes} v` : "Max"}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Review Alert Banner */}
      <AnimatePresence>
        {showReviewReminder && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8 bg-hoverBg border border-primary/30 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            id="walkthrough-review-reminder"
          >
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-serif font-semibold text-text text-sm">Weekly reflection is open</h3>
                <p className="text-xs text-muted mt-0.5">
                  Review your systems, reflect on challenges, and redesign your environmental engines and brakes.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/review')}
              className="text-xs shrink-0 self-end md:self-center"
            >
              <span>Begin Reflection</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-mono tracking-widest text-muted">Focus Identity:</span>
          <Select
            value={filterIdentityId}
            onChange={(e) => setFilterIdentityId(e.target.value)}
            className="h-9 py-1 w-44 text-xs font-semibold"
          >
            <option value="all">All Identities</option>
            {identities.map(i => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIdentityModalOpen(true)}
            className="text-xs"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5 text-primary" />
            Define Identity
          </Button>

          <Button
            size="sm"
            onClick={() => {
              if (identities.length === 0) {
                toast("Define an identity card first to anchor your habit system.", { icon: '💡' });
                setIdentityModalOpen(true);
              } else {
                resetHabitForm();
                setHIdentityId(identities[0].id);
                setHabitModalOpen(true);
              }
            }}
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Habit System
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (identities.length === 0) {
                toast("Define an identity card first to anchor your anti-habit.", { icon: '💡' });
                setIdentityModalOpen(true);
              } else {
                setBhIdentityId(identities[0].id);
                setBadHabitModalOpen(true);
              }
            }}
            className="text-xs"
          >
            <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-primary" />
            Add Anti-Habit
          </Button>
        </div>
      </div>

      {/* 5. Main Dashboard Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Habit lists (65%) */}
        <div className="lg:col-span-2 space-y-8" id="walkthrough-identities">
          
          {filteredIdentities.length === 0 ? (
            <Card className="text-center p-12 border border-dashed border-border">
              <CardContent className="space-y-4">
                <div className="text-center flex justify-center text-muted">
                  <Sparkles className="w-12 h-12" />
                </div>
                <h3 className="text-lg font-serif font-bold text-text">No identities defined yet</h3>
                <p className="text-sm text-muted max-w-sm mx-auto">
                  According to James Clear, behavior change starts with identity. Create your first identity architect card now.
                </p>
                <Button onClick={() => setIdentityModalOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Define Identity Card
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredIdentities.map(identity => {
              // Get habits linked to this identity
              const idHabits = habits
                .filter(h => h.identityId === identity.id)
                // Sort chronologically morning -> night
                .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

              const strength = getIdentityStrength(identity.id);
              const idLevelProgress = getIdentityLevelProgress(identity.id);

              return (
                <div key={identity.id} className="space-y-4">
                  {/* Identity Header */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-end border-b border-border/30 pb-3 gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold font-serif text-text">{identity.name}</h2>
                        
                        <div className="bg-hoverBg border border-border text-primary font-mono font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center">
                          <Award className="w-3 h-3 mr-1" />
                          Lvl {idLevelProgress.currentLevel} ({idLevelProgress.currentName})
                        </div>
                        
                        <div className="flex gap-1 opacity-60 hover:opacity-100 transition-opacity items-center">
                          <button
                            onClick={() => handleOpenEditIdentity(identity)}
                            className="p-1 text-muted hover:text-text cursor-pointer transition-colors"
                            title="Edit Identity"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteIdentity(identity.id, identity.name)}
                            className="p-1 text-muted hover:text-primary cursor-pointer transition-colors"
                            title="Delete Identity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted font-serif italic mt-0.5">
                        "{identity.beliefStatement || `I am the type of person who is a committed ${identity.name}.`}"
                      </p>
                    </div>
 
                    {/* Identity Strength Badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-muted uppercase tracking-wider">Identity Strength:</span>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                        strength >= 80 
                          ? 'text-success bg-success/10 border-success/20' 
                          : strength >= 50 
                          ? 'text-forgive bg-forgive/10 border-forgive/20' 
                          : 'text-primary bg-primary/10 border-primary/20'
                      }`}>
                        {strength}% winning election
                      </span>
                    </div>
                  </div>
 
                  {/* Habits list */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="walkthrough-habits-cards">
                    {idHabits.map(habit => (
                      <HabitCard
                        key={habit.id}
                        habit={habit}
                        onEdit={handleOpenEditHabit}
                        onDelete={handleDeleteHabit}
                      />
                    ))}
 
                    {/* Quick helper to add habit under this identity */}
                    <button
                       onClick={() => openHabitWithIdentitySeed(identity.id)}
                      className="border border-dashed border-border/80 hover:border-primary/50 hover:bg-hoverBg/20 rounded-xl p-5 flex flex-col justify-center items-center text-center cursor-pointer transition-all h-[155px]"
                    >
                      <Plus className="w-5 h-5 text-muted hover:text-primary mb-1.5" />
                      <span className="text-xs font-semibold text-text">Prime a new habit engine</span>
                      <span className="text-[10px] text-muted mt-0.5">Anchored to {identity.name}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
 
          {/* ANTI-HABITS / BAD HABITS LIST */}
          <div className="space-y-4 pt-6 border-t border-border/20" id="walkthrough-brakes">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold font-serif text-text flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" />
                Anti-Habits
              </h2>
            </div>
            
            {badHabits.length === 0 ? (
              <p className="text-xs text-muted italic">No active anti-habits tracked. Map behavior to break your bad habits.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {badHabits
                  .filter(bh => filterIdentityId === 'all' || bh.identityId === filterIdentityId)
                  .map(bh => (
                    <BadHabitCard
                      key={bh.id}
                      badHabit={bh}
                      onDelete={handleDeleteBadHabit}
                    />
                  ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Sidebar stats & charts (35%) */}
        <div className="space-y-6">
          
          {/* Circular Gauges for Identity Strength */}
          <Card hoverLift={false} className="border border-border/60">
            <CardHeader className="py-4 border-b border-border/40">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-primary" />
                Identity Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4 space-y-4">
              {identities.length === 0 ? (
                <p className="text-xs text-muted italic text-center py-2">Define identities to see strength scores.</p>
              ) : (
                identities.map(identity => {
                  const strength = getIdentityStrength(identity.id);
                  const chartData = [
                    { name: 'Strength', value: strength, fill: '#A3C9A8' },
                    { name: 'Backdrop', value: 100, fill: '#F2ECE4' }
                  ];

                  return (
                    <div key={identity.id} className="flex items-center gap-4 py-2 border-b border-border/20 last:border-0">
                      {/* Gauge Chart widget */}
                      <div className="w-14 h-14 relative shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadialBarChart 
                            innerRadius="75%" 
                            outerRadius="100%" 
                            data={chartData} 
                            startAngle={90} 
                            endAngle={-270}
                            barSize={6}
                          >
                            <RadialBar 
                              dataKey="value"
                              cornerRadius={4}
                            />
                          </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-bold text-text">
                          {strength}%
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-text truncate">{identity.name}</h4>
                          <span className="text-[9px] font-mono font-bold text-primary bg-primary/10 px-1 py-0.2 rounded">Lvl {getIdentityLevelProgress(identity.id).currentLevel}</span>
                        </div>
                        <p className="text-[10px] text-muted italic truncate">"{identity.beliefStatement}"</p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Sobriety summaries list */}
          <Card hoverLift={false} className="border border-border/60">
            <CardHeader className="py-4 border-b border-border/40">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-primary" />
                Sobriety Counters
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4 space-y-3">
              {badHabits.length === 0 ? (
                <p className="text-xs text-muted italic text-center">No active anti-habits tracked.</p>
              ) : (
                badHabits.map(bh => (
                  <div key={bh.id} className="flex justify-between items-center text-xs py-1.5 border-b border-border/20 last:border-0">
                    <span className="font-medium text-text">{bh.name}</span>
                    <span className="font-mono bg-hoverBg text-text font-bold px-2 py-0.5 rounded border border-border/50">
                      {getDaysFree(bh)} Days Free
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Heatmap Widget */}
          <Heatmap />

        </div>
      </div>

      {/* --- DIALOG MODALS --- */}

      {/* IDENTITY MODAL */}
      <Dialog
        isOpen={identityModalOpen}
        onClose={() => {
          setEditingIdentity(null);
          setIdName('');
          setIdBelief('');
          setIdentityModalOpen(false);
        }}
        title={editingIdentity ? "Refine Identity Architect" : "Define Identity Card"}
      >
        <form onSubmit={handleSaveIdentity} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text uppercase">Identity (Noun)</label>
            <Input
              value={idName}
              onChange={(e) => setIdName(e.target.value)}
              placeholder="e.g. The Athlete, The Mindful Thinker, The Writer"
              required
              disabled={savingIdentity}
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text uppercase">Core Belief (Mantra)</label>
            <Textarea
              value={idBelief}
              onChange={(e) => setIdBelief(e.target.value)}
              placeholder="e.g. I am the type of person who values physical health and respects my body daily."
              rows={3}
              required
              disabled={savingIdentity}
            />
            <p className="text-[10px] text-muted">
              James Clear: Focus on the type of person you wish to become. Identity change builds systems.
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-border/20 pt-4 mt-4">
            <Button 
              type="button" 
              variant="outline" 
              disabled={savingIdentity}
              onClick={() => {
                setIdentityModalOpen(false);
                setEditingIdentity(null);
                setIdName('');
                setIdBelief('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={savingIdentity}>
              {savingIdentity ? "Saving..." : (editingIdentity ? "Update Identity" : "Establish Identity")}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* GOOD HABIT MODAL */}
      <Dialog
        isOpen={habitModalOpen}
        onClose={() => setHabitModalOpen(false)}
        title={editingHabit ? "Refine Habit System" : "Add Habit Engine"}
      >
        <form onSubmit={handleSaveHabit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-text uppercase">Habit Title</label>
              <Input
                value={hTitle}
                onChange={(e) => setHTitle(e.target.value)}
                placeholder="e.g. Morning Squats, Daily Journaling"
                required
                disabled={savingHabit}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text uppercase">Link to Identity</label>
              <Select value={hIdentityId} onChange={(e) => setHIdentityId(e.target.value)} required disabled={savingHabit}>
                {identities.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text uppercase">Category</label>
              <Select value={hCategory} onChange={(e) => setHCategory(e.target.value)} disabled={savingHabit}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text uppercase">Scheduled Time</label>
              <Input value={hTime} onChange={(e) => setHTime(e.target.value)} placeholder="07:30 AM (Optional)" disabled={savingHabit} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text uppercase">Location</label>
              <Input value={hLoc} onChange={(e) => setHLoc(e.target.value)} placeholder="Living Room (Optional)" disabled={savingHabit} />
            </div>
          </div>

          <div className="border-t border-border/20 pt-3" />
          <h4 className="text-[10px] font-bold text-text uppercase tracking-widest mb-1">Four Laws Blueprint</h4>

          <div className="space-y-3">
            <div className="space-y-1 bg-bg/40 p-2.5 rounded border border-border/30">
              <label className="text-[10px] font-bold text-text uppercase tracking-wider flex items-center">
                Habit Stack (Obvious)
              </label>
              <Input
                value={hStack}
                onChange={(e) => setHStack(e.target.value)}
                placeholder="After I [current habit]... (e.g., drink morning glass of water)"
                disabled={savingHabit}
              />
            </div>

            <div className="space-y-1 bg-bg/40 p-2.5 rounded border border-border/30">
              <label className="text-[10px] font-bold text-text uppercase tracking-wider flex items-center">
                Environment Prep (Easy)
              </label>
              <Input
                value={hPrep}
                onChange={(e) => setHPrep(e.target.value)}
                placeholder="To prime space... (e.g., layout mat next to coffee table)"
                disabled={savingHabit}
              />
            </div>

            <div className="space-y-1 bg-bg/40 p-2.5 rounded border border-border/30">
              <label className="text-[10px] font-bold text-text uppercase tracking-wider flex items-center">
                Two-Minute Rule (Easy)
              </label>
              <Input
                value={hTwoMin}
                onChange={(e) => setHTwoMin(e.target.value)}
                placeholder="Simplified version... (e.g., do 5 bodyweight squats and 1 plank)"
                disabled={savingHabit}
              />
            </div>

            <div className="space-y-1 bg-bg/40 p-2.5 rounded border border-border/30">
              <label className="text-[10px] font-bold text-text uppercase tracking-wider flex items-center">
                Immediate Reward (Satisfying)
              </label>
              <Input
                value={hReward}
                onChange={(e) => setHReward(e.target.value)}
                placeholder="After completion... (e.g., enjoy protein shake)"
                disabled={savingHabit}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border/20 pt-4 mt-4">
            <Button type="button" variant="outline" onClick={() => setHabitModalOpen(false)} disabled={savingHabit}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingHabit}>
              {savingHabit ? "Saving..." : (editingHabit ? "Update System" : "Activate System")}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* BAD HABIT MODAL */}
      <Dialog
        isOpen={badHabitModalOpen}
        onClose={() => setBadHabitModalOpen(false)}
        title="Add Anti-Habit (Friction Installation)"
      >
        <form onSubmit={handleSaveBadHabit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-text uppercase">Anti-Habit Name</label>
              <Input
                value={bhName}
                onChange={(e) => setBhName(e.target.value)}
                placeholder="e.g. Late Night Snacking, Doom Scrolling"
                required
                disabled={savingBadHabit}
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-text uppercase">Link to Identity</label>
              <Select value={bhIdentityId} onChange={(e) => setBhIdentityId(e.target.value)} required disabled={savingBadHabit}>
                {identities.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </Select>
            </div>
          </div>

          <div className="border-t border-border/20 pt-3" />
          <h4 className="text-[10px] font-bold text-text uppercase tracking-widest mb-1">Inversion (Friction Setup)</h4>

          <div className="space-y-3">
            <div className="space-y-1 bg-bg/40 p-2.5 rounded border border-border/30">
              <label className="text-[10px] font-bold text-text uppercase tracking-wider">Identified Trigger (Make it Invisible)</label>
              <Input
                value={bhTrigger}
                onChange={(e) => setBhTrigger(e.target.value)}
                placeholder="Visual cue or situation... (e.g. Watching TV late when bored)"
                disabled={savingBadHabit}
              />
            </div>

            <div className="space-y-1 bg-bg/40 p-2.5 rounded border border-border/30">
              <label className="text-[10px] font-bold text-text uppercase tracking-wider">Invisible Strategy (1st Law Inversion)</label>
              <Input
                value={bhInvisible}
                onChange={(e) => setBhInvisible(e.target.value)}
                placeholder="Hide cue... (e.g. Remove junk food from eye-level pantry shelves)"
                disabled={savingBadHabit}
              />
            </div>

            <div className="space-y-1 bg-bg/40 p-2.5 rounded border border-border/30">
              <label className="text-[10px] font-bold text-text uppercase tracking-wider">Difficult Strategy / commitment Device (3rd Law Inversion)</label>
              <Input
                value={bhDifficult}
                onChange={(e) => setBhDifficult(e.target.value)}
                placeholder="Add obstacles... (e.g. Lock pantry cupboards after 9:00 PM)"
                disabled={savingBadHabit}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border/20 pt-4 mt-4">
            <Button type="button" variant="outline" onClick={() => setBadHabitModalOpen(false)} disabled={savingBadHabit}>
              Cancel
            </Button>
            <Button id="btn-install-brakes" type="submit" disabled={savingBadHabit}>
              {savingBadHabit ? "Installing..." : "Install Brakes"}
            </Button>
          </div>
        </form>
      </Dialog>

      <InteractiveGuide forceStart={guideForceStart} onComplete={() => setGuideForceStart(false)} />
    </div>
  );
}
