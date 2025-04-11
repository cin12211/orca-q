import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0; // Generate a random integer between 0 and 15
    const value = char === "x" ? random : (random & 0x3) | 0x8; // For 'y', ensure it matches RFC 4122
    return value.toString(16); // Convert to hexadecimal
  });
}
