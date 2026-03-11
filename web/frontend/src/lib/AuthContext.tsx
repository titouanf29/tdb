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
      console.log("[AuthContext] initAuth() starting");
      const token = getToken();
      console.log("[AuthContext] Token from localStorage:", token ? "exists" : "null");

      if (token) {
        const savedUser = getUser();
        console.log("[AuthContext] Saved user:", savedUser);
        if (savedUser) {
          setUser(savedUser);
        }
        // Verify token is still valid
        console.log("[AuthContext] Verifying token with getMe()...");
        const currentUser = await getMe();
        console.log("[AuthContext] getMe() returned:", currentUser);
        if (currentUser) {
          setUser(currentUser);
        } else {
          setUser(null);
        }
      }
      setIsLoading(false);
      console.log("[AuthContext] initAuth() complete");
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    console.log("[AuthContext] login() called");
    try {
      const response = await authLogin(email, password);
      console.log("[AuthContext] authLogin returned:", response);
      setUser(response.user);
      console.log("[AuthContext] User state updated");
    } catch (error) {
      console.error("[AuthContext] login error:", error);
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    username: string,
    firstName?: string
  ) => {
    console.log("[AuthContext] register() called");
    try {
      const response = await authRegister(email, password, username, firstName);
      console.log("[AuthContext] authRegister returned:", response);
      setUser(response.user);
      console.log("[AuthContext] User state updated");
    } catch (error) {
      console.error("[AuthContext] register error:", error);
      throw error;
    }
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
