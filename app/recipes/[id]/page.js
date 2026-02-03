"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import { decrypt } from "../../../lib/crypto";
import { useTTS } from "../../../lib/useTTS";
import { useProfile } from "@/lib/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, Volume2, VolumeX } from "lucide-react";

export default function RecipeDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { speak, stop, speaking } = useTTS();
  const { profile } = useProfile();

  useEffect(() => {
    async function loadRecipe() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("recipes")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (fetchError) throw fetchError;

        if (!data) {
          setError("Recipe not found");
          return;
        }

        setRecipe({
          ...data,
          title: decrypt(data.title),
          ingredients: decrypt(data.ingredients),
          steps: decrypt(data.steps),
          note: data.note ? decrypt(data.note) : "",
        });
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load recipe");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadRecipe();
    }
  }, [id, router]);

  function handleReadAloud() {
    if (!recipe) return;
    if (speaking) {
      stop();
      return;
    }
    const parts = [
      recipe.title && `Recipe: ${recipe.title}`,
      recipe.ingredients && `Ingredients. ${recipe.ingredients.replace(/\n/g, ". ")}`,
      recipe.steps && `Steps. ${recipe.steps.replace(/\n/g, ". Step. ")}`,
      recipe.note && `Notes. ${recipe.note.replace(/\n/g, ". ")}`,
    ].filter(Boolean);
    speak(parts.join(". "), {
      rate: profile?.tts_rate ?? 0.9,
      pitch: profile?.tts_pitch ?? 1,
      lang: profile?.tts_lang ?? "en-US",
    });
  }

  if (loading) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-6">
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          Loading recipe...
        </div>
      </main>
    );
  }

  if (error || !recipe) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-6">
        <div className="space-y-4">
          <Link
            href="/recipes"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to recipes
          </Link>
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {error || "Recipe not found"}
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-6">
      <div className="space-y-4">
        <Link
          href="/recipes"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to recipes
        </Link>

        <Card>
          {recipe.image_url && (
            <div className="aspect-video w-full overflow-hidden bg-muted">
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <CardHeader className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-semibold">{recipe.title}</CardTitle>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Cook time: {recipe.cook_time || 0} mins</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReadAloud}
                className={speaking ? "bg-primary text-primary-foreground" : ""}
              >
                {speaking ? (
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
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <CardDescription className="mb-2 font-semibold uppercase tracking-wide text-xs">
                Ingredients
              </CardDescription>
              <Separator className="mb-3" />
              {recipe.ingredients ? (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {recipe.ingredients.split("\n").map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No ingredients listed.</p>
              )}
            </section>

            <section>
              <CardDescription className="mb-2 font-semibold uppercase tracking-wide text-xs">
                Steps
              </CardDescription>
              <Separator className="mb-3" />
              {recipe.steps ? (
                <ol className="list-decimal space-y-2 pl-5 text-sm">
                  {recipe.steps.split("\n").map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No steps provided.</p>
              )}
            </section>

            <section>
              <CardDescription className="mb-2 font-semibold uppercase tracking-wide text-xs">
                Notes
              </CardDescription>
              <Separator className="mb-3" />
              {recipe.note ? (
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {recipe.note}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              )}
            </section>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

