import React, { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { accountErrorMessage } from '../../services/authErrors';
import { AUTH_LIMITS, validateAuthFields } from '../../services/authValidation';
import { useSession } from '../../context/SessionProvider';

export default function AuthForm({ signup = false, compact = false, dense = false, onSwitch, onSignedIn }) {
  const { beginConfirmation, endConfirmation } = useSession();
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [signupRole, setSignupRole] = useState('user');
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [visible, setVisible] = useState({});
  const [focused, setFocused] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [otp, setOtp] = useState('');
  const [otpFocused, setOtpFocused] = useState(false);
  const otpInput = useRef(null);
  const [resendMessage, setResendMessage] = useState('');
  const [canResend, setCanResend] = useState(false);
  const submitting = useRef(false);
  const inputs = useRef({});
  const errors = validateAuthFields(values, signup);
  const fields = [
    ...(signup ? [{ key: 'name', label: 'Full name', placeholder: 'Your name', icon: 'person-outline', autoComplete: 'name', autoCapitalize: 'words', maxLength: AUTH_LIMITS.name }] : []),
    { key: 'email', label: 'Email address', placeholder: 'you@example.com', icon: 'mail-outline', autoComplete: 'email', keyboardType: 'email-address', maxLength: AUTH_LIMITS.email },
    { key: 'password', label: 'Password', placeholder: signup ? 'Create a password' : 'Enter your password', icon: 'lock-closed-outline', autoComplete: signup ? 'new-password' : 'current-password', secret: true, ...(signup ? { maxLength: AUTH_LIMITS.passwordMax } : {}) },
    ...(signup ? [{ key: 'confirmPassword', label: 'Confirm password', placeholder: 'Re-enter your password', icon: 'lock-closed-outline', autoComplete: 'new-password', secret: true, maxLength: AUTH_LIMITS.passwordMax }] : []),
  ];

  async function signInWithGoogle() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setMessage('');
    try {
      const redirectTo = Platform.OS === 'web' ? `${window.location.origin}/login` : 'unigo://auth/callback';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
      });
      if (error) throw error;
      if (Platform.OS !== 'web') {
        if (!data.url) throw new Error('Could not start Google sign-in.');
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success') {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          const authError = params.get('error_description') || url.searchParams.get('error_description');
          if (authError) throw new Error(authError);
          if (!access_token || !refresh_token) throw new Error('Google sign-in could not be completed. Please try again.');
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
          if (sessionError) throw sessionError;
          if (sessionData.session) onSignedIn?.(sessionData.session.user);
        }
      }
    } catch (error) {
      setMessage(accountErrorMessage(error));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function submit() {
    if (submitting.current) return;
    setSubmitted(true);
    setMessage('');
    setCanResend(false);
    const firstError = fields.find(field => errors[field.key]);
    if (firstError) { inputs.current[firstError.key]?.focus(); return; }
    submitting.current = true;
    setBusy(true);
    if (signup) beginConfirmation();
    try {
      const credentials = { email: values.email.trim(), password: values.password };
      const { data, error } = signup
        ? await supabase.auth.signUp({ ...credentials, options: { data: { full_name: values.name.trim(), unigo_role: signupRole } } })
        : await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      if (data.session && signup) {
        const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
        if (signOutError) throw signOutError;
        onSwitch?.();
      } else if (data.session) onSignedIn?.(data.session.user);
      else if (signup) {
        setConfirmation(credentials.email);
        setValues(previous => ({ ...previous, password: '', confirmPassword: '' }));
      } else setMessage('Sign-in could not be confirmed. Please try again.');
    } catch (error) {
      setMessage(accountErrorMessage(error));
      if (!signup && error?.code === 'email_not_confirmed') setCanResend(true);
    } finally {
      if (signup) await endConfirmation();
      submitting.current = false;
      setBusy(false);
    }
  }

  async function resendConfirmation(email) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setResendMessage('');
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setResendMessage('If this account needs confirmation, a new code will be sent. Check your inbox and spam folder.');
    } catch (error) {
      setResendMessage(accountErrorMessage(error));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (submitting.current) return;
    if (otp.length !== 6) { setMessage('Enter the 6-digit code from your email.'); return; }
    submitting.current = true;
    setBusy(true);
    setMessage('');
    beginConfirmation();
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email: confirmation, token: otp.trim(), type: 'signup' });
      if (error) throw error;
      if (!data.user) throw new Error('Verification could not be completed. Please try again.');
      if (data.session) {
        const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
        if (signOutError) throw signOutError;
      }
      setConfirmation('');
      setOtp('');
      if (signup) onSwitch?.();
      else setMessage('Email verified. Please log in with your password.');
    } catch (error) {
      setMessage(accountErrorMessage(error));
    } finally {
      await endConfirmation();
      submitting.current = false;
      setBusy(false);
    }
  }

  if (confirmation) return (
    <View style={styles.confirmation}>
      <View style={styles.mailMark}><Ionicons name="mail-open-outline" size={30} color="#0F7A56" /></View>
      <Text accessibilityRole="header" style={styles.confirmTitle}>Enter OTP code</Text>
      <Text accessibilityLiveRegion="polite" style={styles.confirmCopy}>Enter the verification code sent to {confirmation}. Check your spam folder too.</Text>
      <View style={styles.otpContainer}>
        <Pressable accessible={false} onPress={() => otpInput.current?.focus()} style={styles.otpRow}>
          {Array.from({ length: 6 }, (_, index) => <View key={index} style={[styles.otpCircle, otpFocused && index === Math.min(otp.length, 5) && styles.otpCircleActive]}><Text style={styles.otpDigit}>{otp[index] || ''}</Text></View>)}
        </Pressable>
        <TextInput ref={otpInput} accessibilityLabel="6-digit email verification code" style={styles.otpInput} value={otp} onChangeText={value => { setOtp(value.replace(/\D/g, '').slice(0, 6)); setMessage(''); }} onFocus={() => setOtpFocused(true)} onBlur={() => setOtpFocused(false)} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} editable={!busy} onSubmitEditing={verifyCode} />
      </View>
      {!!message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} style={styles.button} onPress={verifyCode}><Text style={styles.buttonText}>{busy ? 'Please wait…' : 'Verify and continue'}</Text></Pressable>
      {!!resendMessage && <Text accessibilityLiveRegion="polite" style={styles.confirmCopy}>{resendMessage}</Text>}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} style={styles.googleButton} onPress={() => resendConfirmation(confirmation)}><Text style={styles.googleText}>{busy ? 'Please wait…' : 'Resend code'}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} style={styles.switchButton} onPress={() => { setConfirmation(''); setOtp(''); setMessage(''); setResendMessage(''); if (signup) onSwitch?.(); }}><Text style={styles.switchText}>Back to login</Text></Pressable>
    </View>
  );

  return (
    <View style={[styles.form, compact && styles.compactForm, dense && styles.denseForm]}>
      {signup && <View style={styles.field}>
        <Text style={styles.label}>I want to join as</Text>
        <View style={styles.roleRow}>
          {[{ value: 'user', label: 'User', icon: 'person-outline' }, { value: 'driver', label: 'Driver', icon: 'car-outline' }].map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: signupRole === option.value, disabled: busy }} disabled={busy} onPress={() => setSignupRole(option.value)} style={[styles.roleOption, signupRole === option.value && styles.roleSelected]}><Ionicons name={option.icon} size={20} color={signupRole === option.value ? '#0F7A56' : '#729084'} /><Text style={[styles.roleText, signupRole === option.value && styles.roleTextSelected]}>{option.label}</Text></Pressable>)}
        </View>
      </View>}
      {fields.map((field, index) => {
        const error = (submitted || touched[field.key]) && errors[field.key];
        return <View key={field.key} style={[styles.field, compact && styles.compactField]}>
          <Text style={styles.label} nativeID={`${field.key}-label`}>{field.label}</Text>
          <View style={[styles.inputBox, compact && styles.compactInputBox, focused === field.key && styles.focused, error && styles.invalid]}>
            <Ionicons name={field.icon} size={20} color={error ? '#B43C3C' : '#729084'} />
            <TextInput
              ref={input => { inputs.current[field.key] = input; }}
              accessibilityLabel={field.label}
              accessibilityHint={error || undefined}
              style={[styles.input, compact && styles.compactInput]}
              placeholder={field.placeholder}
              placeholderTextColor="#879C91"
              value={values[field.key]}
              onChangeText={value => { setValues(previous => ({ ...previous, [field.key]: value })); setMessage(''); setCanResend(false); setResendMessage(''); }}
              onFocus={() => setFocused(field.key)}
              onBlur={() => { setFocused(''); setTouched(previous => ({ ...previous, [field.key]: true })); }}
              autoCapitalize={field.autoCapitalize || 'none'}
              autoCorrect={false}
              autoComplete={field.autoComplete}
              keyboardType={field.keyboardType || 'default'}
              secureTextEntry={field.secret && !visible[field.key]}
              maxLength={field.maxLength}
              editable={!busy}
              returnKeyType={index === fields.length - 1 ? 'go' : 'next'}
              submitBehavior={index === fields.length - 1 ? 'blurAndSubmit' : 'submit'}
              onSubmitEditing={() => index === fields.length - 1 ? submit() : inputs.current[fields[index + 1].key]?.focus()}
            />
            {field.secret && <Pressable accessibilityRole="button" accessibilityLabel={`${visible[field.key] ? 'Hide' : 'Show'} ${field.label.toLowerCase()}`} onPress={() => setVisible(previous => ({ ...previous, [field.key]: !previous[field.key] }))} style={styles.eye}>
              <Ionicons name={visible[field.key] ? 'eye-off-outline' : 'eye-outline'} size={21} color="#647D70" />
            </Pressable>}
          </View>
          {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
        </View>;
      })}
      {!!message && <View style={styles.errorBanner}><Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{message}</Text></View>}
      {canResend && <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setConfirmation(values.email.trim()); setMessage(''); }} style={styles.googleButton}><Text style={styles.googleText}>Enter verification code</Text></Pressable>}
      {!!resendMessage && <Text accessibilityLiveRegion="polite" style={styles.confirmCopy}>{resendMessage}</Text>}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} onPress={submit} disabled={busy} style={({ pressed }) => [styles.button, compact && styles.compactButton, (pressed || busy) && styles.dimmed]}>
        {busy ? <><ActivityIndicator color="#fff" /><Text style={styles.buttonText}>Please wait…</Text></> : <><Text style={styles.buttonText}>{signup ? 'Create account' : 'Log in'}</Text><Ionicons name="arrow-forward" size={19} color="#fff" /></>}
      </Pressable>
      <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>or continue with</Text><View style={styles.dividerLine} /></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Continue with Google" disabled={busy} onPress={signInWithGoogle} style={({ pressed }) => [styles.googleButton, (pressed || busy) && styles.dimmed]}>
        <Text style={styles.googleMark}>G</Text><Text style={styles.googleText}>Continue with Google</Text>
      </Pressable>
      {signup && <Text style={styles.confirmCopy}>Google accounts start as User. You can switch to Driver from your profile.</Text>}
      <View style={styles.switchRow}><Text style={styles.switchCopy}>{signup ? 'Already have an account?' : 'New to UniGo?'}</Text><Pressable accessibilityRole="button" onPress={onSwitch} disabled={busy} style={styles.switchButton}><Text style={styles.switchText}>{signup ? 'Log in' : 'Sign up'}</Text></Pressable></View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 }, field: { gap: 8 }, label: { color: '#254635', fontSize: 13, fontWeight: '700' },
  roleRow: { flexDirection: 'row', gap: 10 }, roleOption: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#BCCFC2', backgroundColor: '#fff', borderRadius: 14 }, roleSelected: { borderColor: '#0F7A56', backgroundColor: '#E4F3E9', borderWidth: 2 }, roleText: { color: '#647D70', fontWeight: '700' }, roleTextSelected: { color: '#0F7A56' },
  inputBox: { flexDirection: 'row', alignItems: 'center', paddingLeft: 15, borderWidth: 1, borderColor: '#DAE6DE', borderRadius: 15, backgroundColor: '#fff', minHeight: 56 },
  focused: { borderColor: '#0F7A56', backgroundColor: '#FAFDFB' }, invalid: { borderColor: '#C55454' },
  input: { flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 16, color: '#17382A', fontSize: 15 }, eye: { minHeight: 48, width: 48, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#B43C3C', fontSize: 12, lineHeight: 18 }, errorBanner: { padding: 12, borderRadius: 12, backgroundColor: '#FFF0EE' },
  rules: { gap: 6, marginTop: 2 }, rule: { flexDirection: 'row', gap: 7, alignItems: 'center' }, ruleText: { color: '#6B8074', fontSize: 12 }, met: { color: '#0F7A56' },
  button: { minHeight: 56, borderRadius: 16, backgroundColor: '#0F7A56', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, padding: 16, marginTop: 6 }, buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' }, dimmed: { opacity: 0.65 },
  switchRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 4 }, switchCopy: { color: '#6B8074', fontSize: 13 }, switchButton: { paddingHorizontal: 6, minHeight: 44, justifyContent: 'center' }, switchText: { color: '#0F7A56', fontSize: 13, fontWeight: '800' },
  confirmation: { gap: 16 }, mailMark: { alignSelf: 'flex-start', padding: 16, borderRadius: 20, backgroundColor: '#E4F3E9' }, confirmTitle: { color: '#17382A', fontSize: 24, fontWeight: '800' }, confirmCopy: { color: '#647D70', fontSize: 15, lineHeight: 24 },
  otpContainer: { position: 'relative' }, otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 }, otpCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#739789', alignItems: 'center', justifyContent: 'center' }, otpCircleActive: { borderWidth: 2, borderColor: '#08704D', backgroundColor: '#E4F3E9' }, otpDigit: { color: '#17382A', fontSize: 18, fontWeight: '700' }, otpInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  compactForm: { gap: 9 }, compactField: { gap: 4 }, compactInputBox: { minHeight: 48, borderColor: 'transparent', borderRadius: 14 }, compactInput: { paddingVertical: 10 }, compactRules: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 3 }, compactButton: { minHeight: 48, padding: 12, marginTop: 2, borderRadius: 28 },
  denseForm: { gap: 5 },
  divider: { flexDirection: 'row', gap: 10, alignItems: 'center' }, dividerLine: { height: 1, backgroundColor: '#D7E3DA', flex: 1 }, dividerText: { color: '#86998D', fontSize: 12 }, googleButton: { minHeight: 48, borderRadius: 28, borderWidth: 1, borderColor: '#CCDCD1', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, googleMark: { color: '#4285F4', fontWeight: '800', fontSize: 20 }, googleText: { color: '#244A36', fontWeight: '700', fontSize: 14 },
});
