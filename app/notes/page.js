"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { cache, loadCache } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const NOTES_CACHE_KEY = "notes-cache";

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("notes")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });

        if (fetchError) throw fetchError;

        setNotes(data || []);
        await cache(NOTES_CACHE_KEY, data || []);

        if (data && data.length > 0) {
          const first = data[0];
          setSelectedId(first.id);
          setTitle(first.title || "");
          setBody(first.body || "");
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load notes, showing offline cache if available.");
        const cached = (await loadCache(NOTES_CACHE_KEY)) || [];
        setNotes(cached);
        if (cached.length > 0) {
          const first = cached[0];
          setSelectedId(first.id);
          setTitle(first.title || "");
          setBody(first.body || "");
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  function selectNote(n) {
    setSelectedId(n.id);
    setTitle(n.title || "");
    setBody(n.body || "");
  }

  async function createNote() {
    try {
      setSaving(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error: insertError } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          title: "Untitled note",
          body: "",
        })
        .select("*")
        .single();

      if (insertError) throw insertError;

      const updated = [data, ...notes];
      setNotes(updated);
      await cache(NOTES_CACHE_KEY, updated);
      selectNote(data);
    } catch (err) {
      setError(err.message || "Failed to create note");
    } finally {
      setSaving(false);
    }
  }

  async function saveCurrent() {
    if (!selectedId) return;
    try {
      setSaving(true);
      setError("");

      const { data, error: updateError } = await supabase
        .from("notes")
        .update({
          title: title || "Untitled note",
          body,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedId)
        .select("*")
        .single();

      if (updateError) throw updateError;

      const updated = notes.map((n) => (n.id === selectedId ? data : n));
      setNotes(updated.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
      await cache(NOTES_CACHE_KEY, updated);
    } catch (err) {
      setError(err.message || "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCurrent() {
    if (!selectedId) return;
    if (!confirm("Delete this note?")) return;

    try {
      setSaving(true);
      setError("");

      const { error: deleteError } = await supabase
        .from("notes")
        .delete()
        .eq("id", selectedId);

      if (deleteError) throw deleteError;

      const updated = notes.filter((n) => n.id !== selectedId);
      setNotes(updated);
      await cache(NOTES_CACHE_KEY, updated);

      if (updated.length > 0) {
        selectNote(updated[0]);
      } else {
        setSelectedId(null);
        setTitle("");
        setBody("");
      }
    } catch (err) {
      setError(err.message || "Failed to delete note");
    } finally {
      setSaving(false);
    }
  }

  if (loading && notes.length === 0) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-6">
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          Loading notes...
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,0.4fr)_minmax(0,1.6fr)]">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm">Notes</CardTitle>
              <CardDescription className="text-xs">Your personal notebook</CardDescription>
            </div>
            <Button size="sm" onClick={createNote} disabled={saving}>
              New
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet. Create your first note.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {notes.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => selectNote(n)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left hover:bg-muted ${
                        n.id === selectedId ? "bg-muted" : ""
                      }`}
                    >
                      <span className="truncate font-medium">{n.title || "Untitled note"}</span>
                      {n.updated_at && (
                        <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                          {new Date(n.updated_at).toLocaleDateString()}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-sm">Editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedId ? (
              <>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title"
                />
                <Separator />
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onBlur={saveCurrent}
                  rows={12}
                  placeholder="Write your note here..."
                  className="min-h-[280px]"
                />
                <div className="flex items-center justify-between gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={deleteCurrent}
                    disabled={saving}
                  >
                    Delete
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveCurrent}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a note on the left or create a new one to start writing.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

