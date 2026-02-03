import { NextResponse } from "next/server";

/**
 * Extracts recipe from a URL using AI.
 * Requires OPENAI_API_KEY in environment.
 * Falls back to JSON-LD schema extraction when available.
 */
export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL" },
        { status: 400 }
      );
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RecipeBot/1.0; +https://example.com)",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${res.status}` },
        { status: 502 }
      );
    }

    const html = await res.text();

    // Try JSON-LD Recipe schema first (no AI needed)
    const ldJsonMatch = html.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    );
    if (ldJsonMatch) {
      for (const match of ldJsonMatch) {
        const jsonStr = match.replace(
          /<script[^>]*>([\s\S]*?)<\/script>/i,
          "$1"
        );
        try {
          const data = JSON.parse(jsonStr);
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (item["@type"] === "Recipe" || item["@type"]?.includes?.("Recipe")) {
              const recipe = parseSchemaRecipe(item);
              if (recipe.title) {
                return NextResponse.json(recipe);
              }
            }
          }
        } catch {
          // Continue to next match
        }
      }
    }

    // Fall back to AI extraction
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "AI extraction requires OPENAI_API_KEY. Add it to .env.local. Schema extraction did not find a recipe.",
        },
        { status: 503 }
      );
    }

    // Strip HTML and limit size
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15000);

    if (text.length < 100) {
      return NextResponse.json(
        { error: "Page has insufficient text content" },
        { status: 400 }
      );
    }

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
            content: `Extract recipe data from the given web page content. Return ONLY valid JSON with these exact keys: title, ingredients (array of strings), steps (array of strings), cookTime (number, minutes, or 0 if unknown). No markdown, no explanation.`,
          },
          {
            role: "user",
            content: `Extract the recipe from this page:\n\n${text}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!completion.ok) {
      const err = await completion.text();
      console.error("OpenAI error:", err);
      return NextResponse.json(
        { error: "AI extraction failed" },
        { status: 502 }
      );
    }

    const { choices } = await completion.json();
    const content = choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No recipe found on this page" },
        { status: 404 }
      );
    }

    const recipe = JSON.parse(content);
    return NextResponse.json({
      title: recipe.title || "Untitled Recipe",
      ingredients: Array.isArray(recipe.ingredients)
        ? recipe.ingredients.join("\n")
        : String(recipe.ingredients || ""),
      steps: Array.isArray(recipe.steps)
        ? recipe.steps.join("\n")
        : String(recipe.steps || ""),
      cookTime: Number(recipe.cookTime) || 30,
    });
  } catch (err) {
    console.error("Recipe extract error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to extract recipe" },
      { status: 500 }
    );
  }
}

function parseSchemaRecipe(item) {
  const name = item.name || item.headline || "";
  let ingredients = [];
  if (Array.isArray(item.recipeIngredient)) {
    ingredients = item.recipeIngredient;
  } else if (item.recipeIngredient) {
    ingredients = [item.recipeIngredient];
  }

  let steps = [];
  if (Array.isArray(item.recipeInstructions)) {
    steps = item.recipeInstructions.map((s) =>
      typeof s === "string" ? s : s.text || s.name || ""
    );
  } else if (item.recipeInstructions?.text) {
    steps = [item.recipeInstructions.text];
  } else if (typeof item.recipeInstructions === "string") {
    steps = [item.recipeInstructions];
  }

  const cookTime =
    item.cookTime?.match(/PT(\d+)M/)?.[1] ||
    item.totalTime?.match(/PT(\d+)M/)?.[1] ||
    item.prepTime?.match(/PT(\d+)M/)?.[1] ||
    30;

  return {
    title: name,
    ingredients: ingredients.join("\n"),
    steps: steps.filter(Boolean).join("\n"),
    cookTime: parseInt(cookTime, 10) || 30,
  };
}
