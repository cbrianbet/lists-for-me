import { createEvent } from "ics";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decrypt } from "@/lib/crypto";

export async function POST(req) {
	const { date, recipeId } = await req.json();

	const { data } = await supabaseAdmin.from("recipes").select("title").eq("id", recipeId).single();

	const title = data?.title ? decrypt(data.title) : "Meal";

	const [y, m, d] = date.split("-").map(Number);

	const { value, error } = createEvent({
		title: `Meal: ${title}`,
		start: [y, m, d, 18, 0], // 6PM
		duration: { hours: 1 },
	});

	if (error) return new Response("Failed to create calendar event", { status: 500 });

	return new Response(value, {
		headers: {
			"Content-Type": "text/calendar",
			"Content-Disposition": `attachment; filename="meal-${recipeId}-${date}.ics"`,
		},
	});
}
