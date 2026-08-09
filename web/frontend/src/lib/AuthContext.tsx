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
import { settingsAPI } from "./api";

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
  /** Re-reads GET /api/auth/me into state — after a profile edit, so every
   *  consumer (header, dashboard greeting) reflects it without a reload. */
  refreshUser: () => Promise<void>;
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

        // Reconcile with the server, but only BLOCK the first render when
        // there is no cached user to show. A slow backend used to hold every
        // signed-in visitor on a spinner for as long as this round-trip took.
        // Access is not granted by this call — every endpoint authorises the
        // token itself, and a 401 here still clears the session below.
        const verify = getMe().then((currentUser) => {
          if (currentUser) {
            setUser(currentUser);
          } else if (!getToken()) {
            // Token was explicitly removed (401 invalid/expired) → log out
            setUser(null);
          }
          // else: network/server error, token still present → keep savedUser
        });

        if (!savedUser) await verify;
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

  /**
   * Persists the trading level server-side FIRST. Throws (APIError) on any
   * non-2xx so callers can render a real error instead of a fake "✓ Saved".
   * Local state / localStorage are only touched once the write succeeded.
   */
  const setTradingLevel = useCallback(async (level: TradingLevel) => {
    if (!user) throw new Error("Not authenticated");
    await settingsAPI.update({ trading_level: level });
    const updated = { ...user, trading_level: level };
    setUser(updated);
    saveUser(updated);
  }, [user]);

  const refreshUser = useCallback(async () => {
    const fresh = await getMe();   // getMe() already writes localStorage.tdb_user
    if (fresh) setUser(fresh);
  }, []);

  const contextValue = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    setTradingLevel,
    refreshUser,
  }), [user, isLoading, login, register, logout, setTradingLevel, refreshUser]);

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
