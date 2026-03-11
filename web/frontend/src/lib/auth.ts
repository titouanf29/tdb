/**
 * Authentication utilities
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface User {
  id: number;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  user_type: "email" | "telegram";
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Token storage
export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tdb_token");
};

export const setToken = (token: string): void => {
  localStorage.setItem("tdb_token", token);
};

export const removeToken = (): void => {
  localStorage.removeItem("tdb_token");
  localStorage.removeItem("tdb_user");
};

export const getUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("tdb_user");
  return user ? JSON.parse(user) : null;
};

export const setUser = (user: User): void => {
  localStorage.setItem("tdb_user", JSON.stringify(user));
};

// API calls
export async function register(
  email: string,
  password: string,
  username: string,
  firstName?: string
): Promise<AuthResponse> {
  console.log("[auth.ts] register() called");

  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      username,
      first_name: firstName || username,
    }),
  });

  console.log("[auth.ts] Register response status:", response.status);

  if (!response.ok) {
    const error = await response.json();
    console.log("[auth.ts] Register error:", error);
    throw new Error(error.detail || "Registration failed");
  }

  const data: AuthResponse = await response.json();
  console.log("[auth.ts] Register response data:", data);
  console.log("[auth.ts] access_token exists:", !!data.access_token);

  setToken(data.access_token);
  console.log("[auth.ts] Token saved. Checking localStorage:", localStorage.getItem("tdb_token"));

  setUser(data.user);
  console.log("[auth.ts] User saved. Checking localStorage:", localStorage.getItem("tdb_user"));

  return data;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  console.log("[auth.ts] login() called with email:", email);

  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  console.log("[auth.ts] Response status:", response.status);

  if (!response.ok) {
    const error = await response.json();
    console.log("[auth.ts] Login error:", error);
    throw new Error(error.detail || "Login failed");
  }

  const data: AuthResponse = await response.json();
  console.log("[auth.ts] Login response data:", data);
  console.log("[auth.ts] access_token exists:", !!data.access_token);

  setToken(data.access_token);
  console.log("[auth.ts] Token saved. Checking localStorage:", localStorage.getItem("tdb_token"));

  setUser(data.user);
  console.log("[auth.ts] User saved. Checking localStorage:", localStorage.getItem("tdb_user"));

  return data;
}

export async function logout(): Promise<void> {
  const token = getToken();
  if (token) {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore errors on logout
    }
  }
  removeToken();
}

export async function getMe(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // Only remove token on explicit 401, not other errors
      if (response.status === 401) {
        removeToken();
      }
      return null;
    }

    const user = await response.json();
    setUser(user);
    return user;
  } catch {
    // Don't remove token on network errors
    return null;
  }
}

// Auth header helper
export function authHeaders(): HeadersInit {
  const token = getToken();
  return token
    ? {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    : { "Content-Type": "application/json" };
}
