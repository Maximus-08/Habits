import { normalizeDate } from './dateHelpers';

// Calculate streak for a specific habit based on completion history
export const calculateHabitStreak = (completions) => {
  if (!completions || completions.length === 0) {
    return { currentStreak: 0, longestStreak: 0, isActive: false };
  }

  // Get today's date at midnight for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Collect unique days of completion using a Set
  const completionDays = new Set();
  completions.forEach((completion) => {
    const normalizedDate = normalizeDate(completion.completedAt);
    if (normalizedDate && !isNaN(normalizedDate.getTime())) {
      const completionDate = new Date(normalizedDate);
      completionDate.setHours(0, 0, 0, 0);
      completionDays.add(completionDate.getTime());
    }
  });

  // Convert Set to array and sort descending (most recent first)
  const sortedDays = Array.from(completionDays).sort((a, b) => b - a);

  if (sortedDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0, isActive: false };
  }

  // Check if the most recent completion is today or yesterday
  const mostRecentDay = sortedDays[0];
  const daysSinceMostRecent = Math.floor((today.getTime() - mostRecentDay) / (1000 * 60 * 60 * 24));

  // If most recent is more than 1 day ago, streak is broken
  if (daysSinceMostRecent > 1) {
    // Calculate longest streak from history
    let longestStreak = 1;
    let tempStreak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const daysDiff = Math.floor((sortedDays[i - 1] - sortedDays[i]) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
    return { currentStreak: 0, longestStreak, isActive: false };
  }

  // Count current streak (starting from today or yesterday)
  // Must verify consecutive days without gaps
  let currentStreak = 1;
  let expectedDay = mostRecentDay;

  // Walk backwards through sorted days, verifying each is exactly 1 day earlier
  for (let i = 1; i < sortedDays.length; i++) {
    const previousExpectedDay = expectedDay - (1000 * 60 * 60 * 24);
    const actualDay = sortedDays[i];
    
    // Check if this day matches the expected previous day (exactly 1 day earlier)
    if (actualDay === previousExpectedDay) {
      currentStreak++;
      expectedDay = previousExpectedDay;
    } else if (actualDay < previousExpectedDay) {
      // If actual day is earlier than expected, there's a gap - streak is broken
      break;
    }
    // If actualDay > previousExpectedDay, it's a future date (shouldn't happen with sorted desc), skip it
  }

  // Calculate longest streak across all history
  let longestStreak = currentStreak;
  let tempStreak = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const daysDiff = Math.floor((sortedDays[i - 1] - sortedDays[i]) / (1000 * 60 * 60 * 24));
    if (daysDiff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  const isActive = daysSinceMostRecent === 0;

  return { currentStreak, longestStreak, isActive };
};

// Calculate total identity votes (completed habits)
export const calculateIdentityVotes = (allCompletions) => {
  return allCompletions?.length || 0;
};

// Calculate user level based on total completions
export const calculateUserLevel = (totalVotes) => {
  // Level up every 100 votes
  return Math.floor(totalVotes / 100) + 1;
};

// Calculate votes needed for next level
export const calculateVotesForNextLevel = (totalVotes) => {
  const currentLevel = calculateUserLevel(totalVotes);
  const votesNeededForCurrentLevel = (currentLevel - 1) * 100;
  const votesNeededForNextLevel = currentLevel * 100;
  const progress = totalVotes - votesNeededForCurrentLevel;
  const remaining = votesNeededForNextLevel - totalVotes;

  return { progress, remaining, percentage: (progress / 100) * 100 };
};

// Generate heatmap data from completions
export const generateHeatmapFromCompletions = (completions, weeksToShow = 20) => {
  const heatmap = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Handle null/undefined completions
  if (!completions || completions.length === 0) {
    // Return empty heatmap with zeros
    for (let week = 0; week < weeksToShow; week++) {
      heatmap.push(new Array(7).fill(0));
    }
    return heatmap;
  }

  // Create a map of dates to completion counts
  const completionMap = new Map();

  completions.forEach(completion => {
    const normalizedDate = normalizeDate(completion.completedAt);
    if (normalizedDate && !isNaN(normalizedDate.getTime())) {
      const date = new Date(normalizedDate);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];
      completionMap.set(dateKey, (completionMap.get(dateKey) || 0) + 1);
    }
  });

  // Calculate start date (weeksToShow * 7 days ago)
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (weeksToShow * 7));

  // Generate heatmap data
  for (let week = 0; week < weeksToShow; week++) {
    const weekData = [];
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + (week * 7) + day);

      const dateKey = currentDate.toISOString().split('T')[0];
      const completionCount = completionMap.get(dateKey) || 0;

      // Convert count to intensity (0-4)
      let intensity = 0;
      if (completionCount >= 4) intensity = 4;
      else if (completionCount === 3) intensity = 3;
      else if (completionCount === 2) intensity = 2;
      else if (completionCount === 1) intensity = 1;

      weekData.push(intensity);
    }
    heatmap.push(weekData);
  }

  return heatmap;
};

// Data format for @uiw/react-heat-map
export const getHeatmapData = (completions) => {
  if (!completions) return [];
  
  const completionMap = new Map();
  completions.forEach(completion => {
    const normalizedDate = normalizeDate(completion.completedAt);
    if (normalizedDate && !isNaN(normalizedDate.getTime())) {
      const dateKey = normalizedDate.toISOString().split('T')[0].replace(/-/g, '/');
      completionMap.set(dateKey, (completionMap.get(dateKey) || 0) + 1);
    }
  });

  return Array.from(completionMap.entries()).map(([date, count]) => ({
    date,
    count
  }));
};

// Get completion rate for a specific period
export const getCompletionRate = (completions, totalHabits, days = 7) => {
  // Handle null/undefined completions
  if (!completions || completions.length === 0) {
    return 0;
  }

  // Handle invalid totalHabits
  if (!totalHabits || totalHabits <= 0) {
    return 0;
  }

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - days);

  const recentCompletions = completions.filter(c => {
    const normalizedDate = normalizeDate(c.completedAt);
    return normalizedDate && normalizedDate >= targetDate;
  });

  const expectedCompletions = totalHabits * days;
  const actualCompletions = recentCompletions.length;

  return expectedCompletions > 0
    ? Math.round((actualCompletions / expectedCompletions) * 100)
    : 0;
};

// Get best day of week
export const getBestDayOfWeek = (completions) => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayCounts = new Array(7).fill(0);

  // Handle empty or null completions
  if (!completions || completions.length === 0) {
    return {
      day: dayNames[0], // Default to Sunday
      count: 0,
      percentage: 0
    };
  }

  completions.forEach(completion => {
    const normalizedDate = normalizeDate(completion.completedAt);
    if (normalizedDate && !isNaN(normalizedDate.getTime())) {
      const dayOfWeek = normalizedDate.getDay();
      dayCounts[dayOfWeek]++;
    }
  });

  const maxCount = Math.max(...dayCounts);
  const bestDayIndex = dayCounts.indexOf(maxCount);

  // Only calculate percentage if we have valid completions
  const validCompletions = completions.filter(c => {
    const normalizedDate = normalizeDate(c.completedAt);
    return normalizedDate && !isNaN(normalizedDate.getTime());
  }).length;

  return {
    day: dayNames[bestDayIndex],
    count: maxCount,
    percentage: validCompletions > 0 ? Math.round((maxCount / validCompletions) * 100) : 0
  };
};

// Calculate growth rate (comparing two periods)
export const calculateGrowthRate = (completions, days = 7) => {
  // Handle null/undefined completions
  if (!completions || completions.length === 0) {
    return 0;
  }

  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - days);

  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - days);

  const currentPeriodCompletions = completions.filter(c => {
    const normalizedDate = normalizeDate(c.completedAt);
    return normalizedDate && normalizedDate >= periodStart && normalizedDate <= now;
  }).length;

  const previousPeriodCompletions = completions.filter(c => {
    const normalizedDate = normalizeDate(c.completedAt);
    return normalizedDate && normalizedDate >= previousPeriodStart && normalizedDate < periodStart;
  }).length;

  if (previousPeriodCompletions === 0) {
    return currentPeriodCompletions > 0 ? 100 : 0;
  }

  return Math.round(((currentPeriodCompletions - previousPeriodCompletions) / previousPeriodCompletions) * 100);
};

// Get current week number (ISO 8601 week number - week starts on Monday)
// ISO 8601: Week 1 is the week containing the first Thursday of the year
// Algorithm based on ISO 8601 standard
// Handles year boundary edge cases correctly
export const getCurrentWeekNumber = () => {
  const date = new Date();
  const target = new Date(date.valueOf());
  
  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  // Convert to ISO day (0 = Monday, 6 = Sunday)
  const dayNr = (date.getDay() + 6) % 7;
  
  // Set to nearest Thursday (ISO weeks start on Monday, end on Sunday)
  // Thursday is always in the middle of the week
  target.setDate(target.getDate() - dayNr + 3);
  
  // January 4 is always in week 1 of its year
  const jan4 = new Date(target.getFullYear(), 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const firstThursday = new Date(jan4);
  firstThursday.setDate(firstThursday.getDate() - jan4Day + 3);
  
  // Handle year boundary: if target is in previous year's last week
  // or next year's first week, adjust accordingly
  if (target < firstThursday) {
    // We're in the previous year's week 52/53
    const prevJan4 = new Date(target.getFullYear() - 1, 0, 4);
    const prevJan4Day = (prevJan4.getDay() + 6) % 7;
    const prevFirstThursday = new Date(prevJan4);
    prevFirstThursday.setDate(prevFirstThursday.getDate() - prevJan4Day + 3);
    const weeksDiff = (target - prevFirstThursday) / (7 * 24 * 60 * 60 * 1000);
    const weekNum = 1 + Math.round(weeksDiff);
    // ISO weeks can be 52 or 53
    return weekNum <= 53 ? weekNum : 53;
  }
  
  // Calculate weeks between first Thursday and target Thursday
  const weeksDiff = (target - firstThursday) / (7 * 24 * 60 * 60 * 1000);
  const weekNum = 1 + Math.round(weeksDiff);
  
  // If we're past week 52/53, we're in next year's week 1
  return weekNum <= 53 ? weekNum : 1;
};

// Format date range for a specific date (for historical viewing)
export const getWeekDateRange = (date = new Date()) => {
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();
  const startOfWeek = new Date(targetDate);
  startOfWeek.setDate(targetDate.getDate() - dayOfWeek);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // Handle month-spanning weeks (e.g., "January 28 - February 3")
  if (startOfWeek.getMonth() !== endOfWeek.getMonth()) {
    return `${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getDate()} - ${monthNames[endOfWeek.getMonth()]} ${endOfWeek.getDate()}`;
  }

  return `${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getDate()}-${endOfWeek.getDate()}`;
};

// Format date range for current week (alias for backward compatibility)
export const getCurrentWeekDateRange = () => {
  return getWeekDateRange(new Date());
};
