import React, { useState } from 'react';
import { useHabits } from '../context/HabitsContext';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select } from '../components/ui/Primitives';
import { Compass, Flame, ShieldAlert, Save, RefreshCw, EyeOff, Lock, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

import { fetchEnvironmentSuggestions } from '../services/aiService';

export default function EnvironmentDesign() {
  const { 
    identities, 
    habits, 
    badHabits, 
    updateHabit, 
    updateBadHabit 
  } = useHabits();

  const [activeIdentityId, setActiveIdentityId] = useState(identities[0]?.id || 'all');
  
  // Track inputs locally during editing
  const [editedPreps, setEditedPreps] = useState({});
  const [editedBrakes, setEditedBrakes] = useState({});
  const [coachLoading, setCoachLoading] = useState({});

  // Get filtered lists
  const filteredHabits = activeIdentityId === 'all'
    ? habits
    : habits.filter(h => h.identityId === activeIdentityId);

  const filteredBadHabits = activeIdentityId === 'all'
    ? badHabits
    : badHabits.filter(bh => bh.identityId === activeIdentityId);

  // Engines handlers (good habits space prep)
  const handlePrepChange = (habitId, value) => {
    setEditedPreps(prev => ({ ...prev, [habitId]: value }));
  };

  const handleSavePrep = async (habitId) => {
    const newVal = editedPreps[habitId];
    if (newVal === undefined) return;
    
    try {
      await updateHabit(habitId, { environmentPrep: newVal });
      toast.success("Good habit Engine strategy locked!", {
        style: { background: '#FFFAF3', color: '#4A4036', border: '1px solid #EAE4DD' }
      });
    } catch (error) {
      console.error("Failed to save habit prep:", error);
      toast.error("Failed to save. Please try again.");
    }
  };

  // Brakes handlers (bad habits friction rules)
  const handleBrakesChange = (badHabitId, field, value) => {
    setEditedBrakes(prev => ({
      ...prev,
      [badHabitId]: {
        ...(prev[badHabitId] || {}),
        [field]: value
      }
    }));
  };

  const handleSaveBrakes = async (badHabitId) => {
    const changes = editedBrakes[badHabitId];
    if (!changes) return;

    try {
      await updateBadHabit(badHabitId, changes);
      toast.success("Bad habit Brakes strategy locked!", {
        style: { background: '#FFFAF3', color: '#4A4036', border: '1px solid #EAE4DD' }
      });
    } catch (error) {
      console.error("Failed to save bad habit brakes:", error);
      toast.error("Failed to save. Please try again.");
    }
  };

  // Environment Coach suggestions from Gemini (falls back to local heuristics)
  const handleAskCoach = async (type, targetId, habitName) => {
    setCoachLoading(prev => ({ ...prev, [targetId]: true }));
    
    try {
      // 900ms delay to keep the spinner visible and UI feel natural
      await new Promise(resolve => setTimeout(resolve, 900));
      
      const suggestions = await fetchEnvironmentSuggestions(type, habitName);
      
      if (type === 'engine') {
        setEditedPreps(prev => ({ ...prev, [targetId]: suggestions.suggestion || '' }));
      } else {
        setEditedBrakes(prev => ({
          ...prev,
          [targetId]: {
            invisibleStrategy: suggestions.invisibleStrategy || '',
            difficultStrategy: suggestions.difficultStrategy || ''
          }
        }));
      }

      toast.success("Coach recommendations loaded!", {
        style: { background: '#FFFAF3', color: '#4A4036', border: '1px solid #EAE4DD' }
      });
    } catch (error) {
      console.error("Failed to load environment coach suggestions:", error);
      toast.error("Failed to load suggestions. Using local fallback.");
    } finally {
      setCoachLoading(prev => ({ ...prev, [targetId]: false }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 select-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border/40 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-text">Environment Architect</h1>
          <p className="text-sm text-muted mt-1">
            "Environment is the invisible hand that shapes human behavior." Prime your cues and install brakes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-mono tracking-widest text-muted">Focus:</span>
          <Select 
            value={activeIdentityId} 
            onChange={(e) => setActiveIdentityId(e.target.value)}
            className="w-48 text-xs font-semibold"
          >
            <option value="all">All Identities</option>
            {identities.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: THE ENGINES (Good Habits Prep) */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2 border-b border-success/30 pb-3">
            <Flame className="w-5 h-5 text-success" />
            <h2 className="text-xl font-bold font-serif text-text">The Engines (Good Habits Cues)</h2>
          </div>
          
          <div className="bg-success/5 border border-success/15 p-4 rounded-xl text-xs text-text leading-relaxed">
            <span className="font-bold text-success">3rd Law: Make it Easy.</span> Reduce friction to make good habits obvious. Set out gym gear, keep guitar in middle of room, or place book on pillow. Prime your environment.
          </div>

          {filteredHabits.length === 0 ? (
            <p className="text-sm text-muted italic text-center py-10">No good habits defined for this identity.</p>
          ) : (
            filteredHabits.map(habit => {
              const currentPrep = editedPreps[habit.id] !== undefined ? editedPreps[habit.id] : (habit.environmentPrep || '');
              const isEdited = editedPreps[habit.id] !== undefined && editedPreps[habit.id] !== (habit.environmentPrep || '');

              return (
                <Card key={habit.id} hoverLift={false} className="border border-border/60">
                  <CardHeader className="py-3 flex flex-row items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-success bg-success/10 px-2 py-0.5 rounded">
                        {identities.find(i => i.id === habit.identityId)?.name || 'Identity'}
                      </span>
                      <CardTitle className="text-base font-bold text-text mt-1">{habit.title}</CardTitle>
                    </div>

                    <button
                      onClick={() => handleAskCoach('engine', habit.id, habit.title)}
                      disabled={coachLoading[habit.id]}
                      className="text-[10px] font-semibold text-primary border border-primary/20 bg-hoverBg hover:bg-hoverBg/80 px-2 py-0.8 rounded cursor-pointer"
                    >
                      {coachLoading[habit.id] ? "Loading..." : "✨ Ask Coach"}
                    </button>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {habit.stackedHabit && (
                      <p className="text-xs text-muted italic leading-relaxed">
                        <span className="font-semibold text-text">Anchor Trigger: </span>
                        "{habit.stackedHabit}..."
                      </p>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono tracking-widest text-text font-bold">Space Preparation Strategy</label>
                      <div className="flex gap-2">
                        <Input
                          value={currentPrep}
                          onChange={(e) => handlePrepChange(habit.id, e.target.value)}
                          placeholder="e.g. Lay out shoes by bed, place notebook open on desk..."
                          className="flex-1 text-xs"
                        />
                        <Button
                          size="sm"
                          variant={isEdited ? "default" : "outline"}
                          disabled={!isEdited}
                          onClick={() => handleSavePrep(habit.id)}
                          className="h-10 text-xs px-3"
                        >
                          <Save className="w-3.5 h-3.5 mr-1" />
                          Lock
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* RIGHT COLUMN: THE BRAKES (Bad Habits Impediments) */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2 border-b border-primary/30 pb-3">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold font-serif text-text">The Brakes (Anti-Habits Friction)</h2>
          </div>

          <div className="bg-primary/5 border border-primary/15 p-4 rounded-xl text-xs text-text leading-relaxed">
            <span className="font-bold text-primary">3rd Law Inversion: Make it Difficult.</span> Increase friction to make bad habits unreachable. Leave charger in hallway, lock cupboard, block domains. Build obstacles.
          </div>

          {filteredBadHabits.length === 0 ? (
            <p className="text-sm text-muted italic text-center py-10">No anti-habits defined for this identity.</p>
          ) : (
            filteredBadHabits.map(bh => {
              const localChanges = editedBrakes[bh.id] || {};
              const currentInvisible = localChanges.invisibleStrategy !== undefined ? localChanges.invisibleStrategy : (bh.invisibleStrategy || '');
              const currentDifficult = localChanges.difficultStrategy !== undefined ? localChanges.difficultStrategy : (bh.difficultStrategy || '');
              
              const isEdited = localChanges.invisibleStrategy !== undefined && localChanges.invisibleStrategy !== (bh.invisibleStrategy || '') ||
                               localChanges.difficultStrategy !== undefined && localChanges.difficultStrategy !== (bh.difficultStrategy || '');

              return (
                <Card key={bh.id} hoverLift={false} className="border border-border/60">
                  <CardHeader className="py-3 flex flex-row items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {identities.find(i => i.id === bh.identityId)?.name || 'Identity'}
                      </span>
                      <CardTitle className="text-base font-bold text-text mt-1">{bh.name}</CardTitle>
                    </div>

                    <button
                      onClick={() => handleAskCoach('brake', bh.id, bh.name)}
                      disabled={coachLoading[bh.id]}
                      className="text-[10px] font-semibold text-primary border border-primary/20 bg-hoverBg hover:bg-hoverBg/80 px-2 py-0.8 rounded cursor-pointer"
                    >
                      {coachLoading[bh.id] ? "Loading..." : "✨ Ask Coach"}
                    </button>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {bh.trigger && (
                      <p className="text-xs text-muted leading-relaxed">
                        <span className="font-semibold text-text">Trigger: </span>
                        "{bh.trigger}"
                      </p>
                    )}

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono tracking-widest text-text font-bold flex items-center gap-1">
                          <EyeOff className="w-3 h-3 text-primary" /> Make it Invisible
                        </label>
                        <Input
                          value={currentInvisible}
                          onChange={(e) => handleBrakesChange(bh.id, 'invisibleStrategy', e.target.value)}
                          placeholder="e.g. Put junk food in highest pantry opaque drawer..."
                          className="text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono tracking-widest text-text font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3 text-primary" /> Make it Difficult (Commitment Device)
                        </label>
                        <Input
                          value={currentDifficult}
                          onChange={(e) => handleBrakesChange(bh.id, 'difficultStrategy', e.target.value)}
                          placeholder="e.g. Lock snacks. Lock phone charger in pantry kitchen..."
                          className="text-xs"
                        />
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          disabled={!isEdited}
                          onClick={() => handleSaveBrakes(bh.id)}
                          className="text-xs px-4"
                        >
                          <Save className="w-3.5 h-3.5 mr-1" />
                          Save Friction Settings
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
