import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a year value into an integer between 1900 and 2100.
 * Returns null when the value is empty, invalid, or out of range.
 */
export function parseYear(value) {
  if (value === undefined || value === null) return null;

  const str = String(value).trim();
  if (!str) return null;

  const num = Number.parseInt(str, 10);
  if (Number.isNaN(num)) return null;

  if (num < 1900 || num > 2100) return null;

  return num;
}

