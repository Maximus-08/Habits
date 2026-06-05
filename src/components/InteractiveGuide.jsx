import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, X, Sparkles, Target, Compass, Lock, Award, ClipboardCheck } from 'lucide-react';
import { Button, Card } from './ui/Primitives';

const STEPS = [
  {
    title: "Welcome to Habits! 🌌",
    description: "Welcome to your behavioral game board. Before tracking actions, let's learn how to architect your system to make success inevitable.",
    icon: Sparkles,
    targetId: "",
    highlightClass: ""
  },
  {
    title: "Step 1: Your Identity Core 👤",
    description: "Behavior change starts with identity. In the main area, each section represents a Noun of who you want to become (e.g. 'The Athlete'). Every habit is a vote for this identity.",
    icon: Target,
    targetId: "walkthrough-identities",
    highlightClass: "ring-4 ring-primary ring-offset-4 ring-offset-bg rounded-xl transition-all"
  },
  {
    title: "Step 2: Habit Engines ⚡",
    description: "Good habits are primed as engines. We stack them after existing cues, prepare the physical space, define a 2-Minute version for low-energy days, and reward completions immediately.",
    icon: Compass,
    targetId: "walkthrough-habits-cards",
    highlightClass: "ring-4 ring-primary ring-offset-4 ring-offset-bg rounded-xl transition-all"
  },
  {
    title: "Step 3: Anti-Habit Brakes 🛑",
    description: "For bad habits, we install brakes: making cues invisible (hiding triggers) or making them difficult (adding friction). When slips happen, we diagnose and adjust friction.",
    icon: Lock,
    targetId: "walkthrough-brakes",
    highlightClass: "ring-4 ring-primary ring-offset-4 ring-offset-bg rounded-xl transition-all"
  },
  {
    title: "Step 4: Leveling & Votes 🏆",
    description: "Every completion (standard or 2-minute) adds 1 vote to your profile. Accumulate votes to level up your status and lock in your new identity!",
    icon: Award,
    targetId: "walkthrough-level",
    highlightClass: "ring-4 ring-primary ring-offset-4 ring-offset-bg rounded-xl transition-all"
  },
  {
    title: "Step 5: Weekly Reflection 📝",
    description: "Systems drift. Every weekend, audit your performance, log learning details, and redesign your environment to optimize your engines and brakes.",
    icon: ClipboardCheck,
    targetId: "walkthrough-review-reminder",
    highlightClass: "ring-4 ring-primary ring-offset-4 ring-offset-bg rounded-xl transition-all"
  }
];

export default function InteractiveGuide({ onComplete, forceStart = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Check if walkthrough has been completed before
  useEffect(() => {
    const isCompleted = localStorage.getItem('habits_walkthrough_completed');
    if (!isCompleted || forceStart) {
      setIsOpen(true);
      setCurrentStep(0);
    }
  }, [forceStart]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = () => {
    localStorage.setItem('habits_walkthrough_completed', 'true');
    setIsOpen(false);
    
    // Clear any active element styling
    STEPS.forEach(step => {
      if (step.targetId) {
        const el = document.getElementById(step.targetId);
        if (el) el.className = el.className.replace(/ring-[\s\S]*?/g, '').trim();
      }
    });

    if (onComplete) onComplete();
  };

  // Dynamically apply highlight style to target element
  useEffect(() => {
    if (!isOpen) return;

    // First, clear highlights on all step elements
    STEPS.forEach(step => {
      if (step.targetId) {
        const el = document.getElementById(step.targetId);
        if (el) {
          el.style.boxShadow = '';
          el.style.position = '';
          el.style.zIndex = '';
        }
      }
    });

    const activeStep = STEPS[currentStep];
    if (activeStep.targetId) {
      const targetEl = document.getElementById(activeStep.targetId);
      if (targetEl) {
        // Scroll into view
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight with golden/primary ring and high z-index
        targetEl.style.boxShadow = '0 0 0 4px var(--color-primary), 0 10px 25px -5px rgba(0,0,0,0.1)';
        targetEl.style.transition = 'all 0.3s ease';
        targetEl.style.position = 'relative';
        targetEl.style.zIndex = '40';
      }
    }
  }, [currentStep, isOpen]);

  if (!isOpen) return null;

  const ActiveIcon = STEPS[currentStep].icon;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-end justify-center sm:items-center sm:justify-end p-6 select-none">
      {/* Semi-transparent backdrop overlay with no blur */}
      <div className="fixed inset-0 bg-transparent pointer-events-auto z-30" onClick={handleClose} />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full max-w-sm bg-surface border border-border shadow-2xl rounded-2xl p-6 pointer-events-auto z-40 relative sm:mr-4"
        >
          {/* Header Close button */}
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 text-muted hover:text-text p-1 hover:bg-hoverBg rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Tutorial Step Icon */}
          <div className="flex items-center gap-3.5 mb-4">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <ActiveIcon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
                System Guide • {currentStep + 1} of {STEPS.length}
              </span>
              <h3 className="font-serif font-bold text-text text-base leading-tight mt-0.5">
                {STEPS[currentStep].title}
              </h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-text/80 leading-relaxed mb-6 font-sans">
            {STEPS[currentStep].description}
          </p>

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-border/30 pt-4">
            <button
              onClick={handleClose}
              className="text-[11px] font-semibold text-muted hover:text-text cursor-pointer"
            >
              Skip Guide
            </button>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBack}
                  className="text-xs py-1 h-8"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Back
                </Button>
              )}
              
              <Button
                size="sm"
                onClick={handleNext}
                className="text-xs py-1 h-8 font-bold"
              >
                <span>{currentStep === STEPS.length - 1 ? "Complete" : "Next"}</span>
                <ArrowRight className="w-3 h-3 ml-1.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
