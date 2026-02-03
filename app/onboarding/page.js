"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export default function OnboardingPage() {
  const router = useRouter();
  const [theme, setTheme] = useState("system");
  const [ttsLang, setTtsLang] = useState("en-US");

  async function finish() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    await supabase.from("profiles").upsert({
      id: user.id,
      has_onboarded: true,
      theme,
      tts_lang: ttsLang,
    });
    router.push("/");
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mx-auto max-w-lg py-12">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome 🎉</CardTitle>
            <CardDescription>
              We&apos;ll set you up for offline-first recipes and lists.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-sm text-muted-foreground">
              Your data syncs when online and works offline. Choose a few preferences to get started.
            </p>

            <div className="space-y-2">
              <Label htmlFor="onboardingTheme">Preferred theme</Label>
              <Select
                id="onboardingTheme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="system">Match system</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="onboardingTtsLang">Read-out language</Label>
              <Select
                id="onboardingTtsLang"
                value={ttsLang}
                onChange={(e) => setTtsLang(e.target.value)}
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="en-IN">English (India)</option>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={finish}>Finish Setup</Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
