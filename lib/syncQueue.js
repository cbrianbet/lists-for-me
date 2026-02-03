import { get, set, del, keys } from "idb-keyval";

export async function queueWrite(data) {
	const key = `pending-${Date.now()}-${Math.random()}`;
	await set(key, data);
}

export async function getPendingWrites() {
	const allKeys = await keys();
	return allKeys.filter((k) => typeof k === "string" && k.startsWith("pending-"));
}

export async function popWrite(key) {
	const value = await get(key);
	await del(key);
	return value;
}
