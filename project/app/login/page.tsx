"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Lock, User, InfoCircle, ArrowRight } from "iconsax-react";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18">
      <path
        fill="#EA4335"
        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
      />
      <path
        fill="#FBBC05"
        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  const urlError = searchParams.get("error");

  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const displayError = error || urlError;

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;
      
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "https://www.googleapis.com/auth/meetings.space.created",
          queryParams: {
            access_type: "offline",
            include_granted_scopes: "true",
            prompt: "consent",
          },
          redirectTo: redirectUrl,
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to initiate Google sign-in.");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please enter your username/email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Invalid username or password");
      }

      // Successful login -> push to dashboard or redirect URL
      router.push(redirectTo);
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border shadow-lg">
      <CardHeader className="space-y-1 text-center pb-6">
        <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-brand-subtle flex items-center justify-center text-brand-text">
          <Lock size="20" />
        </div>
        <CardTitle className="text-page-sm font-bold tracking-tight">Sign in to Nexus</CardTitle>
        <CardDescription className="text-muted-foreground">
          Enter your username or continue with Google to access your workspace
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {displayError && (
            <div className="p-3 rounded-md bg-status-danger-bg text-status-danger-fg border border-status-danger-border flex items-start gap-2 text-sm">
              <InfoCircle size="18" className="shrink-0 mt-0.5" />
              <span>{displayError}</span>
            </div>
          )}

          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full h-11 text-base font-semibold gap-2.5 border-border-strong hover:bg-accent"
          >
            <GoogleIcon />
            <span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
          </Button>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-border" />
            <span className="bg-card px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider relative">
              Or sign in with password
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground flex items-center justify-between" htmlFor="identifier">
              <span>Username or Email</span>
            </label>
            <div className="relative">
              <Input
                id="identifier"
                name="identifier"
                type="text"
                placeholder="alex_ventures or alex@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
                disabled={loading || googleLoading}
                className="pl-9"
              />
              <div className="absolute left-3 top-2.5 text-muted-foreground pointer-events-none">
                <User size="18" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground" htmlFor="password">
                Password
              </label>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading || googleLoading}
                className="pl-9"
              />
              <div className="absolute left-3 top-2.5 text-muted-foreground pointer-events-none">
                <Lock size="18" />
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            variant="primary"
            className="w-full h-11 text-base shadow-sm font-semibold"
            disabled={loading || googleLoading}
          >
            {loading ? "Signing in..." : "Sign in"}
            {!loading && <ArrowRight size="18" className="ml-2" />}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account yet?{" "}
            <Link href="/signup" className="text-brand-text font-semibold hover:underline">
              Create workspace
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-background p-4 md:p-8">
      {/* Top Bar */}
      <header className="flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-brand rounded-sm flex items-center justify-center transition-transform group-hover:scale-105">
            <span className="text-brand-foreground font-display font-bold text-xl leading-none">N</span>
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">Nexus</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Form Center with Suspense Boundary for useSearchParams */}
      <main className="flex-1 flex items-center justify-center my-8">
        <div className="w-full max-w-md">
          <React.Suspense
            fallback={
              <Card className="border-border shadow-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">Loading workspace...</p>
              </Card>
            }
          >
            <LoginForm />
          </React.Suspense>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-4">
        © 2026 Nexus Platform Inc. Secure Single-Tenant Architecture.
      </footer>
    </div>
  );
}
