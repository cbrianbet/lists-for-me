import CryptoJS from "crypto-js";
const SECRET = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

export function encrypt(v) {
	return CryptoJS.AES.encrypt(v, SECRET).toString();
}

export function decrypt(v) {
	try {
		const bytes = CryptoJS.AES.decrypt(v, SECRET);
		return bytes.toString(CryptoJS.enc.Utf8);
	} catch {
		return "";
	}
}

/** Derive a unique key for list encryption (passphrase + listId) */
function getListKey(passphrase, listId) {
	return `${passphrase}:${listId}`;
}

export function encryptWithPassphrase(text, passphrase, listId) {
	const key = getListKey(passphrase, listId);
	return CryptoJS.AES.encrypt(text, key).toString();
}

export function decryptWithPassphrase(ciphertext, passphrase, listId) {
	try {
		const key = getListKey(passphrase, listId);
		const bytes = CryptoJS.AES.decrypt(ciphertext, key);
		const result = bytes.toString(CryptoJS.enc.Utf8);
		return result ?? "";
	} catch {
		return "";
	}
}
