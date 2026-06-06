import { describe, test, expect } from 'vitest';
import { calculateLevelFromVotes } from './constants';
import { timeToMinutes, getWeekNumber, getLocalDateString } from './dateUtils';

describe('calculateLevelFromVotes', () => {
  test('should return level 1 for 0 votes', () => {
    expect(calculateLevelFromVotes(0)).toBe(1);
  });

  test('should return correct level for bounds', () => {
    expect(calculateLevelFromVotes(24)).toBe(1);
    expect(calculateLevelFromVotes(25)).toBe(2);
    expect(calculateLevelFromVotes(26)).toBe(2);
    expect(calculateLevelFromVotes(74)).toBe(2);
    expect(calculateLevelFromVotes(75)).toBe(3);
    expect(calculateLevelFromVotes(149)).toBe(3);
    expect(calculateLevelFromVotes(150)).toBe(4);
    expect(calculateLevelFromVotes(299)).toBe(4);
    expect(calculateLevelFromVotes(300)).toBe(5);
    expect(calculateLevelFromVotes(599)).toBe(5);
    expect(calculateLevelFromVotes(600)).toBe(6);
    expect(calculateLevelFromVotes(1199)).toBe(6);
    expect(calculateLevelFromVotes(1200)).toBe(7);
    expect(calculateLevelFromVotes(2499)).toBe(7);
    expect(calculateLevelFromVotes(2500)).toBe(8);
    expect(calculateLevelFromVotes(5000)).toBe(8);
  });
});

describe('timeToMinutes', () => {
  test('should parse AM times correctly', () => {
    expect(timeToMinutes('08:00 AM')).toBe(8 * 60);
    expect(timeToMinutes('11:59 AM')).toBe(11 * 60 + 59);
    expect(timeToMinutes('12:00 AM')).toBe(0); // Midnight
    expect(timeToMinutes('12:30 AM')).toBe(30);
  });

  test('should parse PM times correctly', () => {
    expect(timeToMinutes('12:00 PM')).toBe(12 * 60); // Noon
    expect(timeToMinutes('12:45 PM')).toBe(12 * 60 + 45);
    expect(timeToMinutes('01:00 PM')).toBe(13 * 60);
    expect(timeToMinutes('08:30 PM')).toBe(20 * 60 + 30);
    expect(timeToMinutes('11:59 PM')).toBe(23 * 60 + 59);
  });

  test('should return 9999 for invalid inputs', () => {
    expect(timeToMinutes('')).toBe(9999);
    expect(timeToMinutes(null)).toBe(9999);
    expect(timeToMinutes('invalid')).toBe(9999);
    expect(timeToMinutes('13:00 AM')).toBe(9999);
  });
});

describe('getWeekNumber', () => {
  test('should return correct ISO week number', () => {
    // 2026-06-05 is Friday, ISO week 23
    expect(getWeekNumber(new Date('2026-06-05'))).toBe(23);
    
    // 2026-01-01 is Thursday, ISO week 1
    expect(getWeekNumber(new Date('2026-01-01'))).toBe(1);
    
    // 2026-12-31 is Thursday, ISO week 53
    expect(getWeekNumber(new Date('2026-12-31'))).toBe(53);
  });
});

describe('getLocalDateString', () => {
  test('should return YYYY-MM-DD local format', () => {
    const date = new Date(2026, 5, 5); // Month is 0-indexed, so 5 is June
    expect(getLocalDateString(date)).toBe('2026-06-05');
  });

  test('should return empty string for invalid date', () => {
    expect(getLocalDateString('invalid')).toBe('');
  });
});
