"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validateForm() {
    const newErrors = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (mode === "signup" && password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function signInWithGoogle() {
    setErrors({});
    const { supabase } = await import("../../lib/supabaseClient");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) setErrors({ general: error.message });
  }

  useEffect(() => {
    let unsub = () => {};

    import("../../lib/supabaseClient")
      .then(({ supabase }) => {
        supabase.auth.getSession().then(({ data }) => {
          setSession(data.session || null);
          if (data.session) router.push("/");
        }).catch(() => {});

        const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
          setSession(newSession || null);
          if (newSession) router.push("/");
        });
        unsub = () => listener.subscription.unsubscribe();
      })
      .catch(() => {});

    return () => unsub();
  }, [router]);

  async function signUp() {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    const { supabase } = await import("../../lib/supabaseClient");
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setErrors({ general: error.message });
    } else {
      setErrors({ success: "Account created! Check your email for verification." });
      setPassword("");
    }
  }

  async function signIn() {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    const { supabase } = await import("../../lib/supabaseClient");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setErrors({ general: error.message });
    } else {
      router.push("/");
    }
  }

  async function signOut() {
    const { supabase } = await import("../../lib/supabaseClient");
    await supabase.auth.signOut();
    setSession(null);
    setErrors({ success: "Signed out successfully" });
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mx-auto max-w-md space-y-6 py-12">
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">
              {mode === "signin" ? "Sign In" : "Sign Up"}
            </CardTitle>
            <CardDescription>
              {mode === "signin"
                ? "Enter your credentials to access your account"
                : "Create an account to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.general && (
              <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.general}</span>
              </div>
            )}
            {errors.success && (
              <div className="rounded-md border border-green-500 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                {errors.success}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                type="email"
                disabled={!!session || loading}
                aria-invalid={!!errors.email}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                placeholder={mode === "signup" ? "At least 6 characters" : "Enter your password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                type="password"
                disabled={!!session || loading}
                aria-invalid={!!errors.password}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {!session && (
              <>
                {mode === "signin" ? (
                  <Button
                    onClick={signIn}
                    disabled={loading || !email.trim() || !password}
                    className="w-full"
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                ) : (
                  <Button
                    onClick={signUp}
                    disabled={loading || !email.trim() || !password}
                    className="w-full"
                  >
                    {loading ? "Signing up..." : "Sign Up"}
                  </Button>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button variant="outline" onClick={signInWithGoogle} className="w-full" disabled={loading}>
                  Continue with Google
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setErrors({});
                  }}
                  className="w-full"
                  disabled={loading}
                >
                  {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
                </Button>
              </>
            )}

            {session && (
              <Button variant="destructive" onClick={signOut} className="w-full">
                Sign Out
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
