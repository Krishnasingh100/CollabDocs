"use client";
import { createAuthClient } from "@neondatabase/auth/next";
// Browser-side auth: OAuth buttons, sign-out, session hook.
export const authClient = createAuthClient();
