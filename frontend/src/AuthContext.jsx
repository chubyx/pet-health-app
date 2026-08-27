import { createContext, useContext, useState, useCallback } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [owner, setOwner] = useState(() => {
    const saved = localStorage.getItem("owner");
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback(async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("owner", JSON.stringify(data.owner));
    setOwner(data.owner);
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await api.register({ name, email, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("owner", JSON.stringify(data.owner));
    setOwner(data.owner);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("owner");
    setOwner(null);
  }, []);

  return (
    <AuthContext.Provider value={{ owner, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
