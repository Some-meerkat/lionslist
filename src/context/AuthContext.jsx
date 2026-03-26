import { createContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = no profile

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchProfile(session.user.id);
    } else if (session === null) {
      setProfile(null);
    }
  }, [session]);

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error && error.code !== "PGRST116") {
      // Network or other error — keep profile as undefined (loading) rather than null
      // PGRST116 = "no rows returned" which means genuinely no profile
      return;
    }
    setProfile(data);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  const loading = session === undefined || (session && profile === undefined);

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, signOut, refreshProfile: () => fetchProfile(session?.user?.id) }}
    >
      {children}
    </AuthContext.Provider>
  );
}
