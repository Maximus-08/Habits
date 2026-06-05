import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Undo2, Award, Zap, Sparkles, Trash2, Edit } from 'lucide-react';
import { useHabits } from '../context/HabitsContext';
import { Card, Button, InfoTooltip } from './ui/Primitives';

export default function HabitCard({ habit, onEdit, onDelete }) {
  const { completions, selectedDate, toggleCompletion } = useHabits();
  const [hovered, setHovered] = useState(false);

  // Check completions for today
  const completionToday = completions.find(
    c => c.habitId === habit.id && c.dateNormalized === selectedDate
  );
  const isCompletedToday = !!completionToday;
  const isTwoMinToday = completionToday?.isTwoMinVersion;

  // Check "Never Miss Twice" - Was yesterday missed?
  // Only trigger this warning if selectedDate is "today" (so we don't display yesterday warning when browsing historical logs)
  const todayStr = new Date().toISOString().split('T')[0];
  const isSelectedDateToday = selectedDate === todayStr;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const completedYesterday = completions.some(
    c => c.habitId === habit.id && c.dateNormalized === yesterdayStr
  );
  const hasPastCompletions = completions.some(c => c.habitId === habit.id);
  
  // Show warning if yesterday was missed, but we are looking at today, and the habit wasn't completed today yet, and it has some history
  const isYesterdayMissed = isSelectedDateToday && !completedYesterday && !isCompletedToday && hasPastCompletions;

  const handleVote = (isTwoMin = false) => {
    toggleCompletion(habit.id, selectedDate, isTwoMin);
  };

  // Compose implementation intention
  const hasIntention = habit.stackedHabit || (habit.time && habit.location);
  const intentionSentence = hasIntention ? (
    <p className="text-sm text-text font-serif italic mb-3 leading-relaxed">
      "{habit.stackedHabit ? `${habit.stackedHabit}, ` : "At "}{" "}
      I will <span className="font-semibold font-sans not-italic text-primary">{habit.title}</span>{" "}
      {habit.time ? `at ${habit.time}` : ""}{" "}
      {habit.location ? `in ${habit.location}` : ""}."
    </p>
  ) : (
    <p className="text-sm font-semibold text-text font-sans mb-3">{habit.title}</p>
  );

  return (
    <motion.div
      layout
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Card
        hoverLift={!isCompletedToday}
        className={`transition-all duration-300 border ${
          isCompletedToday
            ? 'bg-successTint/30 border-success/40'
            : isYesterdayMissed
            ? 'border-forgive ring-2 ring-forgive/20 animate-pulse'
            : 'border-border/60'
        }`}
      >
        {/* Never Miss Twice Badge */}
        {isYesterdayMissed && (
          <div className="bg-forgive/15 border-b border-forgive text-text p-2.5 text-xs font-semibold flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-forgive" />
            <span>Yesterday was a slip. Cast a vote today — even the 2-min version counts!</span>
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-muted bg-hoverBg px-2 py-0.5 rounded border border-border/50">
                {habit.category}
              </span>
              
              <div className="mt-2">
                {intentionSentence}
              </div>

              {habit.description && (
                <p className="text-xs text-muted leading-relaxed mb-4">
                  {habit.description}
                </p>
              )}

              {/* Conditional parameters */}
              <div className="flex flex-wrap gap-2 mb-2">
                {habit.environmentPrep && (
                  <span className="text-xs text-text bg-hoverBg/50 border border-border/50 px-2 py-0.8 rounded-md flex items-center gap-1">
                    <span>🔧 Prep:</span>
                    <span className="text-muted text-[11px]">{habit.environmentPrep}</span>
                  </span>
                )}
                {habit.immediateReward && (
                  <span className="text-xs text-text bg-successTint/30 border border-success/20 px-2 py-0.8 rounded-md flex items-center gap-1">
                    <span>🎁 Reward:</span>
                    <span className="text-muted text-[11px]">{habit.immediateReward}</span>
                  </span>
                )}
                {habit.twoMinRule && (
                  <span className="text-xs text-text bg-forgive/10 border border-forgive/20 px-2 py-0.8 rounded-md flex items-center gap-1">
                    <span>⚡ 2-Min:</span>
                    <span className="text-muted text-[11px]">{habit.twoMinRule}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Checkmark Completion Trigger */}
            <div className="flex flex-col items-center justify-center space-y-2 select-none">
              <AnimatePresence mode="wait">
                {isCompletedToday ? (
                  <motion.button
                    key="completed"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    onClick={() => handleVote()}
                    className="w-12 h-12 bg-success text-white rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-primary transition-colors duration-200"
                    title="Click to Undo"
                  >
                    {hovered ? (
                      <Undo2 className="w-5 h-5" />
                    ) : (
                      <motion.div
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Check className="w-6 h-6 stroke-[3px]" />
                      </motion.div>
                    )}
                  </motion.button>
                ) : (
                  <div key="uncompleted" className="flex flex-col items-center space-y-2">
                    {/* Standard Vote Button */}
                    <button
                      onClick={() => handleVote(false)}
                      className="w-12 h-12 rounded-full border-2 border-border/80 hover:border-success/60 bg-surface flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                      title="Cast full vote for identity"
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-border/40 hover:bg-success/40" />
                    </button>
                    <span className="text-[10px] text-muted font-mono font-medium">Vote</span>
                  </div>
                )}
              </AnimatePresence>

              {/* 2-Min Switch (Only if 2-Min is configured and not completed yet) */}
              {!isCompletedToday && habit.twoMinRule && (
                <button
                  onClick={() => handleVote(true)}
                  className="text-[10px] px-2 py-1 rounded bg-hoverBg text-text hover:bg-forgive/20 border border-border/40 flex items-center gap-0.5 cursor-pointer transition-colors"
                  title="Execute the simplified 2-minute version"
                >
                  <Zap className="w-3 h-3 text-forgive fill-forgive" />
                  <span>2-Min</span>
                </button>
              )}

              {/* Completed Type Indicator */}
              {isCompletedToday && (
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  isTwoMinToday 
                    ? 'text-forgive bg-forgive/10 border border-forgive/20' 
                    : 'text-success bg-success/10 border border-success/20'
                }`}>
                  {isTwoMinToday ? "⚡ 2-Min" : "✨ Full"}
                </span>
              )}
            </div>
          </div>
          
          {/* Card footer controls (Edit/Delete) visible on hover */}
          <div className="flex items-center justify-end border-t border-border/20 mt-4 pt-3 gap-2 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button 
              onClick={() => onEdit(habit)} 
              className="p-1.5 text-muted hover:text-text hover:bg-hoverBg rounded transition-colors cursor-pointer"
              title="Edit Habit System"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => onDelete(habit.id)} 
              className="p-1.5 text-muted hover:text-primary hover:bg-hoverBg rounded transition-colors cursor-pointer"
              title="Delete Habit"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
