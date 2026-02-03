"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function finishLogin() {
      const { supabase } = await import("@/lib/supabaseClient");
      // Supabase automatically reads the OAuth code from the URL
      await supabase.auth.getSession();
      router.push("/");
    }

    finishLogin();
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-muted-foreground">Signing you in...</p>
    </div>
  );
}
