import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../utils/test-utils';
import userEvent from '@testing-library/user-event';
import BadHabitCard from './BadHabitCard';
import { firestoreService } from '../services/firestoreService';

describe('BadHabitCard User Behavior', () => {
  const mockBadHabit = {
    id: 'bad-habit-1',
    name: 'Eating late night snacks',
    identityId: 'id-1', // maps to 'Writer' from our setupTests mock
    trigger: 'Watching TV at 10 PM',
    invisibleStrategy: 'Unplug the TV',
    difficultStrategy: 'Put snacks in a high cabinet',
    lapses: [
      { 
        date: '2026-06-01T20:00:00.000Z', 
        triggerDetail: 'Stressed after work', 
        environmentAdjustment: 'Drink hot tea instead' 
      }
    ]
  };

  test('should render bad habit details and friction strategies', async () => {
    render(<BadHabitCard badHabit={mockBadHabit} onDelete={vi.fn()} />);

    // Wait for the identities context state update to resolve and apply
    expect(await screen.findByText('Writer • Anti-Habit')).toBeInTheDocument();

    // Verify title and trigger
    expect(screen.getByText('Eating late night snacks')).toBeInTheDocument();
    expect(screen.getByText('Watching TV at 10 PM')).toBeInTheDocument();

    // Verify active brakes / friction strategies
    expect(screen.getByText('Unplug the TV')).toBeInTheDocument();
    expect(screen.getByText('Put snacks in a high cabinet')).toBeInTheDocument();
  });

  test('should toggle slip log details visibility', async () => {
    const user = userEvent.setup();
    render(<BadHabitCard badHabit={mockBadHabit} onDelete={vi.fn()} />);

    // Wait for initial context sync
    expect(await screen.findByText('Writer • Anti-Habit')).toBeInTheDocument();

    // Lapse reflection content should not be in document initially
    expect(screen.queryByText('Slip Reflection Log')).not.toBeInTheDocument();

    // Click "View Slip Log (1)"
    const toggleLogBtn = screen.getByRole('button', { name: /View Slip Log/i });
    await user.click(toggleLogBtn);

    // Verify slip reflection log title is visible
    expect(screen.getByText('Slip Reflection Log')).toBeInTheDocument();
    expect(screen.getByText('Stressed after work')).toBeInTheDocument();
    expect(screen.getByText('Drink hot tea instead')).toBeInTheDocument();

    // Click "Hide Slip Log"
    await user.click(toggleLogBtn);

    // Verify history disappears
    expect(screen.queryByText('Slip Reflection Log')).not.toBeInTheDocument();
  });

  test('should invoke onDelete callback on trash button click', async () => {
    const user = userEvent.setup();
    const mockOnDelete = vi.fn();
    render(<BadHabitCard badHabit={mockBadHabit} onDelete={mockOnDelete} />);

    // Wait for initial context sync
    expect(await screen.findByText('Writer • Anti-Habit')).toBeInTheDocument();

    const deleteBtn = screen.getByTitle('Delete Bad Habit');
    await user.click(deleteBtn);

    expect(mockOnDelete).toHaveBeenCalledWith('bad-habit-1');
  });

  test('should open relapse diagnosis dialog, allow typing reflection details, and report relapse', async () => {
    const user = userEvent.setup();
    render(<BadHabitCard badHabit={mockBadHabit} onDelete={vi.fn()} />);

    // Wait for initial context sync
    expect(await screen.findByText('Writer • Anti-Habit')).toBeInTheDocument();

    // Modal is initially closed, diagnosis title not visible
    expect(screen.queryByRole('heading', { name: /Relapse Diagnosis/i })).not.toBeInTheDocument();

    // Click "Report Relapse" button
    const reportBtn = screen.getByRole('button', { name: /Report Relapse/i });
    await user.click(reportBtn);

    // Verify dialog title is now visible
    expect(screen.getByRole('heading', { name: /Relapse Diagnosis: Eating late night snacks/i })).toBeInTheDocument();

    // Fill form fields using placeholders
    const triggerInput = screen.getByPlaceholderText(/Detail the location, visual cue/i);
    const envInput = screen.getByPlaceholderText(/How can you make this trigger invisible/i);
    const dateInput = document.querySelector('input[type="date"]');

    await user.type(triggerInput, 'Felt bored watching late night TV');
    await user.type(envInput, 'Put the remote in a different room');
    await user.type(dateInput, '2026-06-05');

    // Submit the form
    const submitBtn = screen.getByRole('button', { name: /Diagnose & Reset/i });
    await user.click(submitBtn);

    // Verify that firestoreService.logRelapse was called with the form parameters
    expect(firestoreService.logRelapse).toHaveBeenCalledWith(
      'mock-user-123',
      'bad-habit-1',
      expect.objectContaining({
        triggerDetail: 'Felt bored watching late night TV',
        environmentAdjustment: 'Put the remote in a different room',
        date: expect.any(String), // parsed date ISO string
      })
    );
  });
});
