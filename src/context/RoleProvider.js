import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
const Context = createContext(null);
export function RoleProvider({ children }) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    AsyncStorage.getItem("@unigo_role")
      .then((value) =>
        setRole(["user", "driver"].includes(value) ? value : null),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  const chooseRole = async (value) => {
    await AsyncStorage.setItem("@unigo_role", value);
    setRole(value);
  };
  return (
    <Context.Provider value={{ role, loading, chooseRole }}>
      {children}
    </Context.Provider>
  );
}
export const useRole = () => useContext(Context);
