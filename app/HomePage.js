"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChefHat, ListTodo, Calendar, Shield, WifiOff, Mic } from "lucide-react";

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
            <span className="text-xl font-bold tracking-tight">Kitchen Sync</span>
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
      <section className="container mx-auto max-w-6xl px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Recipes, lists & meal plans — in sync
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Your kitchen,
            <span className="block text-primary">finally in sync.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Save recipes, build grocery lists that sort themselves, and plan meals without the chaos.
            Works offline. Stays private. No subscription.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
            <Link 
              href="/login" 
              className="min-h-[48px] flex items-center justify-center rounded-md bg-primary px-6 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="group rounded-xl border bg-card p-6 text-card-foreground shadow transition-colors hover:border-primary/30">
            <ChefHat className="mb-3 h-8 w-8 text-primary" />
            <h3 className="mb-2 font-semibold">Recipe Library</h3>
            <p className="text-sm text-muted-foreground">
              Save your favorites with ingredients, steps, and cook times. Read recipes aloud while your hands are covered in flour.
            </p>
          </div>

          <div className="group rounded-xl border bg-card p-6 text-card-foreground shadow transition-colors hover:border-primary/30">
            <ListTodo className="mb-3 h-8 w-8 text-primary" />
            <h3 className="mb-2 font-semibold">Smart Grocery Lists</h3>
            <p className="text-sm text-muted-foreground">
              Add items as you think of them. We sort by store section so you don't zigzag the aisles.
            </p>
          </div>

          <div className="group rounded-xl border bg-card p-6 text-card-foreground shadow transition-colors hover:border-primary/30">
            <Calendar className="mb-3 h-8 w-8 text-primary" />
            <h3 className="mb-2 font-semibold">Meal Planning</h3>
            <p className="text-sm text-muted-foreground">
              Plan the week on a calendar. Export to PDF or add to your calendar app. One less "what's for dinner?" moment.
            </p>
          </div>

          <div className="group rounded-xl border bg-card p-6 text-card-foreground shadow transition-colors hover:border-primary/30">
            <WifiOff className="mb-3 h-8 w-8 text-primary" />
            <h3 className="mb-2 font-semibold">Works Offline</h3>
            <p className="text-sm text-muted-foreground">
              Spotty signal in the produce aisle? No problem. Your lists and recipes are there when you need them.
            </p>
          </div>

          <div className="group rounded-xl border bg-card p-6 text-card-foreground shadow transition-colors hover:border-primary/30">
            <Shield className="mb-3 h-8 w-8 text-primary" />
            <h3 className="mb-2 font-semibold">Private by Default</h3>
            <p className="text-sm text-muted-foreground">
              Encrypt sensitive lists with a passphrase. Your secret recipes stay secret.
            </p>
          </div>

          <div className="group rounded-xl border bg-card p-6 text-card-foreground shadow transition-colors hover:border-primary/30">
            <Mic className="mb-3 h-8 w-8 text-primary" />
            <h3 className="mb-2 font-semibold">Voice Dictation</h3>
            <p className="text-sm text-muted-foreground">
              Dictate recipe steps hands-free. Because washing your hands between every step is already enough.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/50 py-16">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to get in sync?</h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Free to start. No credit card. Your kitchen will thank you.
          </p>
          <Link 
            href="/login" 
            className="inline-flex min-h-[48px] items-center justify-center rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign Up Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          © 2026 Kitchen Sync. Built with Next.js and Supabase.
        </div>
      </footer>
    </div>
  );
}
