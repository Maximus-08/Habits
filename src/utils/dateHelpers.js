// Normalize any date-like value to a JavaScript Date object
// Handles Firebase Timestamps, JS Dates, ISO strings, and timestamps
export const normalizeDate = (date) => {
  if (!date) return null;

  // Already a Date object
  if (date instanceof Date) return date;

  // Firebase Timestamp (has toDate method)
  if (typeof date?.toDate === 'function') return date.toDate();

  // Unix timestamp (number)
  if (typeof date === 'number') return new Date(date);

  // ISO string or other parseable string
  if (typeof date === 'string') return new Date(date);

  // Fallback
  return new Date(date);
};

// Get a normalized date string (YYYY-MM-DD) for comparison
export const getDateKey = (date) => {
  const normalized = normalizeDate(date);
  if (!normalized || isNaN(normalized.getTime())) return null;
  return normalized.toISOString().split('T')[0];
};

// Check if a date is today
export const isToday = (date) => {
  const today = new Date();
  const checkDate = normalizeDate(date);

  if (!checkDate || isNaN(checkDate.getTime())) return false;

  return checkDate.getDate() === today.getDate() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear();
};

// Check if habit was completed today
export const isHabitCompletedToday = (habitId, completions) => {
  if (!completions || completions.length === 0) return false;

  return completions.some(completion => {
    if (completion.habitId !== habitId) return false;
    return isToday(completion.completedAt);
  });
};

// Get today's completion for a habit (if exists)
export const getTodaysCompletion = (habitId, completions) => {
  if (!completions || completions.length === 0) return null;

  return completions.find(completion => {
    if (completion.habitId !== habitId) return false;
    return isToday(completion.completedAt);
  });
};

// Get start of day timestamp
export const getStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Get end of day timestamp
export const getEndOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

// Format date for display
export const formatDate = (date) => {
  const d = normalizeDate(date);
  if (!d || isNaN(d.getTime())) return 'Invalid Date';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Format time for display
export const formatTime = (date) => {
  const d = normalizeDate(date);
  if (!d || isNaN(d.getTime())) return 'Invalid Time';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};
