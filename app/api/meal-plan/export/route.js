import PDFDocument from "pdfkit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decrypt } from "@/lib/crypto";

export async function POST(req) {
	const { startDate, endDate } = await req.json();

	const { data, error } = await supabaseAdmin
		.from("meal_plan")
		.select("planned_date, recipes(title)")
		.gte("planned_date", startDate)
		.lte("planned_date", endDate);

	if (error) return new Response("Failed to export PDF", { status: 500 });

	const doc = new PDFDocument();
	const chunks = [];

	doc.on("data", (c) => chunks.push(c));

	doc.fontSize(22).text("Meal Plan");
	doc.moveDown();

	(data || []).forEach((item) => {
		const title = item.recipes?.title ? decrypt(item.recipes.title) : "Unknown";
		doc.fontSize(14).text(`${item.planned_date}: ${title}`);
	});

	doc.end();

	return new Response(Buffer.concat(chunks), {
		headers: { "Content-Type": "application/pdf" },
	});
}
