"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { decrypt, encrypt } from "../../lib/crypto";
import { mergeIngredients } from "../../lib/ingredientParser";
import { categorize } from "../../lib/sections";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarIcon, FileDown, ShoppingCart, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MealPlannerPage() {
  const [date, setDate] = useState(new Date());
  const [recipes, setRecipes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const dateStr = useMemo(() => date.toISOString().slice(0, 10), [date]);

  async function loadRecipes() {
    const { supabase } = await import("../../lib/supabaseClient");
    const { data } = await supabase
      .from("recipes")
      .select("id,title,ingredients")
      .order("id", { ascending: false });
    const out = (data || []).map((r) => ({
      ...r,
      title: decrypt(r.title),
      ingredients: decrypt(r.ingredients),
    }));
    setRecipes(out);
  }

  async function loadPlans() {
    const { supabase } = await import("../../lib/supabaseClient");
    const { data } = await supabase
      .from("meal_plan")
      .select("id, planned_date, recipe_id, recipes(title)")
      .order("planned_date", { ascending: false });

    const out = (data || []).map((p) => ({
      ...p,
      recipe_title: p.recipes?.title ? decrypt(p.recipes.title) : "Unknown",
    }));
    setPlans(out);
  }

  async function assignMeal() {
    setError("");
    setSuccess("");

    if (!selectedRecipe) {
      setError("Please select a recipe");
      return;
    }

    const { supabase } = await import("../../lib/supabaseClient");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      setError("Please login to assign meals");
      return;
    }

    try {
      const { error: insertError } = await supabase.from("meal_plan").insert({
        user_id: user.id,
        recipe_id: Number(selectedRecipe),
        planned_date: dateStr,
      });

      if (insertError) throw insertError;

      setSelectedRecipe("");
      setSuccess("Meal assigned successfully!");
      loadPlans();
    } catch (err) {
      setError(err.message || "Failed to assign meal");
    }
  }

  async function exportWeekPDF() {
    const startDate = dateStr;
    const endDate = dateStr;

    const res = await fetch("/api/meal-plan/export", {
      method: "POST",
      body: JSON.stringify({ startDate, endDate }),
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  async function addToCalendar(recipeId, dateISO) {
    const res = await fetch("/api/meal-plan/calendar", {
      method: "POST",
      body: JSON.stringify({ recipeId, date: dateISO }),
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  async function buildGroceryListFromPlannedMeals() {
    setError("");
    setSuccess("");

    if (plans.length === 0) {
      setError("No meal plans to build grocery list from");
      return;
    }

    const { supabase } = await import("../../lib/supabaseClient");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      setError("Please login to build grocery list");
      return;
    }

    try {
      const usedRecipeIds = [...new Set(plans.map((p) => p.recipe_id))];
      const usedRecipes = recipes.filter((r) => usedRecipeIds.includes(r.id));

      const rawLines = usedRecipes
        .flatMap((r) => (r.ingredients || "").split("\n"))
        .map((x) => x.trim())
        .filter(Boolean);

      if (rawLines.length === 0) {
        setError("No ingredients found in planned meals");
        return;
      }

      const merged = mergeIngredients(rawLines);

      // Find or create a "Shopping List" to add items to
      let { data: shoppingList } = await supabase
        .from("lists")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", "Shopping List")
        .eq("is_encrypted", false)
        .single();

      if (!shoppingList) {
        const { data: newList } = await supabase
          .from("lists")
          .insert({ user_id: user.id, name: "Shopping List", is_encrypted: false })
          .select("id")
          .single();
        shoppingList = newList;
      }

      const listId = shoppingList?.id || null;

      for (const line of merged) {
        await supabase.from("list_items").insert({
          user_id: user.id,
          list_id: listId,
          name: encrypt(line),
          section: categorize(line),
        });
      }

      setSuccess(`Added ${merged.length} items to your grocery list!`);
    } catch (err) {
      setError(err.message || "Failed to build grocery list");
    }
  }

  useEffect(() => {
    loadRecipes();
    loadPlans();
  }, []);

  return (
    <main className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Meal Planner</CardTitle>
          <p className="text-sm text-muted-foreground">Plan your meals and build grocery lists</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="rounded-md border border-green-500 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
              {success}
            </div>
          )}

          <div className="space-y-2">
            <span className="text-sm font-medium">Select date</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  className="rounded-lg border-0"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Assign recipe</label>
            <Select
              value={selectedRecipe}
              onChange={(e) => {
                setSelectedRecipe(e.target.value);
                setError("");
              }}
              className="w-full"
            >
              <option value="">Select recipe...</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </Select>
            {recipes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No recipes yet. Add some recipes first!
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={assignMeal} disabled={!selectedRecipe}>
              Assign meal
            </Button>
            <Button variant="outline" onClick={exportWeekPDF}>
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={buildGroceryListFromPlannedMeals}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Build Grocery List
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Scheduled meals</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {plans.map((p) => (
              <li
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border bg-card px-3 py-2"
              >
                <span className="text-sm min-w-0 break-words">
                  {p.planned_date} → {p.recipe_title}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addToCalendar(p.recipe_id, p.planned_date)}
                  className="shrink-0"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Add to Calendar
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      </div>
    </main>
  );
}
