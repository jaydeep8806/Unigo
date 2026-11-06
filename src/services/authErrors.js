export function accountErrorMessage(error) {
  const message = error?.message || '';
  if (/failed to fetch|fetch failed|network request failed|networkerror|load failed/i.test(message)) {
    return 'Cannot reach the UNIGO account server. Account creation or sign-in could not be confirmed. Check your connection and try again; if this continues, the account service needs to be restored.';
  }
  return message || 'Could not complete your request. Please try again.';
}
