"use client";

import { supabase } from "./supabaseClient";
import { cache, loadCache } from "./store";

const PROFILE_CACHE_KEY = "profile-cache";

export async function getUserProfile(userId) {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    await cache(PROFILE_CACHE_KEY, data);
    return data;
  } catch {
    // Fallback to cached profile if offline
    const cached = await loadCache(PROFILE_CACHE_KEY);
    return cached || null;
  }
}

export async function updateUserProfile(userId, updates) {
  if (!userId) throw new Error("Missing user id");

  const payload = { id: userId, ...updates };
  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload)
    .select("*")
    .single();

  if (error) throw error;
  await cache(PROFILE_CACHE_KEY, data);
  return data;
}

