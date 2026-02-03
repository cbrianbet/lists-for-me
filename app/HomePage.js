"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Dynamic import to avoid SSR issues
    import("../lib/supabaseClient").then(({ supabase }) => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setIsRedirecting(true);
          router.push("/dashboard");
        }
      }).catch(() => {
        // Ignore errors - just show landing page
      });
    }).catch(() => {
      // Ignore supabase import errors
    });
  }, [router]);

  if (isRedirecting) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-muted-foreground">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <header className="border-b bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">Recipes & Lists</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="min-h-[44px] min-w-[44px] flex items-center px-4 py-2 text-sm hover:underline">
              Login
            </Link>
            <Link 
              href="/login" 
              className="min-h-[44px] flex items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto max-w-6xl px-4 py-16 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Your recipes, lists, and meal plans
            <span className="block text-primary">work offline, sync everywhere</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Store your favorite recipes, build smart grocery lists, and plan meals with confidence.
            Everything encrypted, everything offline-ready.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link 
              href="/login" 
              className="min-h-[48px] flex items-center justify-center rounded-md bg-primary px-6 py-3 text-lg text-primary-foreground hover:bg-primary/90"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
            <h3 className="mb-2 font-semibold">Recipe Library</h3>
            <p className="text-sm text-muted-foreground">
              Save and organize all your recipes with ingredients, steps, and cook times.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
            <h3 className="mb-2 font-semibold">Smart Grocery Lists</h3>
            <p className="text-sm text-muted-foreground">
              Build grocery lists that auto-organize by store section.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
            <h3 className="mb-2 font-semibold">Meal Planning</h3>
            <p className="text-sm text-muted-foreground">
              Plan your weekly meals on a calendar. Export to PDF or calendar app.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
            <h3 className="mb-2 font-semibold">Works Offline</h3>
            <p className="text-sm text-muted-foreground">
              PWA technology means everything works without internet.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
            <h3 className="mb-2 font-semibold">End-to-End Encrypted</h3>
            <p className="text-sm text-muted-foreground">
              Your recipes and lists are encrypted before leaving your device.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
            <h3 className="mb-2 font-semibold">Voice Dictation</h3>
            <p className="text-sm text-muted-foreground">
              Dictate recipe steps hands-free while cooking.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/50 py-16">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to get started?</h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Create your free account and start organizing your recipes today.
          </p>
          <Link 
            href="/login" 
            className="rounded-md bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
          >
            Sign Up Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          © 2026 Recipes & Lists PWA. Built with Next.js and Supabase.
        </div>
      </footer>
    </div>
  );
}
