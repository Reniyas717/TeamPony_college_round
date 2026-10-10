"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Lock, User, InfoCircle, ArrowRight } from "iconsax-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
          Enter your username or email to access your workspace
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-status-danger-bg text-status-danger-fg border border-status-danger-border flex items-start gap-2 text-sm">
              <InfoCircle size="18" className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

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
                disabled={loading}
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
                disabled={loading}
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
            disabled={loading}
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
