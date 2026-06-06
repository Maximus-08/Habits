import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../utils/test-utils';
import userEvent from '@testing-library/user-event';
import Dashboard from './Dashboard';
import { firestoreService } from '../services/firestoreService';

describe('Dashboard Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render greeting, level bar, cards, and support calendar date changes', async () => {
    console.log("[DEBUG Dashboard] Starting test 1");
    render(<Dashboard />);

    // Wait for the asynchronous userProfile and identities context sync to complete
    expect(await screen.findByText('10')).toBeInTheDocument(); // Mock user totalVotes = 10
    expect((await screen.findAllByText('Writer'))[0]).toBeInTheDocument();
    console.log("[DEBUG Dashboard] Test 1 synced");

    // Renders calendar date logging block
    expect(screen.getByText(/Active Logging:/i)).toBeInTheDocument();
    
    // Renders level bar metrics
    expect(screen.getByText(/Total Votes Cast/i)).toBeInTheDocument();

    // Verify mock content detail
    expect(screen.getAllByText(/"I write daily"/i)[0]).toBeInTheDocument();

    // Renders our mock habit card 'Write 200 words'
    expect(screen.getByText('Write 200 words')).toBeInTheDocument();

    // Renders our mock anti-habit card 'Eating candy'
    expect(screen.getAllByText('Eating candy')[0]).toBeInTheDocument();

    // Verify calendar date input change
    const dateInput = document.querySelector('input[type="date"]');
    expect(dateInput).toBeInTheDocument();
    
    // Change date
    fireEvent.change(dateInput, { target: { value: '2026-06-01' } });
    expect(dateInput.value).toBe('2026-06-01');
    console.log("[DEBUG Dashboard] Test 1 complete");
  });

  test('should open dialog modal and define new identity card', async () => {
    console.log("[DEBUG Dashboard] Starting test 2");
    const user = userEvent.setup();
    render(<Dashboard />);

    // Wait for context sync
    expect((await screen.findAllByText('Writer'))[0]).toBeInTheDocument();
    console.log("[DEBUG Dashboard] Test 2 synced");

    // Dialog is initially closed
    expect(screen.queryByRole('heading', { name: 'Define Identity Card' })).not.toBeInTheDocument();

    // Click exact "Define Identity" button
    const defineIdBtn = screen.getByRole('button', { name: 'Define Identity' });
    await user.click(defineIdBtn);
    console.log("[DEBUG Dashboard] Test 2 clicked Define Identity");

    // Verify Dialog opened
    expect(screen.getByRole('heading', { name: 'Define Identity Card' })).toBeInTheDocument();

    // Fill form elements using fireEvent for speed
    const nameInput = screen.getByPlaceholderText(/e.g. The Athlete, The Mindful Thinker/i);
    const beliefInput = screen.getByPlaceholderText(/e.g. I am the type of person who values/i);
    
    fireEvent.change(nameInput, { target: { value: 'The Programmer' } });
    fireEvent.change(beliefInput, { target: { value: 'I build clean systems and write daily tests.' } });

    // Click Establish Identity button
    const submitBtn = screen.getByRole('button', { name: 'Establish Identity' });
    await user.click(submitBtn);
    console.log("[DEBUG Dashboard] Test 2 clicked Establish Identity");

    // Verify database service was called
    expect(firestoreService.saveIdentity).toHaveBeenCalledWith(
      'mock-user-123',
      expect.objectContaining({
        name: 'The Programmer',
        beliefStatement: 'I build clean systems and write daily tests.'
      })
    );
    console.log("[DEBUG Dashboard] Test 2 complete");
  });

  test('should open dialog and add habit engine', async () => {
    console.log("[DEBUG Dashboard] Starting test 3");
    const user = userEvent.setup();
    render(<Dashboard />);

    // Wait for context sync
    expect((await screen.findAllByText('Writer'))[0]).toBeInTheDocument();
    console.log("[DEBUG Dashboard] Test 3 synced");

    // Click "Add Habit System" button
    const addHabitBtn = screen.getByRole('button', { name: /Add Habit System/i });
    await user.click(addHabitBtn);
    console.log("[DEBUG Dashboard] Test 3 clicked Add Habit System");

    // Verify Dialog opened
    expect(screen.getByRole('heading', { name: 'Add Habit Engine' })).toBeInTheDocument();

    // Fill title
    const titleInput = screen.getByPlaceholderText(/e.g. Morning Squats, Daily Journaling/i);
    fireEvent.change(titleInput, { target: { value: 'Coding for 1 hour' } });

    // Fill 4 laws inputs
    const stackInput = screen.getByPlaceholderText(/After I \[current habit\]/i);
    const prepInput = screen.getByPlaceholderText(/To prime space/i);
    const twoMinInput = screen.getByPlaceholderText(/Simplified version/i);
    const rewardInput = screen.getByPlaceholderText(/After completion/i);

    fireEvent.change(stackInput, { target: { value: 'After morning standup' } });
    fireEvent.change(prepInput, { target: { value: 'Turn off slack, close email tabs' } });
    fireEvent.change(twoMinInput, { target: { value: 'Write 5 lines of code' } });
    fireEvent.change(rewardInput, { target: { value: 'Get a cup of green tea' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: 'Activate System' });
    await user.click(submitBtn);
    console.log("[DEBUG Dashboard] Test 3 clicked Activate System");

    // Verify database service was called
    expect(firestoreService.saveHabit).toHaveBeenCalledWith(
      'mock-user-123',
      expect.objectContaining({
        identityId: 'id-1', // Anchored to first identity by default
        title: 'Coding for 1 hour',
        stackedHabit: 'After morning standup',
        environmentPrep: 'Turn off slack, close email tabs',
        twoMinRule: 'Write 5 lines of code',
        immediateReward: 'Get a cup of green tea'
      })
    );
    console.log("[DEBUG Dashboard] Test 3 complete");
  });

  test('should open dialog and install anti-habit brakes', async () => {
    console.log("[DEBUG Dashboard] Starting test 4");
    const user = userEvent.setup();
    render(<Dashboard />);

    // Wait for context sync
    expect((await screen.findAllByText('Writer'))[0]).toBeInTheDocument();
    console.log("[DEBUG Dashboard] Test 4 synced");

    // Click "Add Anti-Habit" button
    const addAntiHabitBtn = screen.getByRole('button', { name: /Add Anti-Habit/i });
    await user.click(addAntiHabitBtn);
    console.log("[DEBUG Dashboard] Test 4 clicked Add Anti-Habit");

    // Verify Dialog opened
    expect(screen.getByRole('heading', { name: 'Add Anti-Habit (Friction Installation)' })).toBeInTheDocument();

    // Fill details
    const nameInput = screen.getByPlaceholderText(/e.g. Late Night Snacking, Doom Scrolling/i);
    const triggerInput = screen.getByPlaceholderText(/Visual cue or situation/i);
    const invisibleInput = screen.getByPlaceholderText(/Hide cue/i);
    const difficultInput = screen.getByPlaceholderText(/Add obstacles/i);

    fireEvent.change(nameInput, { target: { value: 'Doom scrolling twitter' } });
    fireEvent.change(triggerInput, { target: { value: 'Sitting on couch after work' } });
    fireEvent.change(invisibleInput, { target: { value: 'Put phone in bedroom drawer' } });
    fireEvent.change(difficultInput, { target: { value: 'Set app blocker limits' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: 'Install Brakes' });
    await user.click(submitBtn);
    console.log("[DEBUG Dashboard] Test 4 clicked Install Brakes");

    // Verify database service was called
    expect(firestoreService.saveBadHabit).toHaveBeenCalledWith(
      'mock-user-123',
      expect.objectContaining({
        identityId: 'id-1',
        name: 'Doom scrolling twitter',
        trigger: 'Sitting on couch after work',
        invisibleStrategy: 'Put phone in bedroom drawer',
        difficultStrategy: 'Set app blocker limits'
      })
    );
    console.log("[DEBUG Dashboard] Test 4 complete");
  });
});
