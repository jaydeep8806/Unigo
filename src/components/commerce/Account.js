import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import AuthForm from '../auth/AuthForm';
import { Sheet } from './UI';

export default function Account({ onClose, onSignedIn, accountName = 'Food & Shop' }) {
  const [signup, setSignup] = useState(false);
  return (
    <Sheet title={signup ? `Create ${accountName} account` : `${accountName} sign in`} onClose={onClose}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, width: '100%', maxWidth: 500, alignSelf: 'center' }}>
        <AuthForm key={signup ? 'signup' : 'login'} signup={signup} onSwitch={() => setSignup(!signup)} onSignedIn={onSignedIn} />
      </ScrollView>
    </Sheet>
  );
}
