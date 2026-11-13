export function accountErrorMessage(error) {
  const message = error?.message || '';
  if (error?.code === 'email_address_not_authorized') return 'This email address is not authorized by the account server. The app owner needs to configure email delivery.';
  if (error?.code === 'over_email_send_rate_limit' || error?.code === 'over_request_rate_limit') return 'Too many email requests. Please wait before trying again.';
  if (error?.code === 'email_not_confirmed') return 'Confirm your email before logging in. Enter the code sent to your inbox or request another code.';
  if (/failed to fetch|fetch failed|network request failed|networkerror|load failed/i.test(message)) {
    return 'Cannot reach the UNIGO account server. Account creation or sign-in could not be confirmed. Check your connection and try again; if this continues, the account service needs to be restored.';
  }
  return message || 'Could not complete your request. Please try again.';
}
