import { useCallback, useRef, useState } from "react";

/**
 * Text-to-speech hook using Web Speech API.
 * Returns { speak, stop, speaking } for reading content aloud.
 */
export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const synthRef = useRef(null);
  const utteranceRef = useRef(null);

  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    synth.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text, options = {}) => {
    if (typeof window === "undefined" || !text?.trim()) return;

    stop();

    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.voice = voices[5];
    utterance.rate = options.rate ?? 0.9;
    utterance.pitch = 0;
    utterance.volume = options.volume ?? 1;
    utterance.lang = options.lang ?? "en-US";

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    utteranceRef.current = utterance;
    synthRef.current = synth;
    synth.speak(utterance);
    setSpeaking(true);
  }, [stop]);

  return { speak, stop, speaking };
}
