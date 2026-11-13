export const AUTH_LIMITS = { name: 80, email: 254, passwordMin: 6, passwordMax: 12 };

// Validate again on submit; keyboard types and input limits alone are not validation.
export function validateAuthFields(values, signup = false) {
  const errors = {};
  const email = (values.email || '').trim();
  const password = values.password || '';
  if (!email) errors.email = 'Enter your email address.';
  else if (email.length > AUTH_LIMITS.email || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) {
    errors.email = 'Enter a valid email address, such as name@example.com.';
  }
  if (!password) errors.password = 'Enter your password.';
  if (signup) {
    const name = (values.name || '').trim();
    if (!name) errors.name = 'Enter your name.';
    else if (name.length < 2 || name.length > AUTH_LIMITS.name) errors.name = 'Use 2–80 characters for your name.';
    else if (!/^[\p{L}\p{M} .\u2019'\-]+$/u.test(name) || !/\p{L}/u.test(name)) {
      errors.name = 'Use letters, spaces, apostrophes, hyphens or periods.';
    }
    if (password && (password.length < AUTH_LIMITS.passwordMin || password.length > AUTH_LIMITS.passwordMax)) {
      errors.password = 'Use 6–12 characters for your password.';
    }
    if (!values.confirmPassword) errors.confirmPassword = 'Confirm your password.';
    else if (values.confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.';
  }
  return errors;
}
