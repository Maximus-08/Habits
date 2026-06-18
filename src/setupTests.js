import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// Mock matchMedia which JSDOM doesn't implement by default
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock framer-motion using React.createElement for standard JS parsing
vi.mock('framer-motion', () => {
  const MotionDiv = React.forwardRef(({ children, ...props }, ref) => {
    const validProps = { ...props };
    delete validProps.layout;
    delete validProps.initial;
    delete validProps.animate;
    delete validProps.exit;
    delete validProps.transition;
    delete validProps.hoverLift;
    delete validProps.whileHover;
    delete validProps.whileTap;
    delete validProps.variants;
    
    // If animate is a styling object, merge it into DOM style so assertions can read it
    const mergedStyle = {
      ...props.style,
      ...(props.animate && typeof props.animate === 'object' ? props.animate : {})
    };
    
    return React.createElement('div', { ref, style: mergedStyle, ...validProps }, children);
  });
  MotionDiv.displayName = 'MotionDiv';

  const MotionButton = React.forwardRef(({ children, ...props }, ref) => {
    const validProps = { ...props };
    delete validProps.initial;
    delete validProps.animate;
    delete validProps.exit;
    delete validProps.transition;
    return React.createElement('button', { ref, ...validProps }, children);
  });
  MotionButton.displayName = 'MotionButton';

  return {
    motion: {
      div: MotionDiv,
      button: MotionButton,
    },
    AnimatePresence: ({ children }) => React.createElement(React.Fragment, null, children),
  };
});

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => React.createElement('div', null, children),
  RadialBarChart: ({ children }) => React.createElement('div', null, children),
  RadialBar: () => React.createElement('div'),
}));

// Mock Firebase Config & Auth
vi.mock('./config/firebase', () => ({
  auth: {
    onAuthStateChanged: vi.fn((cb) => {
      // Simulate user is logged in
      cb({ 
        uid: 'mock-user-123', 
        email: 'test@example.com',
        getIdToken: vi.fn().mockResolvedValue('mock-auth-token-xyz')
      });
      return () => {};
    })
  },
  db: {},
  signOutUser: vi.fn().mockResolvedValue(),
}));

// Mock Firestore Service functions
vi.mock('./services/firestoreService', () => {
  return {
    firestoreService: {
      ensureUserProfile: vi.fn().mockResolvedValue({}),
      subscribeUserProfile: vi.fn((uid, callback) => {
        callback({ totalVotes: 10, level: 1, lastOptimizedAt: new Date().toISOString() });
        return () => {};
      }),
      subscribeIdentities: vi.fn((uid, callback) => {
        callback([{ id: 'id-1', name: 'Writer', beliefStatement: 'I write daily', totalVotes: 10 }]);
        return () => {};
      }),
      subscribeHabits: vi.fn((uid, callback) => {
        callback([{ id: 'habit-1', title: 'Write 200 words', identityId: 'id-1', frequency: 'daily' }]);
        return () => {};
      }),
      subscribeBadHabits: vi.fn((uid, callback) => {
        callback([{ id: 'bad-habit-1', name: 'Eating candy', identityId: 'id-1', lapses: [] }]);
        return () => {};
      }),
      subscribeCompletions: vi.fn((uid, callback) => {
        callback([]);
        return () => {};
      }),
      subscribeWeeklyReviews: vi.fn((uid, callback) => {
        callback([]);
        return () => {};
      }),
      subscribeTasks: vi.fn((uid, callback) => {
        callback([]);
        return () => {};
      }),
      toggleCompletion: vi.fn().mockResolvedValue(true),
      saveIdentity: vi.fn().mockResolvedValue({ id: 'new-id' }),
      updateIdentity: vi.fn().mockResolvedValue(),
      deleteIdentityAtomic: vi.fn().mockResolvedValue(),
      saveHabit: vi.fn().mockResolvedValue({ id: 'new-habit' }),
      updateHabit: vi.fn().mockResolvedValue(),
      deleteHabit: vi.fn().mockResolvedValue(),
      saveBadHabit: vi.fn().mockResolvedValue({ id: 'new-bad-habit' }),
      updateBadHabit: vi.fn().mockResolvedValue(),
      deleteBadHabit: vi.fn().mockResolvedValue(),
      logRelapse: vi.fn().mockResolvedValue(),
      saveWeeklyReview: vi.fn().mockResolvedValue(),
      saveTask: vi.fn().mockResolvedValue({ id: 'new-task' }),
      updateTask: vi.fn().mockResolvedValue(),
      deleteTask: vi.fn().mockResolvedValue(),
    }
  };
});

// Mock react-hot-toast to prevent console errors or mounting issues
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
  toast: Object.assign(
    vi.fn(),
    {
      success: vi.fn(),
      error: vi.fn(),
      loading: vi.fn(),
      dismiss: vi.fn(),
    }
  )
}));
