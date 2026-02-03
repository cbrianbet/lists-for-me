import { get, set } from "idb-keyval";

export async function cache(key, data) {
	await set(key, data);
}

export async function loadCache(key) {
	return await get(key);
}
