export const SECTIONS = {
	produce: ["lettuce", "apple", "onion", "tomato", "spinach", "garlic", "banana"],
	dairy: ["milk", "cheese", "yogurt", "butter"],
	protein: ["chicken", "beef", "eggs", "tofu", "fish", "beans"],
	bakery: ["bread", "buns", "rolls"],
	pantry: ["flour", "sugar", "salt", "rice", "oil", "pasta"],
	spices: ["pepper", "cumin", "turmeric", "paprika"],
};

export function categorize(line) {
	const lower = line.toLowerCase();
	for (const section of Object.keys(SECTIONS)) {
		if (SECTIONS[section].some((kw) => lower.includes(kw))) return section;
	}
	return "other";
}
