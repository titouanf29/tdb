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
  created_at?: string;
  email_verified?: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterResponse {
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

/**
 * Clears the session AND every per-user local key, so the next user on a shared
 * browser does not inherit the previous user's preferences / history.
 * `tdb_lang` is deliberately KEPT — the login page should stay in the user's language.
 */
export const removeToken = (): void => {
  [
    "tdb_token",
    "tdb_user",
    "tdb_settings",
    "tdb_onboarding_done",
    "tdb_alerts_seen",
    "tdb_dashboard_config_v2",
    "tdb_recent_analyses",
    "gold_style",
    "gold_aggression",
    "tdb_last_login_date",
  ].forEach((k) => {
    try { localStorage.removeItem(k); } catch { /* private mode / quota */ }
  });
  try { sessionStorage.removeItem("tdb_welcome_shown"); } catch { /* ignore */ }
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
    let detail = "Registration failed";
    try {
      const error = await response.json();
      detail = error.detail || detail;
    } catch {
      // Non-JSON response (e.g. 502 proxy error)
    }
    throw new Error(detail);
  }

  const data: RegisterResponse = await response.json();
  setToken(data.access_token);
  setUser(data.user);
  return data;
}

export async function login(
  email: string,
  password: string,
  rememberMe: boolean = false
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, remember_me: rememberMe }),
  });

  if (!response.ok) {
    let detail = "Login failed";
    try {
      const error = await response.json();
      detail = error.detail || detail;
    } catch {
      // Non-JSON response (e.g. 502 proxy error)
    }
    throw new Error(detail);
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
