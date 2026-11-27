import React, { createContext, useContext, useState } from "react";
import { useSession } from './SessionProvider';
import { supabase } from '../lib/supabase';
const Context = createContext(null);
export function RoleProvider({ children }) {
  const { user } = useSession();
  const [selection, setSelection] = useState(null);
  const savedRole = user?.user_metadata?.unigo_role;
  const role = !user
    ? (selection?.role || null)
    : selection?.userId === user.id
    ? selection.role
    : savedRole === 'driver'
    ? 'driver'
    : savedRole === 'merchant'
    ? 'merchant'
    : 'user';
  const loading = false;
  const chooseRole = async (value) => {
    if (!['user', 'driver', 'merchant'].includes(value)) throw new Error('Invalid role');
    try {
      if (user) {
        await supabase.auth.updateUser({ data: { unigo_role: value } });
      }
    } catch (e) {
      console.warn('Could not update role in Supabase:', e);
    }
    setSelection({ userId: user?.id || 'local', role: value });
  };
  return (
    <Context.Provider value={{ role, loading, chooseRole }}>
      {children}
    </Context.Provider>
  );
}
export const useRole = () => useContext(Context);
