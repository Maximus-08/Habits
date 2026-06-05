import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, RefreshCw, EyeOff, Lock, Trash2, Calendar } from 'lucide-react';
import { useHabits } from '../context/HabitsContext';
import { Card, Button, Dialog, Input, Textarea } from './ui/Primitives';

export default function BadHabitCard({ badHabit, onDelete }) {
  const { getDaysFree, logRelapse } = useHabits();
  const [modalOpen, setModalOpen] = useState(false);
  const [triggerDetail, setTriggerDetail] = useState('');
  const [envAdjustment, setEnvAdjustment] = useState('');
  const [dateOverride, setDateOverride] = useState(''); // Allow logging past lapses
  const [showHistory, setShowHistory] = useState(false);

  const daysFree = getDaysFree(badHabit);

  const handleSubmitRelapse = (e) => {
    e.preventDefault();
    const date = dateOverride ? new Date(dateOverride).toISOString() : new Date().toISOString();
    logRelapse(badHabit.id, {
      triggerDetail,
      environmentAdjustment: envAdjustment,
      date
    });
    setTriggerDetail('');
    setEnvAdjustment('');
    setDateOverride('');
    setModalOpen(false);
  };

  return (
    <>
      <Card hoverLift={false} className="border border-border/60">
        <div className="p-5 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-primary bg-hoverBg px-2 py-0.5 rounded border border-border/50">
                  {badHabit.identityName} • Anti-Habit
                </span>
                <h3 className="text-lg font-bold font-serif text-text mt-2">{badHabit.name}</h3>
              </div>

              {/* Days Free Counter */}
              <div className="text-right">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: [0.9, 1.05, 1] }}
                  transition={{ duration: 0.5 }}
                  className="font-mono text-2xl font-bold text-forgive"
                >
                  {daysFree}
                </motion.div>
                <div className="text-[10px] text-muted font-mono uppercase tracking-wider">Days Free</div>
              </div>
            </div>

            {/* Trigger Identification */}
            {badHabit.trigger && (
              <div className="mt-3 p-2.5 rounded bg-hoverBg/40 border border-border/40 text-xs">
                <span className="font-semibold text-text">🔍 Identified Trigger: </span>
                <span className="text-muted">{badHabit.trigger}</span>
              </div>
            )}

            {/* Brakes (Friction Strategies) */}
            <div className="mt-4 space-y-2 border-t border-border/30 pt-3">
              <h4 className="text-[10px] font-bold text-text uppercase tracking-widest">Active Brakes (Friction)</h4>
              
              {badHabit.invisibleStrategy ? (
                <div className="flex items-start gap-2 text-xs">
                  <EyeOff className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-text">Make it Invisible: </span>
                    <span className="text-muted">{badHabit.invisibleStrategy}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted italic">No invisible strategy configured. Redesign space on next relapse.</p>
              )}

              {badHabit.difficultStrategy ? (
                <div className="flex items-start gap-2 text-xs">
                  <Lock className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-text">Make it Difficult: </span>
                    <span className="text-muted">{badHabit.difficultStrategy}</span>
                  </div>
                </div>
              ) : (
                badHabit.invisibleStrategy && <p className="text-[11px] text-muted italic">No obstacle (difficult strategy) configured.</p>
              )}
            </div>
          </div>

          <div className="mt-5 border-t border-border/20 pt-4 flex flex-wrap gap-2 items-center justify-between">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-[10px] font-semibold text-muted hover:text-text cursor-pointer"
            >
              {showHistory ? "Hide Slip Log" : `View Slip Log (${badHabit.lapses?.length || 0})`}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onDelete(badHabit.id)}
                className="p-1.5 text-muted hover:text-primary hover:bg-hoverBg rounded transition-colors cursor-pointer"
                title="Delete Bad Habit"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <Button
                variant="forgive"
                size="sm"
                onClick={() => setModalOpen(true)}
                className="text-xs h-8"
              >
                <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                Report Relapse
              </Button>
            </div>
          </div>

          {/* Lapses History List */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 border-t border-border/30 pt-3 overflow-hidden space-y-3"
              >
                <h4 className="text-[10px] font-bold text-text uppercase tracking-widest mb-2">Slip Reflection Log</h4>
                {!badHabit.lapses || badHabit.lapses.length === 0 ? (
                  <p className="text-xs text-muted italic">No relapses logged! Keep writing evidence for your identity.</p>
                ) : (
                  <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                    {[...badHabit.lapses].reverse().map((lapse, i) => (
                      <div key={i} className="text-xs p-2 rounded bg-hoverBg/30 border border-border/20 text-left">
                        <div className="flex items-center justify-between text-[10px] text-muted font-mono mb-1">
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(lapse.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-text mb-1"><span className="font-semibold text-[10px] text-primary">Trigger:</span> {lapse.triggerDetail}</p>
                        {lapse.environmentAdjustment && (
                          <p className="text-muted"><span className="font-semibold text-[10px] text-success">Adjustment:</span> {lapse.environmentAdjustment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Relapse Dialog */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Relapse Diagnosis: ${badHabit.name}`}
      >
        <form onSubmit={handleSubmitRelapse} className="space-y-4">
          <div className="bg-forgive/10 border border-forgive/30 p-3 rounded-lg text-xs text-text mb-3 leading-relaxed">
            <span className="font-bold text-primary">Growth Focus:</span> A slip is a single data point, not a definition of who you are. Every setback is an opportunity to adjust the friction in your environment. Let's redesign the brakes so your system remains resilient. Never miss twice!
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text uppercase">1. What triggered this slip?</label>
            <Textarea
              value={triggerDetail}
              onChange={(e) => setTriggerDetail(e.target.value)}
              placeholder="Detail the location, visual cue, emotional state, or stack that triggered the slip..."
              required
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text uppercase">2. Environment Redesign (Add Friction)</label>
            <Input
              value={envAdjustment}
              onChange={(e) => setEnvAdjustment(e.target.value)}
              placeholder="How can you make this trigger invisible or add an obstacle?"
              required
            />
            <p className="text-[10px] text-muted leading-tight">
              E.g., 'Put the phone charger in the hallway' or 'Lock cookie cupboards after 9 PM'. This will update your active Brakes.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text uppercase">Date of Relapse (Optional)</label>
            <Input
              type="date"
              value={dateOverride}
              onChange={(e) => setDateOverride(e.target.value)}
              className="text-xs"
              max={new Date().toISOString().split('T')[0]}
            />
            <p className="text-[10px] text-muted">Defaults to today if left blank.</p>
          </div>

          <div className="flex justify-end gap-2 border-t border-border/20 pt-4 mt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="forgive">
              Diagnose & Reset
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
