import { useState, createContext, useContext, ReactNode } from "react";

export type UserRole = "donor" | "organization";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationName?: string;
  organizationDescription?: string;
}

const STORAGE_KEY = "giveclear_user_session";

// Pre-seeded accounts for demo
export const DEMO_ACCOUNTS: UserSession[] = [
  {
    id: "org-redcross",
    name: "Maria Santos",
    email: "maria@redcross.ph",
    role: "organization",
    organizationName: "Philippine Red Cross",
    organizationDescription: "Humanitarian aid, emergency relief, disaster response, and health services in the Philippines.",
  },
  {
    id: "org-angatbuhay",
    name: "Juan Dela Cruz",
    email: "juan@angatbuhay.ph",
    role: "organization",
    organizationName: "Angat Buhay",
    organizationDescription: "Community-driven initiatives for disaster response, food security, and education.",
  },
  {
    id: "org-communitycare",
    name: "Maya Santos",
    email: "maya.santos@example.com",
    role: "organization",
    organizationName: "Community Care Network",
    organizationDescription: "We help local families access nutritious meals, essential supplies, and support when they need it most.",
  },
  {
    id: "donor-maya",
    name: "Maya Santos",
    email: "maya.donor@example.com",
    role: "donor",
  },
];

interface AuthContextType {
  user: UserSession | null;
  login: (session: UserSession) => void;
  logout: () => void;
  registerDonor: (name: string, email: string) => UserSession;
  registerOrganization: (name: string, email: string, orgName: string, orgDesc: string) => UserSession;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = (session: UserSession) => {
    setUser(session);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {}
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const registerDonor = (name: string, email: string): UserSession => {
    const session: UserSession = {
      id: "donor-" + Date.now(),
      name: name.trim(),
      email: email.trim(),
      role: "donor",
    };
    login(session);
    return session;
  };

  const registerOrganization = (
    name: string,
    email: string,
    orgName: string,
    orgDesc: string
  ): UserSession => {
    const session: UserSession = {
      id: "org-" + Date.now(),
      name: name.trim(),
      email: email.trim(),
      role: "organization",
      organizationName: orgName.trim(),
      organizationDescription: orgDesc.trim(),
    };
    login(session);
    return session;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, registerDonor, registerOrganization }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

