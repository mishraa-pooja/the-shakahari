"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export type UserProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  landmark: string | null;
  pincode: string | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const refreshProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, address, landmark, pincode")
      .eq("id", u.id)
      .maybeSingle();
    if (error) {
      console.error("profile fetch:", error);
      setProfile(null);
      return;
    }
    setProfile(data as UserProfile | null);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (user) void refreshProfile();
    else setProfile(null);
  }, [user, refreshProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return { error: error ? new Error(error.message) : null };
    },
    [supabase]
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName } },
      });
      return { error: error ? new Error(error.message) : null };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, [supabase]);

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      refreshProfile,
      signIn,
      signUp,
      signOut,
    }),
    [user, session, profile, loading, refreshProfile, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
