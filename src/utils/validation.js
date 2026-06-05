/**
 * Validation utilities for the authentication forms.
 */

export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  const errors = [];
  if (password.length < 6) {
    errors.push("Password must be at least 6 characters long");
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function formatFirebaseError(errorCode) {
  switch (errorCode) {
    case 'auth/user-not-found':
    case 'user-not-found':
      return "No account exists with this email address.";
    case 'auth/wrong-password':
    case 'wrong-password':
      return "Incorrect password. Please try again.";
    case 'auth/email-already-in-use':
    case 'email-already-in-use':
      return "An account already exists with this email address.";
    case 'auth/invalid-email':
    case 'invalid-email':
      return "Please enter a valid email address.";
    case 'auth/weak-password':
    case 'weak-password':
      return "Password is too weak. Must be at least 6 characters.";
    case 'auth/popup-closed-by-user':
    case 'popup-closed-by-user':
      return "Sign in popup was closed. Please try again.";
    default:
      return null;
  }
}
