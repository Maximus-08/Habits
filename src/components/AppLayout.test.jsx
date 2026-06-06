import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Navigate } from 'react-router-dom';
import AppLayout from './AppLayout';
import * as HabitsContext from '../context/HabitsContext';

// Spy on useHabits hook to custom mock context values
const useHabitsSpy = vi.spyOn(HabitsContext, 'useHabits');

// Mock Navigate to assert on router redirects
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: vi.fn(({ to }) => <div data-testid="navigate" data-to={to} />)
  };
});

describe('AppLayout Route Guards & States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render Connection Unreachable view when dbError is true', () => {
    useHabitsSpy.mockReturnValue({
      currentUser: { uid: 'user-123' },
      authLoading: false,
      dbError: true,
      initialSyncCompleted: false,
      identities: [],
      userProfile: {},
      logout: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppLayout>
          <div>Dashboard Child</div>
        </AppLayout>
      </MemoryRouter>
    );

    // Verify database error view
    expect(screen.getByText('Connection Unreachable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry Connection' })).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Child')).not.toBeInTheDocument();
  });

  test('should render loading spinner when authLoading is true', () => {
    useHabitsSpy.mockReturnValue({
      currentUser: null,
      authLoading: true,
      dbError: false,
      initialSyncCompleted: false,
      identities: [],
      userProfile: {},
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    expect(screen.getByText('Loading Habits...')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  test('should redirect to landing page if user is not authenticated and tries to visit dashboard', () => {
    useHabitsSpy.mockReturnValue({
      currentUser: null,
      authLoading: false,
      dbError: false,
      initialSyncCompleted: false,
      identities: [],
      userProfile: {},
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppLayout>
          <div>Dashboard Child</div>
        </AppLayout>
      </MemoryRouter>
    );

    // Assert redirect to landing page
    expect(Navigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/', replace: true }),
      expect.anything()
    );
  });

  test('should redirect to dashboard if user is authenticated and tries to visit landing page', () => {
    useHabitsSpy.mockReturnValue({
      currentUser: { uid: 'user-123' },
      authLoading: false,
      dbError: false,
      initialSyncCompleted: false,
      identities: [],
      userProfile: {},
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <AppLayout>
          <div>Landing Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    // Assert redirect to dashboard
    expect(Navigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/dashboard', replace: true }),
      expect.anything()
    );
  });

  test('should redirect to onboarding page if user has zero identities and has never onboarded', () => {
    useHabitsSpy.mockReturnValue({
      currentUser: { uid: 'user-123' },
      authLoading: false,
      dbError: false,
      initialSyncCompleted: true,
      identities: [],
      userProfile: {},
    });

    // Mock localStorage to return no onboarding flag
    const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppLayout>
          <div>Dashboard Child</div>
        </AppLayout>
      </MemoryRouter>
    );

    // Assert redirect to onboarding
    expect(Navigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/onboarding', replace: true }),
      expect.anything()
    );

    getSpy.mockRestore();
  });

  test('should skip onboarding page and redirect to dashboard if user has already onboarded', () => {
    useHabitsSpy.mockReturnValue({
      currentUser: { uid: 'user-123' },
      authLoading: false,
      dbError: false,
      initialSyncCompleted: true,
      identities: [{ id: 'identity-1', name: 'The Runner' }],
      userProfile: {},
    });

    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <AppLayout>
          <div>Onboarding Wizard</div>
        </AppLayout>
      </MemoryRouter>
    );

    // Assert redirect to dashboard since user has identities
    expect(Navigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/dashboard', replace: true }),
      expect.anything()
    );
  });

  test('should render header nav and children if authenticated and onboarding is completed', () => {
    useHabitsSpy.mockReturnValue({
      currentUser: { uid: 'user-123', email: 'test@example.com' },
      authLoading: false,
      dbError: false,
      initialSyncCompleted: true,
      identities: [{ id: 'identity-1', name: 'The Runner' }],
      userProfile: { level: 2 },
      logout: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppLayout>
          <div data-testid="child">Dashboard Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    // Navbar should be rendered
    expect(screen.getAllByRole('link', { name: /Dashboard/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Environment/i })[0]).toBeInTheDocument();
    expect(screen.getByText('Lvl 2')).toBeInTheDocument();
    
    // Child element should render
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
