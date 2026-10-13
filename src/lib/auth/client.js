"use client";
import { createAuthClient } from "@neondatabase/auth/next";
// Browser auth client for OAuth, sign-out, and session hook. Returns session UI state.
export const authClient = createAuthClient();
