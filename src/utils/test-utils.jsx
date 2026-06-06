import { render } from '@testing-library/react';
import { HabitsProvider } from '../context/HabitsContext';
import { MemoryRouter } from 'react-router-dom';

function customRender(ui, options = {}) {
  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter>
        <HabitsProvider>
          {children}
        </HabitsProvider>
      </MemoryRouter>
    ),
    ...options,
  });
}

// Re-export all React Testing Library helpers
export * from '@testing-library/react';

// Override the standard render with our wrapped version
export { customRender as render };
