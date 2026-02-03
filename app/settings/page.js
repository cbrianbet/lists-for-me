"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { user, profile, loading, error, saveProfile } = useProfile();

  const [displayName, setDisplayName] = useState("");
  const [ttsRate, setTtsRate] = useState(0.9);
  const [ttsPitch, setTtsPitch] = useState(1);
  const [ttsLang, setTtsLang] = useState("en-US");
  const [defaultListType, setDefaultListType] = useState("public");
  const [defaultListYear, setDefaultListYear] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!profile) return;

    setDisplayName(profile.display_name || "");
    setTtsRate(typeof profile.tts_rate === "number" ? profile.tts_rate : 0.9);
    setTtsPitch(typeof profile.tts_pitch === "number" ? profile.tts_pitch : 1);
    setTtsLang(profile.tts_lang || "en-US");
    setDefaultListType(profile.default_list_type || "public");
    setDefaultListYear(!!profile.default_list_year);

    if (profile.theme && profile.theme !== theme) {
      setTheme(profile.theme);
    }
  }, [profile, theme, setTheme]);

  async function handleSave() {
    try {
      setSaving(true);
      setSaveError("");
      await saveProfile({
        display_name: displayName || null,
        tts_rate: Number(ttsRate) || 0.9,
        tts_pitch: Number(ttsPitch) || 1,
        tts_lang: ttsLang || "en-US",
        theme: theme || "system",
        default_list_type: defaultListType,
        default_list_year: defaultListYear,
      });
    } catch (err) {
      setSaveError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Account section */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Account</h2>
              <div className="space-y-2">
                <Label>Email</Label>
                <p className="text-sm text-muted-foreground">
                  {user?.email || "Not signed in"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={80}
                />
              </div>
            </section>

            <Separator />

            {/* Preferences section */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold">Preferences</h2>

              <div className="space-y-2">
                <Label>Theme</Label>
                <Select
                  value={theme ?? "system"}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="ttsLang">Read-out language</Label>
                  <Select
                    id="ttsLang"
                    value={ttsLang}
                    onChange={(e) => setTtsLang(e.target.value)}
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="en-IN">English (India)</option>
                  </Select>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="ttsRate">Voice speed</Label>
                    <Input
                      id="ttsRate"
                      type="number"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={ttsRate}
                      onChange={(e) => setTtsRate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      1 is normal speed. Lower is slower.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ttsPitch">Voice pitch</Label>
                    <Input
                      id="ttsPitch"
                      type="number"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={ttsPitch}
                      onChange={(e) => setTtsPitch(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      1 is normal. Lower is deeper.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Default list type</Label>
                  <Select
                    value={defaultListType}
                    onChange={(e) => setDefaultListType(e.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="encrypted">Encrypted</option>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Used as the default when creating new lists.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="defaultListYear"
                    type="checkbox"
                    checked={defaultListYear}
                    onChange={(e) => setDefaultListYear(e.target.checked)}
                    className="h-4 w-4 rounded border"
                  />
                  <Label htmlFor="defaultListYear" className="text-sm font-normal">
                    Auto-fill current year for new lists and items
                  </Label>
                </div>
              </div>
            </section>

            <Separator />

            {saveError && (
              <div className="text-sm text-destructive">{saveError}</div>
            )}

            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={handleSignOut}
                disabled={saving}
              >
                Sign out
              </Button>
              <Button onClick={handleSave} disabled={saving || loading || !user}>
                {saving ? "Saving..." : "Save settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
