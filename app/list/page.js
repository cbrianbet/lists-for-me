"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Lock, Globe, Plus, List, AlertCircle } from "lucide-react";
import { parseYear } from "@/lib/utils";
import { useProfile } from "@/lib/useProfile";

export default function ListsPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEncrypted, setNewEncrypted] = useState(false);
  const [newYear, setNewYear] = useState("");
  const [filterMode, setFilterMode] = useState("all"); // "all" | "this" | "custom"
  const [customYear, setCustomYear] = useState("");
  const currentYear = new Date().getFullYear();

  async function loadLists() {
    try {
      const { supabase } = await import("../../lib/supabaseClient");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("lists")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (fetchError) throw fetchError;
      setLists(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load lists");
      setLists([]);
    } finally {
      setLoading(false);
    }
  }

  async function createList(e) {
    e.preventDefault();
    setError("");

    if (!newName.trim()) {
      setError("List name is required");
      return;
    }

    try {
      const { supabase } = await import("../../lib/supabaseClient");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Please login to create lists");
        return;
      }

      const payload = {
        user_id: user.id,
        name: newName.trim(),
        is_encrypted: newEncrypted,
      };
      let parsedYear = parseYear(newYear);
      if (parsedYear === null && profile?.default_list_year) {
        parsedYear = currentYear;
      }
      if (parsedYear !== null) {
        payload.year = parsedYear;
      }

      const { data, error: insertError } = await supabase
        .from("lists")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) throw insertError;

      setShowCreate(false);
      setNewName("");
      setNewEncrypted(false);
      setNewYear("");
      loadLists();

      if (data?.id) {
        router.push(`/list/${data.id}`);
      }
    } catch (err) {
      setError(err.message || "Failed to create list");
    }
  }

  useEffect(() => {
    loadLists();
  }, []);

  useEffect(() => {
    if (!profile) return;
    // Initialize defaults from profile when it loads
    setNewEncrypted(profile.default_list_type === "encrypted");
    if (profile.default_list_year && !newYear) {
      setNewYear(String(currentYear));
    }
  }, [profile, currentYear, newYear]);

  let filteredLists = [...lists];
  const hasLists = lists.length > 0;

  if (hasLists) {
    if (filterMode === "this") {
      filteredLists = filteredLists.filter((list) => list.year === currentYear);
    } else if (filterMode === "custom") {
      const parsed = parseYear(customYear);
      if (parsed !== null) {
        filteredLists = filteredLists.filter((list) => list.year === parsed);
      } else {
        filteredLists = [];
      }
    }

    if (filterMode !== "all") {
      filteredLists.sort((a, b) => {
        const yearA = typeof a.year === "number" ? a.year : -Infinity;
        const yearB = typeof b.year === "number" ? b.year : -Infinity;

        if (yearA !== yearB) {
          return yearB - yearA;
        }

        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return dateB - dateA;
      });
    }
  }

  if (loading) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-6">
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          Loading lists...
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lists</h1>
            <p className="text-sm text-muted-foreground">
              Create public lists or encrypted lists that require a passphrase to view and edit.
            </p>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Plus className="mr-2 h-4 w-4" />
            New List
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {showCreate && (
          <Card>
            <CardHeader>
              <CardTitle>Create List</CardTitle>
              <CardDescription>Choose a name and whether the list contents are encrypted.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createList} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="listName">List name</Label>
                  <Input
                    id="listName"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Groceries, Passwords, Travel"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="listYear">Year (optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="listYear"
                      type="number"
                      min="1900"
                      max="2100"
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                      placeholder="e.g., 2025"
                      className="max-w-[160px]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewYear(String(new Date().getFullYear()))}
                    >
                      Use this year
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Optional, between 1900 and 2100.</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setNewEncrypted(false)}
                    className={`flex flex-1 items-center gap-2 rounded-lg border p-3 transition-colors ${
                      newEncrypted ? "border-border hover:bg-muted/50" : "border-primary bg-primary/5"
                    }`}
                  >
                    <Globe className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Public</div>
                      <div className="text-xs text-muted-foreground">Anyone with the link can view</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewEncrypted(true)}
                    className={`flex flex-1 items-center gap-2 rounded-lg border p-3 transition-colors ${
                      newEncrypted ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <Lock className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Encrypted</div>
                      <div className="text-xs text-muted-foreground">Passphrase required to view or edit</div>
                    </div>
                  </button>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={!newName.trim()}>
                    Create List
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {hasLists && (
          <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium">Filter by year</span>
              <Select
                value={filterMode}
                onChange={(e) => {
                  setFilterMode(e.target.value);
                  if (e.target.value !== "custom") {
                    setCustomYear("");
                  }
                }}
                className="max-w-[200px]"
              >
                <option value="all">All years</option>
                <option value="this">This year ({currentYear})</option>
                <option value="custom">Custom year…</option>
              </Select>
            </div>
            {filterMode === "custom" && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  type="number"
                  min="1900"
                  max="2100"
                  value={customYear}
                  onChange={(e) => setCustomYear(e.target.value)}
                  placeholder="Enter year, e.g. 2025"
                  className="max-w-[160px]"
                />
                <p className="text-xs text-muted-foreground">
                  Show lists for a specific year between 1900 and 2100.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          {!hasLists ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <List className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 font-semibold">No lists yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Create your first list to get started. Choose public for sharing or encrypted for private data.
                </p>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create List
                </Button>
              </CardContent>
            </Card>
          ) : filteredLists.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                No lists match the selected year.
              </CardContent>
            </Card>
          ) : (
            filteredLists.map((list) => (
              <Link key={list.id} href={`/list/${list.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      {list.is_encrypted ? (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Globe className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium">{list.is_encrypted ? "Encrypted List" : list.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {[list.year && `Year ${list.year}`, list.is_encrypted ? "Encrypted • Passphrase required" : "Public"]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      </div>
                    </div>
                    <span className="text-muted-foreground">→</span>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
