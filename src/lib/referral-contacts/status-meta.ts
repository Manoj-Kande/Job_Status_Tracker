/**
 * Referral Contact statuses are stored per-user in the DB (see
 * ReferralContactStatus) rather than as a Prisma enum, so users can add
 * their own custom stages. This file only holds the seed list for new
 * users and the visual metadata (badge variant) for the built-ins.
 * Custom statuses fall back to a neutral variant.
 */

type BadgeVariant = "default" | "secondary" | "outline" | "success" | "warning" | "destructive";

export const DEFAULT_REFERRAL_STATUSES = [
  "Can Ask Referral",
  "Already Asked",
  "Positive Response",
  "No Response",
  "Rejected",
  "Follow Up Later",
  "Can Apply Next Time",
] as const;

export const BUILTIN_STATUS_VARIANT: Record<string, BadgeVariant> = {
  "Can Ask Referral": "outline",
  "Already Asked": "warning",
  "Positive Response": "success",
  "No Response": "secondary",
  Rejected: "destructive",
  "Follow Up Later": "warning",
  "Can Apply Next Time": "default",
};

export function variantForStatus(label: string): BadgeVariant {
  return BUILTIN_STATUS_VARIANT[label] ?? "default";
}

/** bg/fg hex pairs for the dot-badge look, matching the original demo mockup. */
const BUILTIN_STATUS_COLORS: Record<string, [string, string]> = {
  "Can Ask Referral": ["#eef0ff", "#4b4fc4"],
  "Already Asked": ["#fdf3e0", "#9a6a00"],
  "Positive Response": ["#e6f6ee", "#1a7a4c"],
  "No Response": ["#f4f4f8", "#6b6d80"],
  Rejected: ["#fdeceb", "#c23b34"],
  "Follow Up Later": ["#fdf3e0", "#9a6a00"],
  "Can Apply Next Time": ["#eef4fd", "#2b6cb0"],
};

/** Fallback palette for custom statuses, picked deterministically from the label so the same
 *  custom status always renders the same color without needing to store one in the DB. */
const CUSTOM_STATUS_PALETTE: [string, string][] = [
  ["#efedfd", "#5b52d6"],
  ["#e8f7f2", "#0f8a6a"],
  ["#fdeef7", "#b23f8a"],
  ["#eef6fd", "#1c7ed6"],
  ["#fdf1e8", "#c2661a"],
  ["#f1f0eb", "#6b6b47"],
];

export function colorsForStatus(label: string): [string, string] {
  if (BUILTIN_STATUS_COLORS[label]) return BUILTIN_STATUS_COLORS[label];
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return CUSTOM_STATUS_PALETTE[hash % CUSTOM_STATUS_PALETTE.length];
}

export const SORT_OPTIONS = [
  { value: "company-asc", label: "Company (A–Z)" },
  { value: "company-desc", label: "Company (Z–A)" },
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "recent-added", label: "Recently Added" },
  { value: "recent-updated", label: "Recently Updated" },
  { value: "rank", label: "My Ranking (Custom)" },
] as const;

export type ReferralSortKey = (typeof SORT_OPTIONS)[number]["value"];

/** Fields the "Custom sort..." panel can sort by (primary + tiebreak). */
export const CUSTOM_SORT_FIELDS = [
  { value: "company", label: "Company" },
  { value: "name", label: "Name" },
  { value: "jobTitle", label: "Job Title" },
  { value: "status", label: "Status" },
  { value: "createdAt", label: "Date Added" },
  { value: "updatedAt", label: "Last Updated" },
] as const;

export type CustomSortField = (typeof CUSTOM_SORT_FIELDS)[number]["value"];
export type CustomSortDir = "asc" | "desc";
export type CustomSortConfig = {
  field1: CustomSortField;
  dir1: CustomSortDir;
  field2: CustomSortField | "none";
  dir2: CustomSortDir;
};
