import { NextResponse } from "next/server";

/**
 * This is a SAFE placeholder route.
 * You can connect this to:
 * - Supabase Edge Functions
 * - OpenAI image generation
 * - Any AI provider
 *
 * IMPORTANT: Keep private keys ONLY server-side.
 */
export async function POST(req) {
	const { prompt } = await req.json();

	// For now, fallback to a default image path
	// Replace this with real AI generation logic later.
	return NextResponse.json({
		imageUrl: "/default.png",
		usedPrompt: prompt,
	});
}
