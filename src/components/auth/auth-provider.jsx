"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { NeonAuthUIProvider } from "@neondatabase/auth/react/ui";
import { authClient } from "@/lib/auth/client";
// Takes children, wires the Neon Auth prebuilt UI (sign-in/up forms, account
// and organization views, user button) to Next.js routing and this app's auth
// client. basePath "" serves the views at root routes (/sign-in, /sign-up...).
export function AuthProvider({ children }) {
  const router = useRouter();
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      basePath=""
      redirectTo="/documents"
      social={{ providers: ["google"] }}
      emailOTP
      emailVerification={{ otp: true }}
      organization
      account
      Link={Link}
      navigate={(href) => router.push(href)}
      replace={(href) => router.replace(href)}
    >
      {children}
      <Toaster position="top-center" richColors />
    </NeonAuthUIProvider>
  );
}
