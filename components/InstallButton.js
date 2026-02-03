"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function InstallButton() {
  const [promptEvent, setPromptEvent] = useState(null);

  useEffect(() => {
    function handler(e) {
      e.preventDefault();
      setPromptEvent(e);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!promptEvent) return null;

  return (
    <Button
      onClick={async () => {
        promptEvent.prompt();
        setPromptEvent(null);
      }}
      className="w-fit"
    >
      <Download className="mr-2 h-4 w-4" />
      Install App
    </Button>
  );
}
