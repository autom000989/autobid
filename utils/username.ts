/**
 * Instagram-style username utility functions
 * Enforces no spaces, no gaps, allowed characters: a-z, 0-9, underscores (_), and periods (.)
 */

export const sanitizeInstagramUsername = (input: string): string => {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/\s+/g, '_') // Replace any spaces or gaps with underscores
    .replace(/[^a-z0-9_.]/g, '') // Remove any disallowed characters
    .replace(/\.{2,}/g, '.'); // Collapse multiple consecutive dots to a single dot
};

export interface UsernameValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateInstagramUsername = (rawUsername: string): UsernameValidationResult => {
  const username = rawUsername?.trim();
  
  if (!username) {
    return { isValid: false, error: 'Username cannot be blank.' };
  }

  if (/\s/.test(rawUsername)) {
    return { isValid: false, error: 'Usernames cannot contain spaces or gaps. Use underscores (_) or periods (.) instead.' };
  }

  if (username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long.' };
  }

  if (username.length > 30) {
    return { isValid: false, error: 'Username cannot exceed 30 characters.' };
  }

  if (!/^[a-z0-9_.]+$/.test(username)) {
    return { isValid: false, error: 'Usernames can only contain lowercase letters, numbers, underscores (_), and periods (.).' };
  }

  if (username.startsWith('.')) {
    return { isValid: false, error: 'Username cannot begin with a period (.).' };
  }

  if (username.endsWith('.')) {
    return { isValid: false, error: 'Username cannot end with a period (.).' };
  }

  if (username.includes('..')) {
    return { isValid: false, error: 'Username cannot contain consecutive periods (..).' };
  }

  return { isValid: true };
};
