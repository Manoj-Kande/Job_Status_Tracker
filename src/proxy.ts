import { clerkMiddleware } from "@clerk/nextjs/server";

// No routes are force-protected here. Browsing every page (dashboard,
// applications, etc.) works signed out. Auth is only required at the
// point of actually writing data - enforced in src/lib/auth.ts's
// requireUser(), which every Server Action calls before touching the DB.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|.*\\.(?:html?|css|js|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
