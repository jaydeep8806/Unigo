# Login and signup

New users create an account from the welcome screen; returning users can log in. An authenticated account is required before choosing the user or driver section. Existing food/shop and driver account sheets share the same form and validation.

## Field restrictions

- Name (signup): 2–80 characters after trimming, with Unicode letters/marks, spaces, periods, apostrophes or hyphens. A single name is allowed.
- Email: required, a valid address format, up to 254 characters. Surrounding whitespace is trimmed.
- Password (signup): 8–128 characters, at least one Unicode letter and one ASCII digit. Spaces and symbols are allowed. Passwords are never trimmed.
- Confirmation (signup): required and must match the password exactly.
- Password (login): required; new signup rules are deliberately not applied to existing accounts.

Validation runs on blur and submit. Errors update as the user corrects a field. Invalid submissions focus the first failing field. Submitting disables the form, and a synchronous guard prevents duplicate requests.

## Account behavior

Google sign-in requires enabling the Google provider in Supabase Auth with a Google OAuth client. Add `unigo://auth/callback` and each web origin's `/login` URL (for example `http://localhost:8081/login`) to the Supabase Auth redirect allowlist. Configure the Google OAuth client with the Supabase callback URL from the provider settings. Native sign-in uses Expo WebBrowser; rebuild the native app after adding it. Real Google sign-in requires those hosted settings and an account to test.

Confirmation email delivery is controlled by the hosted Supabase project. Its built-in email service is intended for testing, sends only to organization team members and has a low project-wide rate limit. Configure a custom SMTP provider in Supabase Auth to send to other users, then check Auth logs and the email provider's delivery logs when diagnosing missing messages. The app offers a resend link after signup and after an unconfirmed-email login error; a successful resend request does not prove delivery. See https://supabase.com/docs/guides/auth/auth-smtp.

The form uses the existing Supabase email/password provider and environment variables in `.env.example`. Signup stores the name in `user_metadata.full_name` and the selected user or driver experience in `user_metadata.unigo_role`. Existing accounts without a saved choice and Google accounts default to user; they can switch in their profile. This client-editable preference is not an authorization or driver approval mechanism. Enable Confirm email in Supabase Auth and include `{{ .Token }}` in the hosted Confirm signup email template so users receive a code. After verifying the code, the app ends the temporary session and returns to login. Users with an unconfirmed account can enter or resend a code from login. If email confirmation is disabled in Supabase, signup can create a session immediately and the OTP step will not appear. After authentication, users complete location setup if needed. A successful account session is restored by Supabase on future launches. Existing local guest sessions cannot bypass account authentication.

These field rules are client validation. Supabase remains responsible for authentication and its configured server password policy, email confirmation and rate limits. Changing these screens does not change the hosted project's Auth settings. Apply any required server policy in that project before release.

## Verification

Run `npm run lint`, `npx tsc --noEmit`, and `node --test scripts/test-auth-validation.mjs scripts/test-auth-errors.mjs` (use the project's `.tools/node.exe` if system Node is too old).

With a test account on the configured Supabase project, verify confirmed signup, login, cold-start session restoration, logout, and guest-to-account navigation on Android and iOS. Also verify confirmation-required signup, rejected credentials and connection failures. Automated validation tests do not create accounts or send confirmation emails.
