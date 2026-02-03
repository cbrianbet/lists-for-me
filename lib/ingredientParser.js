export function parseIngredient(line) {
	const pattern = /^(\d+)\s*([a-zA-Z]+)?\s*(.*)$/;
	const match = line.trim().match(pattern);
	if (!match) return null;

	const quantity = Number(match[1]);
	const unit = (match[2] || "").trim();
	const item = (match[3] || "").trim();

	if (!item) return null;
	return { quantity, unit, item };
}

export function mergeIngredients(lines) {
	const merged = {};

	for (const raw of lines) {
		const parsed = parseIngredient(raw);
		if (!parsed) continue;

		const key = `${parsed.unit}|${parsed.item}`.toLowerCase();

		if (!merged[key]) merged[key] = { ...parsed };
		else merged[key].quantity += parsed.quantity;
	}

	return Object.values(merged).map((x) => `${x.quantity} ${x.unit} ${x.item}`.trim());
}
