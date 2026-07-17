/**
 * Best-effort guess at a person's name from their LinkedIn profile URL slug,
 * e.g. "https://www.linkedin.com/in/jane-smith-04a1b2c9/" -> "Jane Smith".
 *
 * Used for stub contacts created via Bulk Add, where only a link is pasted
 * and no name is typed. The result is always just a starting point shown in
 * an editable field — never treated as confirmed — because LinkedIn slugs
 * are inconsistent (custom vanity slugs, non-English names, or a raw
 * auto-generated handle with no name in it at all). When we can't produce a
 * confident guess we return null and the caller falls back to a clear
 * placeholder instead of inventing something misleading.
 */
export function guessNameFromLinkedInUrl(rawUrl: string): string | null {
  let slug: string;
  try {
    const url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
    const match = url.pathname.match(/\/in\/([^/]+)/i);
    if (!match) return null;
    slug = decodeURIComponent(match[1]);
  } catch {
    return null;
  }

  const parts = slug.split("-").filter(Boolean);

  // LinkedIn appends an auto-generated id segment to most profile slugs
  // ("john-doe-04a1b2c9", "jane-smith-042938"). Strip trailing segments that
  // look like that id rather than a name word: pure digits, or a mixed
  // alphanumeric chunk that contains a digit (real name words don't).
  while (parts.length > 1) {
    const last = parts[parts.length - 1];
    const looksLikeGeneratedId = /^\d+$/.test(last) || (/^[a-z0-9]{6,}$/i.test(last) && /\d/.test(last));
    if (!looksLikeGeneratedId) break;
    parts.pop();
  }

  const words = parts.filter((p) => /[a-z]/i.test(p) && !/\d/.test(p));
  if (words.length === 0) return null;

  const name = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

  // Guard against degenerate results (a single stray letter, or a huge slug
  // that clearly isn't a name) rather than surfacing garbage as a "guess".
  if (name.replace(/\s/g, "").length < 2 || name.length > 60 || words.length > 5) return null;

  return name;
}
