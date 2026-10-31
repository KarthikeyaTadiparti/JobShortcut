import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function encodeJobId(id: number | string): string {
  try {
    return btoa(String(id));
  } catch {
    return String(id);
  }
}

export function decodeJobId(encodedId: string): number | null {
  if (!encodedId) return null;
  try {
    const raw = decodeURIComponent(encodedId);
    const decoded = atob(raw);
    const num = Number(decoded);
    if (!isNaN(num) && num > 0) return num;
  } catch {
    // If base64 decode fails, check if plain number was passed
  }
  const directNum = Number(encodedId);
  if (!isNaN(directNum) && directNum > 0) return directNum;
  return null;
}
