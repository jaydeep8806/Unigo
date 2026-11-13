import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const KEY = '@unigo_guest_session';
const SessionContext = createContext(null);

// Guest access is local; account identity comes only from Supabase Auth.
export function SessionProvider({ children }) {
  const [isSessionLoading, setLoading] = useState(true);
  const [guest, setGuest] = useState(false);
  const [user, setUser] = useState(null);
  const suppressSession = useRef(false);
  useEffect(() => {
    let mounted = true;
    let authVersion = 0;
    const applySession = session => {
      if (mounted) setUser(!suppressSession.current && session?.user && !session.user.is_anonymous ? session.user : null);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authVersion += 1;
      applySession(session);
    });
    const initialVersion = authVersion;
    Promise.allSettled([
      AsyncStorage.getItem(KEY).then(value => { if (mounted) setGuest(value === 'true'); }),
      supabase.auth.getSession().then(({ data }) => { if (authVersion === initialVersion) applySession(data.session); }),
    ]).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);
  const continueAsGuest = useCallback(async () => { await AsyncStorage.setItem(KEY, 'true'); setGuest(true); }, []);
  const beginConfirmation = useCallback(() => { suppressSession.current = true; }, []);
  const endConfirmation = useCallback(async () => {
    suppressSession.current = false;
    const { data } = await supabase.auth.getSession();
    setUser(data.session?.user && !data.session.user.is_anonymous ? data.session.user : null);
  }, []);
  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(KEY);
    setGuest(false);
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    setUser(null);
  }, []);
  return <SessionContext.Provider value={{ isSessionLoading, hasSession: !!user || guest, user, isGuest: guest && !user, continueAsGuest, logout, beginConfirmation, endConfirmation }}>{children}</SessionContext.Provider>;
}

export function useSession() { return useContext(SessionContext); }
