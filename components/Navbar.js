"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Dynamic import supabase to avoid SSR issues
    import("../lib/supabaseClient").then(({ supabase }) => {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session || null);
      }).catch(() => {});

      const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession || null);
      });

      return () => listener.subscription.unsubscribe();
    }).catch(() => {});
  }, []);

  async function logout() {
    const { supabase } = await import("../lib/supabaseClient");
    await supabase.auth.signOut();
    router.push("/");
  }

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/recipes", label: "Recipes" },
    { href: "/list", label: "Lists" },
    { href: "/meal-planner", label: "Meal Planner" },
    { href: "/notes", label: "Notes" },
    { href: "/settings", label: "Settings" },
  ];

  // Hide navbar on home page if not logged in, and on login page
  // Also hide during SSR to prevent flash
  if (!mounted || (pathname === "/" && !session) || pathname === "/login") {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-inset-top">
      <div className="container mx-auto flex h-14 max-w-4xl items-center gap-2 px-4 sm:gap-4">
        {/* Mobile: hamburger menu */}
        <div className="md:hidden">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 min-h-[44px] min-w-[44px] text-foreground"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {navLinks.map(({ href, label }) => (
                <DropdownMenuItem key={href} asChild>
                  <Link
                    href={href}
                    className="flex min-h-[44px] items-center px-2 py-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop: horizontal nav */}
        <nav className="hidden md:flex items-center gap-2">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href}>
              <Button variant="ghost" size="sm" className="text-foreground min-h-[44px]">
                {label}
              </Button>
            </Link>
          ))}
        </nav>

        <Separator orientation="vertical" className="hidden md:block h-6" />
        <div className="ml-auto flex items-center gap-2">
          {!session ? (
            <Link href="/login">
              <Button size="sm" className="min-h-[44px]">Login</Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" onClick={logout} className="min-h-[44px]">
              Logout
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
