"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import {
  User,
  TradingLevel,
  RegisterResponse,
  getUser,
  getMe,
  login as authLogin,
  register as authRegister,
  logout as authLogout,
  getToken,
  setUser as saveUser,
  refreshToken,
} from "./auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (
    email: string,
    password: string,
    username: string,
    firstName?: string
  ) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  setTradingLevel: (level: TradingLevel) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const initAuth = async () => {
      const token = getToken();
      if (token) {
        const savedUser = getUser();
        if (savedUser) {
          setUser(savedUser);
        }
        // Verify token is still valid
        const currentUser = await getMe();
        if (currentUser) {
          setUser(currentUser);
        } else if (!getToken()) {
          // Token was explicitly removed (401 invalid/expired) → log out
          setUser(null);
        }
        // else: network/server error, token still present → keep savedUser
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Refresh token every 50 min while the tab is open (token expires in 1h)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      const success = await refreshToken();
      if (!success && !getToken()) {
        // Token expired and explicitly removed → log out
        setUser(null);
      }
    }, 50 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const response = await authLogin(email, password, rememberMe);
    setUser(response.user);
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    username: string,
    firstName?: string
  ): Promise<RegisterResponse> => {
    const response = await authRegister(email, password, username, firstName);
    if (response.user) setUser(response.user);
    return response;
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setUser(null);
  }, []);

  const setTradingLevel = useCallback(async (level: TradingLevel) => {
    const token = getToken();
    if (!token) return;
    await fetch("/api/users/settings", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ trading_level: level }),
    });
    const updated = { ...user!, trading_level: level };
    setUser(updated);
    saveUser(updated);
  }, [user]);

  const contextValue = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    setTradingLevel,
  }), [user, isLoading, login, register, logout, setTradingLevel]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
