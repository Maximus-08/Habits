import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../utils/test-utils';
import userEvent from '@testing-library/user-event';
import WeeklyReview from './WeeklyReview';
import { firestoreService } from '../services/firestoreService';

const mockNavigate = vi.fn();

// Mock react-router-dom to track redirects
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('WeeklyReview Form Flow', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  test('should render review questions and allow typing and saving drafts', async () => {
    const user = userEvent.setup();
    render(<WeeklyReview />);

    // Verify weekly reflection headers
    expect(screen.getByRole('heading', { name: 'Weekly Reflection' })).toBeInTheDocument();
    
    // Default satisfaction score is 7
    expect(screen.getByRole('slider').value).toBe('7');

    // Fill form reflection text fields
    const winsInput = screen.getByPlaceholderText(/Did 5 workouts/i);
    const challengesInput = screen.getByPlaceholderText(/Felt too lazy to write/i);
    const learningInput = screen.getByPlaceholderText(/Phone screen cue/i);
    const nextWeekInput = screen.getByPlaceholderText(/Keep snacks locked/i);

    await user.type(winsInput, 'Read 2 articles');
    await user.type(challengesInput, 'Missed writing on Friday');
    await user.type(learningInput, 'Need to put laptop in cabinet');
    await user.type(nextWeekInput, 'Place book on pillow');

    // Check status checkmark (should be unchecked by default)
    const completeCheckbox = screen.getByRole('checkbox', { name: /Mark Review as Complete/i });
    expect(completeCheckbox).not.toBeChecked();

    // Verify button text is "Save Draft"
    const submitBtn = screen.getByRole('button', { name: 'Save Draft' });
    expect(submitBtn).toBeInTheDocument();

    // Submit draft
    await user.click(submitBtn);

    // Verify saveWeeklyReview is invoked with compiled review data in draft mode
    expect(firestoreService.saveIdentity).not.toHaveBeenCalled(); // irrelevant service
    expect(firestoreService.saveWeeklyReview).toHaveBeenCalledWith(
      'mock-user-123',
      expect.objectContaining({
        satisfaction: 7,
        status: 'draft',
        reflection: {
          wins: 'Read 2 articles',
          challenges: 'Missed writing on Friday',
          learning: 'Need to put laptop in cabinet',
          nextWeek: 'Place book on pillow'
        }
      })
    );

    // Verify navigated to dashboard
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  test('should toggle status to completed, submit locked review, and navigate to analytics page', async () => {
    const user = userEvent.setup();
    render(<WeeklyReview />);

    // Check complete checkbox
    const completeCheckbox = screen.getByRole('checkbox', { name: /Mark Review as Complete/i });
    await user.click(completeCheckbox);
    expect(completeCheckbox).toBeChecked();

    // Verify button text updates to "Lock Review"
    const submitBtn = screen.getByRole('button', { name: 'Lock Review' });
    expect(submitBtn).toBeInTheDocument();

    // Fill required textareas
    const winsInput = screen.getByPlaceholderText(/Did 5 workouts/i);
    const challengesInput = screen.getByPlaceholderText(/Felt too lazy to write/i);
    const learningInput = screen.getByPlaceholderText(/Phone screen cue/i);
    const nextWeekInput = screen.getByPlaceholderText(/Keep snacks locked/i);

    await user.type(winsInput, 'Consistent reading');
    await user.type(challengesInput, 'None');
    await user.type(learningInput, 'None');
    await user.type(nextWeekInput, 'None');

    // Click submit
    await user.click(submitBtn);

    // Verify service is called in completed mode
    expect(firestoreService.saveWeeklyReview).toHaveBeenCalledWith(
      'mock-user-123',
      expect.objectContaining({
        status: 'completed',
        satisfaction: 7
      })
    );

    // Verify navigated to analytics reflections tab
    expect(mockNavigate).toHaveBeenCalledWith('/analytics#reflections');
  });
});
