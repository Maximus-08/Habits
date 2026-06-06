import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for class merging
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- BUTTON ---
export const Button = React.forwardRef(({ 
  className, 
  variant = 'default', 
  size = 'default', 
  children,
  ...props 
}, ref) => {
  const baseClasses = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
  
  const variants = {
    default: "bg-primary text-white hover:bg-primary/90 shadow-sm",
    secondary: "bg-hoverBg text-text hover:bg-hoverBg/80 border border-border/60",
    outline: "bg-transparent text-text border border-border hover:bg-hoverBg",
    ghost: "bg-transparent text-text hover:bg-hoverBg",
    success: "bg-success text-white hover:bg-success/90 shadow-sm",
    forgive: "bg-forgive text-text hover:bg-forgive/90 shadow-sm"
  };

  const sizes = {
    default: "h-10 px-4 py-2 text-sm",
    sm: "h-8 px-3 text-xs rounded-md",
    lg: "h-12 px-8 text-base",
    icon: "h-10 w-10"
  };

  return (
    <button
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});
Button.displayName = "Button";

// --- CARD ---
export const Card = ({ className, hoverLift = true, ...props }) => (
  <div
    className={cn(
      "bg-surface rounded-xl border border-border/80 overflow-hidden transition-all duration-300",
      hoverLift && "hover:shadow-md hover:-translate-y-0.5",
      className
    )}
    {...props}
  />
);

export const CardHeader = ({ className, ...props }) => (
  <div className={cn("p-5 border-b border-border/40", className)} {...props} />
);

export const CardTitle = ({ className, ...props }) => (
  <h3 className={cn("text-lg font-semibold leading-tight font-serif text-text", className)} {...props} />
);

export const CardDescription = ({ className, ...props }) => (
  <p className={cn("text-sm text-muted mt-1 font-sans", className)} {...props} />
);

export const CardContent = ({ className, ...props }) => (
  <div className={cn("p-5 font-sans", className)} {...props} />
);

// --- PROGRESS BAR ---
export const Progress = ({ value = 0, className, ...props }) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-2.5 w-full bg-border/40 rounded-full overflow-hidden", className)} {...props}>
      <motion.div
        className="h-full bg-success rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${clampedValue}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
};

// --- TOOLTIP ---
export const Tooltip = ({ content, children, className }) => {
  const [visible, setVisible] = useState(false);
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-50 w-64 p-3 text-xs bg-text text-white rounded-lg shadow-lg -left-10 bottom-full mb-2 pointer-events-none leading-relaxed",
              className
            )}
          >
            {content}
            <div className="absolute top-full left-12 -mt-1 w-2.5 h-2.5 bg-text rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const InfoTooltip = ({ content }) => (
  <Tooltip content={content}>
    <HelpCircle className="w-4 h-4 text-muted hover:text-text cursor-help inline ml-1 transition-colors" />
  </Tooltip>
);

// --- SLIDER (Satisfaction Range) ---
export const Slider = ({ min = 0, max = 10, step = 1, value, onChange, className }) => {
  return (
    <div className={cn("w-full flex items-center space-x-3", className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="w-full h-2 bg-border/60 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
      />
      <span className="font-mono text-sm bg-hoverBg text-text font-bold px-2 py-0.5 rounded border border-border/50">
        {value}
      </span>
    </div>
  );
};

// --- DIALOG (Modal) ---
export const Dialog = ({ isOpen, onClose, title, children }) => {
  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-text/40 backdrop-blur-[2px]"
          />
          
          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="bg-surface border border-border w-full max-w-lg rounded-xl shadow-xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-5 border-b border-border/50 bg-bg/30">
              <h3 className="text-lg font-serif font-semibold text-text">{title}</h3>
              <button 
                onClick={onClose} 
                className="text-muted hover:text-text hover:bg-hoverBg p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 font-sans">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- INPUT CONTROLS ---
export const Input = React.forwardRef(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50 transition-all font-sans",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50 transition-all font-sans",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export const Select = ({ value, onChange, className, children, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Parse custom option descriptors from children
  const options = React.Children.map(children, child => {
    if (child && child.type === 'option') {
      return { value: child.props.value, label: child.props.children };
    }
    return null;
  }).filter(Boolean);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger button replacing the select border box */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border border-border/80 bg-surface shadow-sm px-3.5 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-sans cursor-pointer",
          className
        )}
        {...props}
      >
        <span>{selectedOption?.label || "Select option"}</span>
        <svg 
          className={cn("w-4 h-4 text-muted transition-transform duration-200", isOpen && "rotate-180")} 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Floating option menu panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 w-full mt-1.5 bg-surface border border-border rounded-xl shadow-lg p-1 max-h-60 overflow-y-auto"
          >
            <div className="flex flex-col gap-0.5">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (onChange) {
                      onChange({ target: { value: option.value } });
                    }
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center px-3 py-2 rounded-lg text-left text-sm hover:bg-hoverBg transition-colors cursor-pointer",
                    option.value === value ? "bg-hoverBg text-primary font-semibold" : "text-text"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
Select.displayName = "Select";
