"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { resendOtpAction, verifyOtpAction } from "./actions";
export function VerifyEmailForm({ initialEmail }) {
  const [state, formAction, isPending] = useActionState(verifyOtpAction, null);
  const [resendState, resendAction, resendPending] = useActionState(resendOtpAction, null);
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Check your email</CardTitle>
        <CardDescription>Enter the 6-digit code we sent you.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={initialEmail ?? ""}
              placeholder="you@example.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Code</Label>
            <InputOTP maxLength={6} name="otp">
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {state?.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Verifying…" : "Verify email"}
          </Button>
        </form>
        <form action={resendAction} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={initialEmail ?? ""}
              placeholder="you@example.com"
              aria-label="Email for new code"
              className="flex-1"
            />
            <Button type="submit" variant="outline" disabled={resendPending}>
              {resendPending ? "Sending…" : "Resend"}
            </Button>
          </div>
          {resendState?.error && (
            <p role="alert" className="text-sm text-destructive">
              {resendState.error}
            </p>
          )}
          {resendState?.sent && (
            <p className="text-sm text-muted-foreground">New code sent. Check your inbox.</p>
          )}
        </form>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
