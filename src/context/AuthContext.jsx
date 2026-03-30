import { createContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = no profile
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setSession(session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) setSession(newSession ?? null);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const currentUserId = session?.user?.id;

  useEffect(() => {
    if (currentUserId) {
      // Only fetch if profile isn't already loaded for this user
      if (!profile || profile.id !== currentUserId) {
        fetchProfile(currentUserId);
      }
    } else if (session === null) {
      setProfile(null);
      setPendingCount(0);
    }
  }, [currentUserId]);

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error && error.code !== "PGRST116") {
        console.error("Profile fetch error:", error);
      }
      setProfile(data || null);
    } catch (err) {
      console.error("Profile fetch exception:", err);
      setProfile(null);
    }
  }

  async function fetchPendingCount(userId) {
    try {
      // Count pending buy requests on my listings (needs my response)
      const { data: myListings } = await supabase
        .from("listings")
        .select("id")
        .eq("seller_id", userId);
      let sellCount = 0;
      if (myListings?.length) {
        const { count } = await supabase
          .from("buy_requests")
          .select("*", { count: "exact", head: true })
          .in("listing_id", myListings.map((l) => l.id))
          .eq("status", "pending");
        sellCount = count || 0;
      }
      // Count my requests that are pending or accepted (needs attention)
      const { count: myPendingCount } = await supabase
        .from("buy_requests")
        .select("*", { count: "exact", head: true })
        .eq("buyer_id", userId)
        .in("status", ["pending", "accepted"]);
      setPendingCount(sellCount + (myPendingCount || 0));
    } catch {
      // Silently handle — pending count is non-critical
      setPendingCount(0);
    }
  }

  useEffect(() => {
    if (profile?.id) {
      fetchPendingCount(profile.id);
      const interval = setInterval(() => fetchPendingCount(profile.id), 30000);
      return () => clearInterval(interval);
    }
  }, [profile]);

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  const loading = session === undefined || (session && profile === undefined);

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, pendingCount, signOut, refreshProfile: () => fetchProfile(session?.user?.id), refreshPending: () => profile?.id && fetchPendingCount(profile.id) }}
    >
      {children}
    </AuthContext.Provider>
  );
}
