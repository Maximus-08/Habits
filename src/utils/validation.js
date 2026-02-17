// Email validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation - improved with more requirements
export const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Habit validation
export const validateHabit = (habit) => {
  const errors = {};

  if (!habit.title || habit.title.trim() === '') {
    errors.title = 'Title is required';
  } else if (habit.title.length > 100) {
    errors.title = 'Title must be less than 100 characters';
  }

  if (!habit.description || habit.description.trim() === '') {
    errors.description = 'Description is required';
  } else if (habit.description.length > 500) {
    errors.description = 'Description must be less than 500 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Identity validation
export const validateIdentity = (identity) => {
  if (!identity || identity.trim() === '') {
    return { isValid: false, error: 'Identity cannot be empty' };
  }

  if (identity.length > 50) {
    return { isValid: false, error: 'Identity must be less than 50 characters' };
  }

  return { isValid: true, error: null };
};

// Format Firebase error messages to be user-friendly
export const formatFirebaseError = (errorCode) => {
  const errorMessages = {
    'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password should be at least 8 characters long.',
    'auth/user-not-found': 'No account found with this email. Please sign up.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    'auth/popup-closed-by-user': 'Sign in was cancelled. Please try again.',
    'auth/configuration-not-found': 'Firebase is not properly configured. Please contact support.'
  };

  return errorMessages[errorCode] || 'An error occurred. Please try again.';
};

// Sanitize user input
// NOTE: This is a basic sanitization. React's JSX automatically escapes content,
// so this is mainly for data stored in the database. For rendering user-generated
// HTML content (which this app doesn't do), use a library like DOMPurify.
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers like onclick=
};
