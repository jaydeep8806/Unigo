import React, { createContext, useContext, useState } from "react";
const Context = createContext(null);
export function RoleProvider({ children }) {
  const [role, setRole] = useState(null);
  const loading = false;
  const chooseRole = async (value) => {
    setRole(value);
  };
  return (
    <Context.Provider value={{ role, loading, chooseRole }}>
      {children}
    </Context.Provider>
  );
}
export const useRole = () => useContext(Context);
