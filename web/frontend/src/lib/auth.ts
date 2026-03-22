/**
 * Authentication utilities
 */

// In the browser, use relative URLs so requests go through Next.js proxy (no CORS).
// During SSR, call the backend directly.
const API_URL = typeof window !== "undefined"
  ? ""
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

export type TradingLevel = "beginner" | "intermediate" | "expert";

export interface User {
  id: number;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  user_type: "email";
  trading_level?: TradingLevel | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterResponse {
  requires_verification?: boolean;
  message?: string;
  email?: string;
  // also extends AuthResponse fields when auto-verified (dev mode)
  access_token?: string;
  token_type?: string;
  user?: User;
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
): Promise<RegisterResponse> {
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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Registration failed");
  }

  const data: RegisterResponse = await response.json();
  // Auto-verified (dev mode without SMTP): store token immediately
  if (data.access_token && data.user) {
    setToken(data.access_token);
    setUser(data.user);
  }
  return data;
}

export async function resendVerification(email: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const text = await response.text();
    let detail = "Erreur lors du renvoi";
    try {
      const error = JSON.parse(text);
      detail = error.detail || detail;
    } catch {}
    throw new Error(detail);
  }
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Login failed");
  }

  const data: AuthResponse = await response.json();
  setToken(data.access_token);
  setUser(data.user);
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

export async function refreshToken(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
      }
      return false;
    }

    const data = await response.json();
    setToken(data.access_token);
    return true;
  } catch {
    // Network error — don't remove token
    return false;
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
