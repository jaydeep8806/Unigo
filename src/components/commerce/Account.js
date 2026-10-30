import React, { useState } from "react";
import { Text, ScrollView } from "react-native";
import { supabase } from "../../services/supabase";
import { Sheet, Field, Button, s } from "./UI";

export default function Account({ onClose, onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      const credentials = { email: email.trim(), password };
      const { data, error } = signup
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      if (data.session) onSignedIn(data.session.user);
      else
        setMessage("Check your email to confirm your account, then sign in.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      title={signup ? "Create Food & Shop account" : "Food & Shop sign in"}
      onClose={onClose}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, gap: 12 }}
      >
        <Text style={s.muted}>
          Sign in to place orders or manage your assigned shop. Browsing does
          not require an account.
        </Text>
        <Field
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          label="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {message ? <Text style={s.error}>{message}</Text> : null}
        <Button
          title={busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
          disabled={busy || !email.trim() || password.length < 6}
          onPress={submit}
        />
        <Button
          secondary
          title={signup ? "Already registered? Sign in" : "Create an account"}
          onPress={() => setSignup(!signup)}
        />
      </ScrollView>
    </Sheet>
  );
}
