import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  Button, 
  Card, 
  Progress, 
  Tooltip, 
  Slider, 
  Dialog, 
  Input, 
  Textarea, 
  Select 
} from './Primitives';

describe('UI Primitives Unit Tests', () => {
  
  describe('Button', () => {
    test('renders button with children and supports click events', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      
      const btn = screen.getByRole('button', { name: 'Click Me' });
      expect(btn).toBeInTheDocument();
      
      await user.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('applies variant and size styles correctly', () => {
      render(
        <Button variant="success" size="sm">
          Success Small
        </Button>
      );
      const btn = screen.getByRole('button', { name: 'Success Small' });
      expect(btn.className).toContain('bg-success');
      expect(btn.className).toContain('h-8'); // Small size height
    });
  });

  describe('Card', () => {
    test('renders content and applies lift class conditionally', () => {
      const { rerender } = render(<Card hoverLift={true}>Card content</Card>);
      expect(screen.getByText('Card content')).toHaveClass('hover:-translate-y-0.5');

      rerender(<Card hoverLift={false}>Card content</Card>);
      expect(screen.getByText('Card content')).not.toHaveClass('hover:-translate-y-0.5');
    });
  });

  describe('Progress', () => {
    test('clamps values and renders inner progress bar with correct width style', () => {
      const { rerender } = render(<Progress value={45} />);
      const progressBar = document.querySelector('.bg-success');
      expect(progressBar.style.width).toBe('45%');

      // Clamp value to 100 max
      rerender(<Progress value={150} />);
      expect(progressBar.style.width).toBe('100%');

      // Clamp value to 0 min
      rerender(<Progress value={-20} />);
      expect(progressBar.style.width).toBe('0%');
    });
  });

  describe('Tooltip', () => {
    test('displays content on mouse enter and hides on mouse leave', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Tooltip Hint">
          <span>Hover Me</span>
        </Tooltip>
      );

      // Hint initially not visible
      expect(screen.queryByText('Tooltip Hint')).not.toBeInTheDocument();

      // Mouse enter
      await user.hover(screen.getByText('Hover Me'));
      expect(screen.getByText('Tooltip Hint')).toBeInTheDocument();

      // Mouse leave
      await user.unhover(screen.getByText('Hover Me'));
      // Since AnimatePresence is mocked synchronously, it should disappear immediately
      expect(screen.queryByText('Tooltip Hint')).not.toBeInTheDocument();
    });
  });

  describe('Slider', () => {
    test('displays value and updates it on input change', () => {
      const handleChange = vi.fn();
      render(<Slider value={5} onChange={handleChange} min={0} max={10} />);
      
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect(slider.value).toBe('5');
      expect(screen.getByText('5')).toBeInTheDocument(); // displays current value indicator

      fireEvent.change(slider, { target: { value: '8' } });
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Dialog', () => {
    test('opens, locks scroll, displays children, and closes on backdrop click', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      
      const { rerender } = render(
        <Dialog isOpen={false} onClose={handleClose} title="Modal Title">
          <div>Modal Body</div>
        </Dialog>
      );

      expect(screen.queryByText('Modal Title')).not.toBeInTheDocument();

      // Rerender open
      rerender(
        <Dialog isOpen={true} onClose={handleClose} title="Modal Title">
          <div>Modal Body</div>
        </Dialog>
      );

      expect(screen.getByRole('heading', { name: 'Modal Title' })).toBeInTheDocument();
      expect(screen.getByText('Modal Body')).toBeInTheDocument();
      expect(document.body.style.overflow).toBe('hidden'); // locks scroll

      // Click close icon button
      const closeBtn = screen.getByRole('button', { name: '' }); // X close button
      await user.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      // Unmount/close scroll unlock
      rerender(
        <Dialog isOpen={false} onClose={handleClose} title="Modal Title">
          <div>Modal Body</div>
        </Dialog>
      );
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Input and Textarea', () => {
    test('render correctly and forward ref', () => {
      const inputRef = React.createRef();
      const textareaRef = React.createRef();
      
      render(
        <div>
          <Input ref={inputRef} placeholder="Enter name" />
          <Textarea ref={textareaRef} placeholder="Enter description" />
        </div>
      );

      expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
      expect(textareaRef.current).toBeInstanceOf(HTMLTextAreaElement);
    });
  });

  describe('Select', () => {
    test('displays options and triggers change callback on option select', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      
      render(
        <Select value="opt-2" onChange={handleChange}>
          <option value="opt-1">Option 1</option>
          <option value="opt-2">Option 2</option>
          <option value="opt-3">Option 3</option>
        </Select>
      );

      // Shows selected option label
      expect(screen.getByText('Option 2')).toBeInTheDocument();

      // Menu is initially closed (Option 1 is not in document as a trigger button label or dropdown option yet)
      // Since Option 2 is selected, only Option 2 text is present in DOM.
      expect(screen.queryByRole('button', { name: 'Option 1' })).not.toBeInTheDocument();

      // Click trigger button to open dropdown
      const selectBtn = screen.getByRole('button', { name: 'Option 2' });
      await user.click(selectBtn);

      // Option 1 dropdown button is now visible
      const option1Btn = screen.getByRole('button', { name: 'Option 1' });
      expect(option1Btn).toBeInTheDocument();

      // Select Option 1
      await user.click(option1Btn);

      // Change callback should trigger with selection
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { value: 'opt-1' }
        })
      );
    });
  });

});
