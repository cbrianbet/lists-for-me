"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { encrypt, decrypt } from "../../lib/crypto";
import { useSpeech } from "../../lib/useSpeech";
import { useTTS } from "../../lib/useTTS";
import { useProfile } from "@/lib/useProfile";
import { queueWrite, getPendingWrites, popWrite } from "../../lib/syncQueue";
import { cache, loadCache } from "../../lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Pencil, Trash2, Mic, MicOff, X, AlertCircle, Link2, Sparkles, Volume2, VolumeX } from "lucide-react";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [cookTime, setCookTime] = useState(30);
  const [note, setNote] = useState("");

  const [editId, setEditId] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestContext, setSuggestContext] = useState("");
  const [readingRecipeId, setReadingRecipeId] = useState(null);

  const { start, stop, listening } = useSpeech();
  const { speak, stop: stopTTS, speaking } = useTTS();
  const { profile } = useProfile();

  function validateForm() {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = "Recipe title is required";
    } else if (title.length > 200) {
      newErrors.title = "Title must be less than 200 characters";
    }

    if (ingredients && ingredients.length > 5000) {
      newErrors.ingredients = "Ingredients must be less than 5000 characters";
    }

    if (steps && steps.length > 10000) {
      newErrors.steps = "Steps must be less than 10000 characters";
    }

    if (note && note.length > 5000) {
      newErrors.note = "Notes must be less than 5000 characters";
    }

    if (cookTime < 0) {
      newErrors.cookTime = "Cook time cannot be negative";
    } else if (cookTime > 1440) {
      newErrors.cookTime = "Cook time must be less than 24 hours (1440 mins)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function safeInsertOrUpdate(payload) {
    try {
      if (editId) {
        const { error } = await supabase.from("recipes").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("recipes").insert(payload);
        if (error) throw error;
      }
    } catch (err) {
      await queueWrite({ table: "recipes", action: editId ? "update" : "insert", payload, editId });
      throw err;
    }
  }

  async function flushQueueIfOnline() {
    if (!navigator.onLine) return;
    const pending = await getPendingWrites();
    for (const key of pending) {
      const job = await popWrite(key);
      if (!job) continue;

      if (job.table === "recipes") {
        if (job.action === "insert") await supabase.from("recipes").insert(job.payload);
        if (job.action === "update") await supabase.from("recipes").update(job.payload).eq("id", job.editId);
      }
    }
  }

  async function loadRecipes() {
    try {
      const { data } = await supabase.from("recipes").select("*").order("id", { ascending: false });
      await cache("recipes-cache", data);

      const out = (data || []).map((r) => ({
        ...r,
        title: decrypt(r.title),
        ingredients: decrypt(r.ingredients),
        steps: decrypt(r.steps),
        note: r.note ? decrypt(r.note) : "",
      }));
      setRecipes(out);
    } catch {
      const offline = (await loadCache("recipes-cache")) || [];
      const out = offline.map((r) => ({
        ...r,
        title: decrypt(r.title),
        ingredients: decrypt(r.ingredients),
        steps: decrypt(r.steps),
        note: r.note ? decrypt(r.note) : "",
      }));
      setRecipes(out);
    }
  }

  // Choose a public illustration for a recipe based on its title.
  // Prefers PNGs but rotates through other images for the same food type.
  function pickFromPool(title, pool) {
    if (!pool || pool.length === 0) {
      return "/images/recipes/default.png";
    }
    const t = (title || "").toLowerCase();
    let hash = 0;
    for (let i = 0; i < t.length; i++) {
      hash = (hash + t.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(hash) % pool.length;
    return pool[idx];
  }

  function getImageForTitle(title) {
    const t = (title || "").toLowerCase();

    // Salads
    if (t.includes("salad")) {
      return pickFromPool(title, [
        "/images/recipes/salad.png",
        "/images/recipes/salad3.jpg",
        "/images/recipes/salad2.jpg",
        "/images/recipes/salad.jpg",
      ]);
    }

    // Chicken dishes
    if (t.includes("chicken")) {
      return pickFromPool(title, [
        "/images/recipes/chicken.png",
        "/images/recipes/rice chicken.jpg",
      ]);
    }

    // Fish / seafood
    if (t.includes("fish") || t.includes("salmon") || t.includes("tuna")) {
      return pickFromPool(title, [
        "/images/recipes/fish.png",
        "/images/recipes/fish.jpg",
      ]);
    }

    // Beef
    if (t.includes("beef") || t.includes("steak")) {
      return pickFromPool(title, ["/images/recipes/beef.png"]);
    }

    // Pork / ribs
    if (t.includes("pork") || t.includes("ribs")) {
      return pickFromPool(title, [
        "/images/recipes/pork.png",
        "/images/recipes/ribs.png",
      ]);
    }

    // Indian / curry / spicy
    if (t.includes("curry") || t.includes("indian")) {
      return pickFromPool(title, [
        "/images/recipes/indian.jpg",
        "/images/recipes/indian2.jpg",
        "/images/recipes/chillies.jpg",
      ]);
    }

    // Generic spicy
    if (t.includes("chilli") || t.includes("chili") || t.includes("spicy")) {
      return pickFromPool(title, ["/images/recipes/chillies.jpg"]);
    }

    // Fallback pool: prefer PNG illustrations first
    return pickFromPool(title, [
      "/images/recipes/default.png",
      "/images/recipes/salad.png",
      "/images/recipes/chicken.png",
      "/images/recipes/fish.png",
    ]);
  }

  async function generateAIImage(promptTitle) {
    // Kept async to avoid touching callers; now returns a public illustration.
    return getImageForTitle(promptTitle);
  }

  async function saveRecipe() {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) {
        setErrors({ general: "Please login to save recipes" });
        return;
      }

      const image_url = editId ? recipes.find((r) => r.id === editId)?.image_url : await generateAIImage(title);

      const payload = {
        user_id: user.id,
        title: encrypt(title.trim()),
        ingredients: encrypt(ingredients.trim()),
        steps: encrypt(steps.trim()),
        cook_time: Number(cookTime || 0),
        note: note.trim() ? encrypt(note.trim()) : null,
        image_url,
      };

      await safeInsertOrUpdate(payload);

      setTitle("");
      setIngredients("");
      setSteps("");
      setCookTime(30);
      setNote("");
      setEditId(null);
      setErrors({});

      await flushQueueIfOnline();
      await loadRecipes();
    } catch (err) {
      setErrors({ general: err.message || "Failed to save recipe" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteRecipe(id) {
    if (!confirm("Are you sure you want to delete this recipe?")) return;
    
    try {
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw error;
      await loadRecipes();
    } catch (err) {
      setErrors({ general: err.message || "Failed to delete recipe" });
    }
  }

  function startEditing(r) {
    setEditId(r.id);
    setTitle(r.title);
    setIngredients(r.ingredients || "");
    setSteps(r.steps || "");
    setCookTime(r.cook_time || 30);
    setNote(r.note || "");
    setErrors({});
  }

  function cancelEdit() {
    setEditId(null);
    setTitle("");
    setIngredients("");
    setSteps("");
    setCookTime(30);
    setNote("");
    setErrors({});
  }

  async function importFromUrl() {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportError("");
    try {
      const res = await fetch("/api/recipe-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extract");
      setTitle(data.title || "");
      setIngredients(data.ingredients || "");
      setSteps(data.steps || "");
      setCookTime(Number(data.cookTime) || 30);
      setImportUrl("");
      setEditId(null);
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImporting(false);
    }
  }

  async function fetchSuggestions() {
    setSuggestLoading(true);
    setSuggestions([]);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSuggestions(["Please log in to get suggestions"]);
        return;
      }
      const res = await fetch("/api/recipe-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, context: suggestContext }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setSuggestions([`Error: ${err.message}`]);
    } finally {
      setSuggestLoading(false);
    }
  }

  function readRecipeAloud(r) {
    if (readingRecipeId === r.id && speaking) {
      stopTTS();
      setReadingRecipeId(null);
      return;
    }
    setReadingRecipeId(r.id);
    const parts = [
      r.title && `Recipe: ${r.title}`,
      r.ingredients && `Ingredients. ${r.ingredients.replace(/\n/g, ". ")}`,
      r.steps && `Steps. ${r.steps.replace(/\n/g, ". Step. ")}`,
    ].filter(Boolean);
    speak(parts.join(". "), {
      rate: profile?.tts_rate ?? 0.9,
      pitch: profile?.tts_pitch ?? 1,
      lang: profile?.tts_lang ?? "en-US",
    });
  }

  useEffect(() => {
    if (!speaking) setReadingRecipeId(null);
  }, [speaking]);

  useEffect(() => {
    loadRecipes();
    flushQueueIfOnline();

    const onOnline = () => {
      flushQueueIfOnline();
      loadRecipes();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return (
    <main className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Import from URL</CardTitle>
            <CardDescription>Paste a recipe link to extract title, ingredients, and steps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="https://example.com/recipe"
                value={importUrl}
                onChange={(e) => {
                  setImportUrl(e.target.value);
                  setImportError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && importFromUrl()}
                className="flex-1 min-w-0"
              />
              <Button onClick={importFromUrl} disabled={importing || !importUrl.trim()} className="shrink-0">
                {importing ? "Extracting..." : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Extract
                  </>
                )}
              </Button>
            </div>
            {importError && (
              <p className="text-sm text-destructive">{importError}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{editId ? "Edit Recipe" : "Add Recipe"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Create or edit recipes with ingredients and steps
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.general && (
              <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.general}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">
                Recipe title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                placeholder="e.g., Chocolate Chip Cookies"
                aria-invalid={!!errors.title}
                maxLength={200}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ingredients">Ingredients</Label>
              <Textarea
                id="ingredients"
                value={ingredients}
                onChange={(e) => {
                  setIngredients(e.target.value);
                  setErrors((prev) => ({ ...prev, ingredients: undefined }));
                }}
                placeholder={`One per line, e.g.:\n2 eggs\n1 cup flour\n1/2 tsp salt`}
                rows={5}
                aria-invalid={!!errors.ingredients}
                maxLength={5000}
              />
              {errors.ingredients && (
                <p className="text-sm text-destructive">{errors.ingredients}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {ingredients.length}/5000 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="steps">Steps</Label>
              <Textarea
                id="steps"
                value={steps}
                onChange={(e) => {
                  setSteps(e.target.value);
                  setErrors((prev) => ({ ...prev, steps: undefined }));
                }}
                placeholder="One step per line"
                rows={6}
                aria-invalid={!!errors.steps}
                maxLength={10000}
              />
              {errors.steps && (
                <p className="text-sm text-destructive">{errors.steps}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {steps.length}/10000 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Notes (optional)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setErrors((prev) => ({ ...prev, note: undefined }));
                }}
                placeholder="Use this for substitutions, serving tips, or general tweaks."
                rows={3}
                aria-invalid={!!errors.note}
                maxLength={5000}
              />
              {errors.note && (
                <p className="text-sm text-destructive">{errors.note}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {note.length}/5000 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cookTime">Cook time (minutes)</Label>
              <Input
                id="cookTime"
                type="number"
                min="0"
                max="1440"
                value={cookTime}
                onChange={(e) => {
                  setCookTime(e.target.value);
                  setErrors((prev) => ({ ...prev, cookTime: undefined }));
                }}
                className="w-32"
                aria-invalid={!!errors.cookTime}
              />
              {errors.cookTime && (
                <p className="text-sm text-destructive">{errors.cookTime}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button onClick={saveRecipe} disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? "Saving..." : editId ? "Update Recipe" : "Add Recipe"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (listening) stop();
                else start((text) => setSteps((prev) => (prev ? prev + "\n" : "") + text));
              }}
              disabled={isSubmitting}
            >
              {listening ? (
                <>
                  <MicOff className="mr-2 h-4 w-4" />
                  Stop Dictation
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Voice Dictate Steps
                </>
              )}
            </Button>
            {editId && (
              <Button variant="ghost" onClick={cancelEdit} disabled={isSubmitting}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
          </CardFooter>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle>Suggest Recipes</CardTitle>
            <CardDescription>Get AI-powered recipe ideas based on your preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="e.g., quick weeknight dinners, vegetarian, under 30 mins"
              value={suggestContext}
              onChange={(e) => setSuggestContext(e.target.value)}
            />
            <Button onClick={fetchSuggestions} disabled={suggestLoading} variant="outline">
              {suggestLoading ? "Thinking..." : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Get Suggestions
                </>
              )}
            </Button>
            {suggestions.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {suggestions.map((s, i) => (
                  <li key={i} className="rounded-md border px-3 py-2">{s}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Separator />

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Recipes</h2>
          {recipes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No recipes yet. Add your first recipe above!
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recipes.map((r) => (
                <Card key={r.id} className="overflow-hidden">
                  {r.image_url && (
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      <img
                        src={r.image_url}
                        alt={r.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{r.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Cook time: {r.cook_time || 0} mins
                    </p>
                    {r.note && (
                      <p className="mt-1 text-xs italic text-muted-foreground line-clamp-2">
                        {r.note}
                      </p>
                    )}
                  </CardHeader>
                  <CardFooter className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => readRecipeAloud(r)}
                      className={readingRecipeId === r.id && speaking ? "bg-primary text-primary-foreground" : ""}
                    >
                      {readingRecipeId === r.id && speaking ? (
                        <>
                          <VolumeX className="mr-2 h-4 w-4" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Volume2 className="mr-2 h-4 w-4" />
                          Read aloud
                        </>
                      )}
                    </Button>
                    <Link href={`/recipes/${r.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={() => startEditing(r)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteRecipe(r.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
