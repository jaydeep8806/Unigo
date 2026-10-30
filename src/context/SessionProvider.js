import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@unigo_guest_session';
const SessionContext = createContext(null);

// This is an explicitly local guest session, not an authenticated account.
export function SessionProvider({ children }) {
  const [isSessionLoading, setLoading] = useState(true);
  const [hasSession, setSession] = useState(false);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KEY).then((value) => { if (mounted) setSession(value === 'true'); }).catch(() => {}).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);
  const continueAsGuest = useCallback(async () => { await AsyncStorage.setItem(KEY, 'true'); setSession(true); }, []);
  const logout = useCallback(async () => { await AsyncStorage.removeItem(KEY); setSession(false); }, []);
  return <SessionContext.Provider value={{ isSessionLoading, hasSession, continueAsGuest, logout }}>{children}</SessionContext.Provider>;
}

export function useSession() { return useContext(SessionContext); }
