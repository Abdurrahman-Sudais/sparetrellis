/**
 * MOCK authentication. Stand-in for Amazon Cognito (see services/aws/integration.ts).
 * Any well-formed credentials are accepted for the demonstration; nothing is sent
 * to a server.
 */
import { createContext, useContext, useState, type ReactNode } from "react";

export interface AuthUser {
  name: string;
  email: string;
  role: string;
  organization: string;
}

interface AuthValue {
  user: AuthUser | null;
  signIn: (email: string, name?: string) => Promise<void>;
  register: (u: AuthUser) => Promise<void>;
  signOut: () => void;
}

const KEY = "sparetrellis.auth";
const AuthContext = createContext<AuthValue | null>(null);

export const DEMO_USER: AuthUser = {
  name: "Adaeze Okafor",
  email: "demo@sparetrellis.top",
  role: "Inventory Specialist",
  organization: "Meridian Process Industries",
};

function read(): AuthUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(read);

  const persist = (u: AuthUser | null) => {
    setUser(u);
    try {
      if (u) localStorage.setItem(KEY, JSON.stringify(u));
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  };

  const value: AuthValue = {
    user,
    signIn: async (email, name) => {
      await new Promise((r) => setTimeout(r, 600));
      persist(email === DEMO_USER.email ? DEMO_USER : { ...DEMO_USER, email, name: name ?? DEMO_USER.name });
    },
    register: async (u) => {
      await new Promise((r) => setTimeout(r, 800));
      persist(u);
    },
    signOut: () => persist(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
