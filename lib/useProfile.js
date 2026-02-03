"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { getUserProfile, updateUserProfile } from "./profile";

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
          setUser(null);
          setProfile(null);
          return;
        }

        setUser(currentUser);
        const data = await getUserProfile(currentUser.id);
        setProfile(data);
      } catch (err) {
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const saveProfile = useCallback(
    async (updates) => {
      if (!user) throw new Error("Not signed in");
      const merged = await updateUserProfile(user.id, updates);
      setProfile(merged);
      return merged;
    },
    [user]
  );

  return { user, profile, loading, error, saveProfile };
}

