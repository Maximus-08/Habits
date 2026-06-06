import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '../utils/test-utils';
import userEvent from '@testing-library/user-event';
import HabitCard from './HabitCard';
import { firestoreService } from '../services/firestoreService';

describe('HabitCard User Behavior', () => {
  const mockHabit = {
    id: 'habit-1',
    title: 'Write 200 words',
    identityId: 'id-1',
    category: 'Creativity',
    description: 'Write daily to build identity',
    stackedHabit: 'After my morning coffee',
    time: '08:00 AM',
    location: 'Study desk',
    environmentPrep: 'Open laptop, close all tabs',
    immediateReward: 'Check off list, feel productive',
    twoMinRule: 'Open laptop and write one sentence',
  };

  test('should render habit details and complete intention sentence', () => {
    render(
      <HabitCard 
        habit={mockHabit} 
        onEdit={vi.fn()} 
        onDelete={vi.fn()} 
      />
    );

    // Verify category badge (case sensitive matched to actual text content)
    expect(screen.getByText('Creativity')).toBeInTheDocument();

    // Verify intention sentence composing stacked habits, title, time, and location
    expect(screen.getByText(/After my morning coffee, I will/i).textContent).toContain(
      '"After my morning coffee, I will Write 200 words at 08:00 AM in Study desk."'
    );

    // Verify details
    expect(screen.getByText('Write daily to build identity')).toBeInTheDocument();
    expect(screen.getByText(/Prep:/i)).toBeInTheDocument();
    expect(screen.getByText('Open laptop, close all tabs')).toBeInTheDocument();
    expect(screen.getByText(/Reward:/i)).toBeInTheDocument();
    expect(screen.getByText('Check off list, feel productive')).toBeInTheDocument();
    expect(screen.getByText(/2-Min:/i)).toBeInTheDocument();
    expect(screen.getByText('Open laptop and write one sentence')).toBeInTheDocument();
  });

  test('should invoke firestore toggleCompletion on full vote click', async () => {
    const user = userEvent.setup();
    render(
      <HabitCard 
        habit={mockHabit} 
        onEdit={vi.fn()} 
        onDelete={vi.fn()} 
      />
    );

    // Toggle button by label
    const voteBtn = screen.getByRole('button', { name: 'Cast full vote for identity' });
    await user.click(voteBtn);

    // Verify database service is invoked
    expect(firestoreService.toggleCompletion).toHaveBeenCalledWith(
      'mock-user-123',
      'habit-1',
      expect.any(String), // normalized date
      false, // full version, not 2-minute version
      '' // empty notes
    );
  });

  test('should invoke firestore toggleCompletion on 2-min version click', async () => {
    const user = userEvent.setup();
    render(
      <HabitCard 
        habit={mockHabit} 
        onEdit={vi.fn()} 
        onDelete={vi.fn()} 
      />
    );

    // Find the 2-Min action button (name matches its aria-label)
    const twoMinBtn = screen.getByRole('button', { name: 'Execute the 2-minute version of the habit' });
    await user.click(twoMinBtn);

    // Verify database service is invoked with isTwoMinVersion = true
    expect(firestoreService.toggleCompletion).toHaveBeenCalledWith(
      'mock-user-123',
      'habit-1',
      expect.any(String), // normalized date
      true, // 2-minute version
      '' // empty notes
    );
  });

  test('should invoke onEdit and onDelete callbacks', async () => {
    const user = userEvent.setup();
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();

    render(
      <HabitCard 
        habit={mockHabit} 
        onEdit={mockOnEdit} 
        onDelete={mockOnDelete} 
      />
    );

    // Trigger edit
    const editBtn = screen.getByTitle('Edit Habit System');
    await user.click(editBtn);
    expect(mockOnEdit).toHaveBeenCalledWith(mockHabit);

    // Trigger delete
    const deleteBtn = screen.getByTitle('Delete Habit');
    await user.click(deleteBtn);
    expect(mockOnDelete).toHaveBeenCalledWith(mockHabit.id);
  });
});
