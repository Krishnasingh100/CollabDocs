import { auth } from "@/lib/auth/server";

// Proxies every Managed Better Auth API through /api/auth/*.
export const { GET, POST } = auth.handler();
