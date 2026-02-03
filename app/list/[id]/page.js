"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { encrypt, decrypt, encryptWithPassphrase, decryptWithPassphrase } from "../../../lib/crypto";
import { categorize } from "../../../lib/sections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, AlertCircle, Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { parseYear } from "@/lib/utils";

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params.id;

  const [list, setList] = useState(null);
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [itemYear, setItemYear] = useState("");
  const [itemNote, setItemNote] = useState("");
  const [listNameEdit, setListNameEdit] = useState("");
  const [listYearEdit, setListYearEdit] = useState("");
  const [listNoteEdit, setListNoteEdit] = useState("");
  const [bulkYear, setBulkYear] = useState("");
  const [duplicateYear, setDuplicateYear] = useState("");
  const [editId, setEditId] = useState(null);
  const [passphrase, setPassphrase] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [passphraseError, setPassphraseError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const isEncrypted = list?.is_encrypted ?? false;

  async function loadList() {
    try {
      const { supabase } = await import("../../../lib/supabaseClient");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("lists")
        .select("*")
        .eq("id", listId)
        .eq("user_id", user.id)
        .single();

      if (fetchError) throw fetchError;
      setList(data);
      setListNameEdit(data.name || "");
      setListYearEdit(data.year ? String(data.year) : "");
      setListNoteEdit(data.note ? decrypt(data.note) : "");

      if (data && !data.is_encrypted) {
        setUnlocked(true);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "List not found");
    } finally {
      setLoading(false);
    }
  }

  async function loadItems() {
    if (!listId) return;

    try {
      const { supabase } = await import("../../../lib/supabaseClient");
      const { data: rawItems, error: fetchError } = await supabase
        .from("list_items")
        .select("*")
        .eq("list_id", listId)
        .order("id", { ascending: false });

      if (fetchError) throw fetchError;

      const itemsData = rawItems || [];

      if (isEncrypted && unlocked && passphrase) {
        const decrypted = itemsData.map((i) => ({
          ...i,
          name: decryptWithPassphrase(i.name, passphrase, listId) || "",
          note: i.note ? decryptWithPassphrase(i.note, passphrase, listId) || "" : "",
        }));
        // Verify passphrase: if we have items but all decrypt to empty, wrong passphrase
        const allEmpty = itemsData.length > 0 && decrypted.every((i) => !i.name);
        if (allEmpty) {
          setPassphraseError("Wrong passphrase. Please try again.");
          setUnlocked(false);
          setPassphrase("");
          return;
        }
        setItems(decrypted);
      } else if (!isEncrypted) {
        setItems(itemsData.map((i) => ({
          ...i,
          name: decrypt(i.name),
          note: i.note ? decrypt(i.note) : "",
        })));
      } else {
        setItems(itemsData);
      }
    } catch (err) {
      setError(err.message || "Failed to load items");
    }
  }

  function handleUnlock(e) {
    e.preventDefault();
    setPassphraseError("");

    if (!passphrase.trim()) {
      setPassphraseError("Passphrase is required");
      return;
    }

    setUnlocked(true);
  }

  function encryptItem(text) {
    return isEncrypted ? encryptWithPassphrase(text, passphrase, listId) : encrypt(text);
  }

  function decryptItem(ciphertext) {
    return isEncrypted ? decryptWithPassphrase(ciphertext, passphrase, listId) : decrypt(ciphertext);
  }

  async function saveListMetadata() {
    if (!list) return;

    const trimmedName = listNameEdit.trim();
    const parsedYear = parseYear(listYearEdit);
    const trimmedNote = listNoteEdit.trim();

    if (!trimmedName) {
      setError("List name cannot be empty");
      return;
    }

    // No changes
    if (
      trimmedName === list.name &&
      ((parsedYear === null && !list.year) || parsedYear === list.year) &&
      ((trimmedNote === "" && !list.note) || trimmedNote === (list.note ? decrypt(list.note) : ""))
    ) {
      return;
    }

    try {
      const { supabase } = await import("../../../lib/supabaseClient");
      const updates = {
        name: trimmedName,
        year: parsedYear,
        note: trimmedNote ? encrypt(trimmedNote) : null,
      };

      const { data, error: updateError } = await supabase
        .from("lists")
        .update(updates)
        .eq("id", listId)
        .select("*")
        .single();

      if (updateError) throw updateError;

      setList(data);
      setListNameEdit(data.name || "");
      setListYearEdit(data.year ? String(data.year) : "");
      setError("");
    } catch (err) {
      setError(err.message || "Failed to update list details");
    }
  }

  async function clearItemsBeforeYear() {
    const parsed = parseYear(bulkYear);
    if (parsed === null) {
      setError("Enter a valid year between 1900 and 2100 to clear items.");
      return;
    }

    try {
      const { supabase } = await import("../../../lib/supabaseClient");
      const { error: deleteError } = await supabase
        .from("list_items")
        .delete()
        .eq("list_id", listId)
        .lt("year", parsed);

      if (deleteError) throw deleteError;

      setBulkYear("");
      setError("");
      loadItems();
    } catch (err) {
      setError(err.message || "Failed to clear items");
    }
  }

  async function duplicateListForYear() {
    const parsed = parseYear(duplicateYear);
    if (parsed === null) {
      setError("Enter a valid year between 1900 and 2100 to duplicate this list.");
      return;
    }

    if (isEncrypted && !unlocked) {
      setError("Unlock the encrypted list before duplicating so items can be re-encrypted correctly.");
      return;
    }

    try {
      const { supabase } = await import("../../../lib/supabaseClient");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Please login to duplicate lists");
        return;
      }

      // Create the new list
      const listPayload = {
        user_id: user.id,
        name: list.name,
        is_encrypted: list.is_encrypted,
        year: parsed,
      };

      const { data: newList, error: insertError } = await supabase
        .from("lists")
        .insert(listPayload)
        .select("*")
        .single();

      if (insertError) throw insertError;

      // Copy items using the decrypted state we already have
      for (const it of items) {
        const name = it.name || "";
        const note = it.note || "";
        const encryptedName = isEncrypted
          ? encryptWithPassphrase(name, passphrase, newList.id)
          : encrypt(name);
        const encryptedNote = note
          ? (isEncrypted ? encryptWithPassphrase(note, passphrase, newList.id) : encrypt(note))
          : null;

        const itemPayload = {
          user_id: user.id,
          list_id: newList.id,
          name: encryptedName,
          section: it.section || categorize(name),
          year: parsed,
        };
        if (encryptedNote) {
          itemPayload.note = encryptedNote;
        }

        const { error: itemError } = await supabase.from("list_items").insert(itemPayload);
        if (itemError) throw itemError;
      }

      setDuplicateYear("");
      setError("");
      router.push(`/list/${newList.id}`);
    } catch (err) {
      setError(err.message || "Failed to duplicate list");
    }
  }

  const saveItem = async () => {
    setError("");

    if (!text.trim()) {
      setError("Item name cannot be empty");
      return;
    }

    if (text.length > 200) {
      setError("Item name must be less than 200 characters");
      return;
    }

    try {
      const { supabase } = await import("../../../lib/supabaseClient");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Please login to add items");
        return;
      }

      const payload = {
        user_id: user.id,
        list_id: Number(listId),
        name: encryptItem(text.trim()),
        section: categorize(text.trim()),
      };
      const parsedYear = parseYear(itemYear);
      if (parsedYear !== null) {
        payload.year = parsedYear;
      }

      if (itemNote.trim()) {
        payload.note = encryptItem(itemNote.trim());
      }

      if (editId) {
        const { error: updateError } = await supabase.from("list_items").update(payload).eq("id", editId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("list_items").insert(payload);
        if (insertError) throw insertError;
      }

      setText("");
      setItemYear("");
      setItemNote("");
      setEditId(null);
      loadItems();
    } catch (err) {
      setError(err.message || "Failed to save item");
    }
  }

  const deleteItem = async (id) => {
    try {
      const { supabase } = await import("../../../lib/supabaseClient");
      const { error: deleteError } = await supabase.from("list_items").delete().eq("id", id);
      if (deleteError) throw deleteError;
      loadItems();
    } catch (err) {
      setError(err.message || "Failed to delete item");
    }
  }

  const grouped = useMemo(() => {
    const map = {};

    for (const it of items) {
      const sec = it.section || "other";
      if (!map[sec]) map[sec] = [];
      map[sec].push(it);
    }

    // Within each section, order items by:
    // 1) year DESC (items with a year first, latest years first)
    // 2) id DESC as a tiebreaker (newest items first)
    Object.keys(map).forEach((sec) => {
      map[sec].sort((a, b) => {
        const aYear = a.year ?? null;
        const bYear = b.year ?? null;

        // Items without a year go last
        if (aYear === null && bYear === null) {
          return b.id - a.id;
        }
        if (aYear === null) return 1;
        if (bYear === null) return -1;

        if (aYear !== bYear) {
          return bYear - aYear;
        }

        return b.id - a.id;
      });
    });

    return map;
  }, [items]);

  const metrics = useMemo(() => {
    const totalItems = items.length;
    const categories = Object.keys(grouped).length;
    const avgPerCategory = categories > 0 ? (totalItems / categories).toFixed(1) : 0;
    
    return {
      totalItems,
      categories,
      avgPerCategory,
      sections: Object.entries(grouped).map(([name, items]) => ({
        name,
        count: items.length,
      })).sort((a, b) => b.count - a.count),
    };
  }, [items, grouped]);

  useEffect(() => {
    loadList();
  }, [listId]);

  useEffect(() => {
    if (list && (unlocked || !isEncrypted)) {
      loadItems();
    }
  }, [list, unlocked, isEncrypted, passphrase, listId]);

  if (loading || !list) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-6">
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          {loading ? "Loading..." : "List not found"}
        </div>
      </main>
    );
  }

  // Encrypted list: passphrase prompt
  if (isEncrypted && !unlocked) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-6">
        <div className="mx-auto max-w-md space-y-6">
          <Link href="/list" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to lists
          </Link>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-6 w-6 text-primary" />
                <CardTitle>
                {isEncrypted && !unlocked ? "Encrypted List" : list.name}
                {list.year && !(isEncrypted && !unlocked) && (
                  <span className="ml-2 text-base font-normal text-muted-foreground">({list.year})</span>
                )}
              </CardTitle>
              </div>
              <CardDescription>
                This list is encrypted. Enter your passphrase to view, add, or edit contents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="passphrase">Passphrase</Label>
                  <Input
                    id="passphrase"
                    type="password"
                    value={passphrase}
                    onChange={(e) => {
                      setPassphrase(e.target.value);
                      setPassphraseError("");
                    }}
                    placeholder="Enter passphrase"
                    autoFocus
                    aria-invalid={!!passphraseError}
                  />
                  {passphraseError && (
                    <p className="text-sm text-destructive">{passphraseError}</p>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  Unlock List
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/list" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to lists
          </Link>
        </div>

        {listNoteEdit && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wide">
                List note
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {listNoteEdit}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Items</CardDescription>
              <CardTitle className="text-3xl">{metrics.totalItems}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Categories</CardDescription>
              <CardTitle className="text-3xl">{metrics.categories}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg per Category</CardDescription>
              <CardTitle className="text-3xl">{metrics.avgPerCategory}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {isEncrypted && <Lock className="h-5 w-5 text-primary" />}
                <div>
                  <CardTitle>{list.name}</CardTitle>
                  <CardDescription>
                    {isEncrypted ? "Encrypted • Contents secured with your passphrase" : "Public list"}
                  </CardDescription>
                </div>
              </div>
              <div className="w-full max-w-[220px] space-y-1 text-right text-xs text-muted-foreground">
                {list.created_at && (
                  <div>Created: {new Date(list.created_at).toLocaleDateString()}</div>
                )}
                {list.updated_at && (
                  <div>Updated: {new Date(list.updated_at).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="grid gap-2 md:grid-cols-[1.5fr,auto] md:items-end">
                <div className="space-y-1">
                  <Label htmlFor="listNameEdit">List name</Label>
                  <Input
                    id="listNameEdit"
                    value={listNameEdit}
                    onChange={(e) => setListNameEdit(e.target.value)}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="listYearEdit">Year (optional)</Label>
                  <Input
                    id="listYearEdit"
                    type="number"
                    min="1900"
                    max="2100"
                    value={listYearEdit}
                    onChange={(e) => setListYearEdit(e.target.value)}
                    placeholder="e.g., 2025"
                    className="w-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">Optional, 1900–2100.</p>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="listNoteEdit">List note (optional)</Label>
                <Textarea
                  id="listNoteEdit"
                  value={listNoteEdit}
                  onChange={(e) => setListNoteEdit(e.target.value)}
                  rows={2}
                  placeholder="High-level notes about this list (e.g. trip, occasion, household member)…"
                />
              </div>
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={saveListMetadata}>
                  Save details
                </Button>
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <h2 className="text-sm font-semibold">Bulk actions</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bulkYear">Remove items before year…</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bulkYear"
                      type="number"
                      min="1900"
                      max="2100"
                      value={bulkYear}
                      onChange={(e) => setBulkYear(e.target.value)}
                      placeholder="e.g., 2022"
                      className="w-28"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearItemsBeforeYear}
                      disabled={!bulkYear.trim()}
                    >
                      Clear
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete items whose year is less than this value.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duplicateYear">Duplicate list for new year</Label>
                  <div className="flex gap-2">
                    <Input
                      id="duplicateYear"
                      type="number"
                      min="1900"
                      max="2100"
                      value={duplicateYear}
                      onChange={(e) => setDuplicateYear(e.target.value)}
                      placeholder="e.g., 2026"
                      className="w-28"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={duplicateListForYear}
                      disabled={!duplicateYear.trim()}
                    >
                      Duplicate
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Copies this list and its items into a new list tagged with the chosen year.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex flex-wrap gap-2">
                <Input
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setError("");
                  }}
                  placeholder="Add item..."
                  onKeyDown={(e) => e.key === "Enter" && saveItem()}
                  className="flex-1 min-w-[140px]"
                  maxLength={200}
                />
                <Input
                  type="number"
                  min="1900"
                  max="2100"
                  value={itemYear}
                  onChange={(e) => setItemYear(e.target.value)}
                  placeholder="Year (opt)"
                  className="w-24"
                />
              </div>
              <Textarea
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                placeholder="Note (optional)…"
                rows={2}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Year is optional, 1900–2100. Use notes for details like context or location.
                </p>
                <Button onClick={saveItem} disabled={!text.trim()}>
                  {editId ? "Update" : "Add"}
                </Button>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {Object.keys(grouped).length > 0 && (
          <div className="space-y-6">
            {Object.keys(grouped).map((sec) => (
              <Card key={sec}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg capitalize">{sec}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {grouped[sec].map((it) => (
                      <li
                        key={it.id}
                        className="flex items-center justify-between rounded-lg border bg-card px-3 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm break-words">
                            {it.name}
                            {it.year && (
                              <span className="ml-2 text-muted-foreground">({it.year})</span>
                            )}
                          </div>
                          {it.note && (
                            <div className="mt-1 text-xs text-muted-foreground break-words">
                              {it.note}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditId(it.id);
                              setText(it.name);
                              setItemYear(it.year ? String(it.year) : "");
                              setItemNote(it.note || "");
                              setError("");
                            }}
                            aria-label="Edit item"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteItem(it.id)}
                            aria-label="Delete item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
