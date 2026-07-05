import "server-only";
import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/** Retries once/twice on Neon's "compute waking up" transient connection error (P1001). */
async function withDbRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      const isConnErr = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P1001";
      if (!isConnErr || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw new Error("unreachable");
}

/**
 * Resolves the authenticated Clerk session to a local `User` row.
 * The webhook (see api/webhooks/clerk) is the primary sync path; this
 * function is a fallback for first-login race conditions where a
 * request lands before the webhook fires. It NEVER accepts an id
 * from the client — the Clerk session is the only source of identity.
 *
 * Wrapped in React's `cache()` so multiple query helpers calling this
 * within the same request/render pass share one DB lookup instead of
 * each re-querying for the same user (this was previously a real
 * source of redundant round-trips on pages that call several query
 * functions, e.g. the dashboard).
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const existing = await withDbRetry(() => prisma.user.findUnique({ where: { clerkUserId } }));
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  return withDbRetry(() =>
    prisma.user.upsert({
      where: { clerkUserId },
      update: {},
      create: {
        clerkUserId,
        email,
        fullName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
      },
    })
  );
});

/** Use inside Server Actions / Route Handlers that require a signed-in user. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
