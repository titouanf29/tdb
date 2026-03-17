"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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
} from "./auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
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
        } else {
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authLogin(email, password);
    setUser(response.user);
  };

  const register = async (
    email: string,
    password: string,
    username: string,
    firstName?: string
  ): Promise<RegisterResponse> => {
    const response = await authRegister(email, password, username, firstName);
    if (response.user) setUser(response.user);
    return response;
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
  };

  const setTradingLevel = async (level: TradingLevel) => {
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
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        setTradingLevel,
      }}
    >
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
