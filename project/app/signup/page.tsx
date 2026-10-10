"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { User, Sms, Lock, InfoCircle, ArrowRight } from "iconsax-react";

export default function SignUpPage() {
  const router = useRouter();

  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to create account");
      }

      // Automatically redirect to dashboard upon account setup
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

      {/* Form Center */}
      <main className="flex-1 flex items-center justify-center my-8">
        <div className="w-full max-w-md">
          <Card className="border-border shadow-lg">
            <CardHeader className="space-y-1 text-center pb-6">
              <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-brand-subtle flex items-center justify-center text-brand-text">
                <User size="20" />
              </div>
              <CardTitle className="text-page-sm font-bold tracking-tight">Create your Workspace</CardTitle>
              <CardDescription className="text-muted-foreground">
                First time setup with username, email, and password
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
                  <label className="text-sm font-semibold text-foreground flex items-center justify-between" htmlFor="username">
                    <span>Username</span>
                    <span className="text-xs text-muted-foreground font-normal">Used for login</span>
                  </label>
                  <div className="relative">
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="alex_ventures"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
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
                  <label className="text-sm font-semibold text-foreground" htmlFor="email">
                    Email Address
                  </label>
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="alex@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                      disabled={loading}
                      className="pl-9"
                    />
                    <div className="absolute left-3 top-2.5 text-muted-foreground pointer-events-none">
                      <Sms size="18" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Min 4 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
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
                  {loading ? "Creating workspace..." : "Create workspace"}
                  {!loading && <ArrowRight size="18" className="ml-2" />}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-brand-text font-semibold hover:underline">
                    Sign in with username
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-4">
        © 2026 Nexus Platform Inc. Automated single-tenant provisioning.
      </footer>
    </div>
  );
}
