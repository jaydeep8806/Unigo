import React, { createContext, useContext, useState } from "react";
import { useSession } from './SessionProvider';
import { supabase } from '../lib/supabase';
const Context = createContext(null);
export function RoleProvider({ children }) {
  const { user } = useSession();
  const [selection, setSelection] = useState(null);
  const savedRole = user?.user_metadata?.unigo_role;
  const role = !user ? null : selection?.userId === user.id ? selection.role : savedRole === 'driver' ? 'driver' : 'user';
  const loading = false;
  const chooseRole = async (value) => {
    if (!user || !['user', 'driver'].includes(value)) throw new Error('Invalid role');
    const { error } = await supabase.auth.updateUser({ data: { unigo_role: value } });
    if (error) throw error;
    setSelection({ userId: user?.id, role: value });
  };
  return (
    <Context.Provider value={{ role, loading, chooseRole }}>
      {children}
    </Context.Provider>
  );
}
export const useRole = () => useContext(Context);
