/**
 * Formats a Date object to YYYY-MM-DD using local calendar values.
 * Prevents timezone offset issues where UTC date splits evaluate incorrectly near local midnight.
 * @param {Date|string|number} date 
 * @returns {string} YYYY-MM-DD
 */
export function getLocalDateString(date = new Date()) {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return "";
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a 12-hour time string (e.g. "08:00 AM", "10:30 PM") to total minutes in the day.
 * @param {string} timeStr 
 * @returns {number} minutes from midnight (0 - 1439). Returns 9999 for invalid inputs.
 */
export const timeToMinutes = (timeStr) => {
  if (!timeStr) return 9999;
  const cleanTime = timeStr.trim().toUpperCase();
  const parts = cleanTime.match(/^(\d+):(\d+)\s*(AM|PM)$/);
  if (!parts) return 9999;
  let hours = parseInt(parts[1], 10);
  const minutes = parseInt(parts[2], 10);
  const ampm = parts[3];
  
  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return 9999;
  
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
};

/**
 * Calculates the ISO week number for a given date.
 * @param {Date} d 
 * @returns {number} week number
 */
export const getWeekNumber = (d) => {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(( ( (target - yearStart) / 86400000) + 1) / 7);
  return weekNo;
};

