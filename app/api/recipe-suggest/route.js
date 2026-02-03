import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Suggests recipes using AI based on user's recipes, meal plans, and preferences.
 * Requires OPENAI_API_KEY and Supabase service role for user context.
 */
export async function POST(req) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY required for suggestions" },
        { status: 503 }
      );
    }

    const { userId, context } = await req.json();
    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load counts (titles are encrypted, so we use counts for context)
    const { count: recipeCount } = await supabase
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const { count: planCount } = await supabase
      .from("meal_plan")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const promptContext = `
User has ${recipeCount || 0} saved recipes and ${planCount || 0} meal plans.
User context: ${context || "General suggestions - suggest diverse, practical recipes"}

Suggest 3-5 recipe ideas the user might enjoy. Return JSON: { "suggestions": ["Recipe 1", "Recipe 2", ...] }
Be diverse. Consider season and variety. No markdown.`;

    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful meal planning assistant. Suggest recipes based on the user's preferences and history. Return only valid JSON.",
          },
          { role: "user", content: promptContext },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      }),
    });

    if (!completion.ok) {
      return NextResponse.json(
        { error: "Suggestion failed" },
        { status: 502 }
      );
    }

    const { choices } = await completion.json();
    const content = choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { suggestions: [] },
        { status: 200 }
      );
    }

    const { suggestions } = JSON.parse(content);
    return NextResponse.json({
      suggestions: Array.isArray(suggestions) ? suggestions : [],
    });
  } catch (err) {
    console.error("Recipe suggest error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to suggest recipes" },
      { status: 500 }
    );
  }
}
