import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../utils/test-utils';
import userEvent from '@testing-library/user-event';
import Onboarding from './Onboarding';
import { firestoreService } from '../services/firestoreService';

const mockNavigate = vi.fn();

// Mock react-router-dom to track navigation redirects
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the AI service to avoid real network calls during testing
vi.mock('../services/aiService', () => ({
  fetchOnboardingSuggestions: vi.fn((identityName) => {
    const name = identityName.toLowerCase();
    if (name.includes('writer')) {
      return {
        stackedHabit: "Right after you shut your laptop screen to wrap up the workday",
        twoMinRule: "Simply write down 10 words or doodle a sketch for 2 quick minutes.",
        environmentPrep: "Leave your journal resting open on your favorite desk spot with a pilot pen ready to go.",
        immediateReward: "Great job. Put on your headphones and chill out to your favorite ambient track."
      };
    }
    return {
      stackedHabit: "Hey, right after you pour your morning cup of coffee",
      twoMinRule: "Pop open a book and read just 1 page or write 1 quick sentence. Easy win!",
      environmentPrep: "Leave your notebook wide open on the desk with a pen right next to it before you head to sleep.",
      immediateReward: "Boom! Check off your tracker and enjoy that warm cup of coffee."
    };
  })
}));

describe('Onboarding Wizard Flow', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  test('should guide user through step transitions, validate inputs, and submit data', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);

    // --- STEP 1: Define Identity ---
    expect(screen.getByText('Who do you want to become?')).toBeInTheDocument();
    
    // Define Habit System button should be disabled initially
    const nextBtn = screen.getByRole('button', { name: /Define Habit System/i });
    expect(nextBtn).toBeDisabled();

    // Type identity details using fast fireEvent
    const identityInput = screen.getByPlaceholderText('e.g. The Athlete');
    const beliefInput = screen.getByPlaceholderText(/I am a healthy person who respects my body/i);

    fireEvent.change(identityInput, { target: { value: 'The Scholar' } });
    fireEvent.change(beliefInput, { target: { value: 'I am a focused student who loves learning.' } });

    // Button should now be enabled
    expect(nextBtn).toBeEnabled();

    // Go to Step 2
    await user.click(nextBtn);

    // --- STEP 2: Create Habit Loop ---
    expect(screen.getByText('Create Your First Habit Loop')).toBeInTheDocument();

    // Verify inputs in Step 2
    const habitTitleInput = screen.getByPlaceholderText('e.g. Morning Bodyweight Workout');
    const timeInput = screen.getByPlaceholderText('07:30 AM (Optional)');
    const locationInput = screen.getByPlaceholderText('Living Room (Optional)');

    fireEvent.change(habitTitleInput, { target: { value: 'Read research papers' } });
    fireEvent.change(timeInput, { target: { value: '08:00 AM' } });
    fireEvent.change(locationInput, { target: { value: 'University library' } });

    // Fill out the 4 laws manually
    const stackedInput = screen.getByPlaceholderText('e.g. After I drink my morning glass of water');
    const prepInput = screen.getByPlaceholderText('e.g. Lay out exercise mat next to the coffee table before bed');
    const twoMinInput = screen.getByPlaceholderText('e.g. Do 5 bodyweight squats and 1 plank');
    const rewardInput = screen.getByPlaceholderText('e.g. Enjoy a cool protein shake and sit down to read');

    fireEvent.change(stackedInput, { target: { value: 'After sitting down with tea' } });
    fireEvent.change(prepInput, { target: { value: 'Place paper open on my desk' } });
    fireEvent.change(twoMinInput, { target: { value: 'Read title and abstract' } });
    fireEvent.change(rewardInput, { target: { value: 'Eat a piece of dark chocolate' } });

    // Submit the form
    const finishBtn = screen.getByRole('button', { name: /Lock in Identity & Go to Dashboard/i });
    await user.click(finishBtn);

    // Verify Firestore service was invoked with identity
    expect(firestoreService.saveIdentity).toHaveBeenCalledWith(
      'mock-user-123',
      expect.objectContaining({
        name: 'The Scholar',
        beliefStatement: 'I am a focused student who loves learning.'
      })
    );

    // Verify Firestore service was invoked with habit linked to the identity
    await waitFor(() => {
      expect(firestoreService.saveHabit).toHaveBeenCalledWith(
        'mock-user-123',
        expect.objectContaining({
          identityId: 'new-id', // resolves from mock saveIdentity returning { id: 'new-id' }
          title: 'Read research papers',
          category: 'Physical Health', // default category
          time: '08:00 AM',
          location: 'University library',
          stackedHabit: 'After sitting down with tea',
          twoMinRule: 'Read title and abstract',
          environmentPrep: 'Place paper open on my desk',
          immediateReward: 'Eat a piece of dark chocolate'
        })
      );
    });

    // Verify redirected to dashboard
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  test('should fetch and apply suggestions from the environment coach', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);

    // Define identity (Writer) to trigger specific suggestions
    const identityInput = screen.getByPlaceholderText('e.g. The Athlete');
    fireEvent.change(identityInput, { target: { value: 'Writer' } });
    
    // Go to Step 2
    const nextBtn = screen.getByRole('button', { name: /Define Habit System/i });
    await user.click(nextBtn);

    // Trigger coach suggestions
    const coachBtn = screen.getByRole('button', { name: /Ask Environment Coach/i });
    await user.click(coachBtn);

    // Check loading state
    expect(screen.getByText('Coaching...')).toBeInTheDocument();

    // Apply buttons should become visible after the 800ms mock delay
    const applyBtns = await screen.findAllByRole('button', { name: 'Use Coach Suggestion' }, { timeout: 2000 });
    expect(applyBtns.length).toBe(4);

    // Click apply suggestions for stacked routine and environment prep
    await user.click(applyBtns[0]); // stackedHabit
    await user.click(applyBtns[1]); // environmentPrep

    // Verify inputs have been populated with writer suggestions
    const stackedInput = screen.getByPlaceholderText('e.g. After I drink my morning glass of water');
    const prepInput = screen.getByPlaceholderText('e.g. Lay out exercise mat next to the coffee table before bed');
    
    expect(stackedInput.value).toBe("Right after you shut your laptop screen to wrap up the workday");
    expect(prepInput.value).toBe("Leave your journal resting open on your favorite desk spot with a pilot pen ready to go.");
  });
});
