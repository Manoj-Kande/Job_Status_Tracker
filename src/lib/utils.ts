import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parses a "YYYY-MM-DD" string (from an <input type="date">) as a LOCAL
 * calendar date, instead of `new Date("YYYY-MM-DD")` which parses it as
 * UTC midnight and can silently shift a day in timezones behind UTC.
 */
export function parseDateInput(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Extracts just the profile slug from a LinkedIn URL for compact display,
 *  e.g. "https://www.linkedin.com/in/priya-nair-8a2b1/" -> "priya-nair-8a2b1". */
export function linkedInHandle(url: string): string {
  const cleaned = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "");
  const match = cleaned.match(/linkedin\.com\/(?:in|company)\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : cleaned;
}

/** Formats a Date (or null/undefined) into a "YYYY-MM-DD" string for date inputs. */
export function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
