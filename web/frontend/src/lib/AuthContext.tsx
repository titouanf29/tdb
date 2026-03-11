"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  getUser,
  getMe,
  login as authLogin,
  register as authRegister,
  logout as authLogout,
  getToken,
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
  ) => Promise<void>;
  logout: () => Promise<void>;
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
  ) => {
    const response = await authRegister(email, password, username, firstName);
    setUser(response.user);
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
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
