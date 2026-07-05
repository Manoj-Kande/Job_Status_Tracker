import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // By default Next.js treats dynamic (per-user, DB-backed) routes as
    // stale for 0 seconds in the client Router Cache, so every nav back
    // to a page you already visited (e.g. Applications -> Dashboard ->
    // back to Applications) re-hits the server and the DB again even if
    // you were just there. A short stale window lets the client reuse
    // that payload instead. Any mutation still forces a real refetch via
    // `router.refresh()` in our actions, so this doesn't risk showing
    // stale data after you actually change something.
    staleTimes: {
      dynamic: 30,
    },
    // Tree-shake these more aggressively so only the specific
    // components/functions actually imported end up in the client
    // bundle, instead of pulling in more of the package than is used.
    optimizePackageImports: ["recharts", "lucide-react", "date-fns"],
  },
};

export default nextConfig;
