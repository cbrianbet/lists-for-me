import { useRef, useState } from "react";

export function useSpeech() {
	const [listening, setListening] = useState(false);
	const recognitionRef = useRef(null);

	if (typeof window !== "undefined" && "webkitSpeechRecognition" in window && !recognitionRef.current) {
		const SpeechRecognition = window.webkitSpeechRecognition;
		const recognition = new SpeechRecognition();
		recognition.continuous = true;
		recognition.interimResults = false;
		recognition.lang = "en-US";
		recognitionRef.current = recognition;
	}

	const start = (onResult) => {
		if (!recognitionRef.current) return;
		setListening(true);

		recognitionRef.current.onresult = (event) => {
			const transcript = event.results[event.results.length - 1][0].transcript.trim();
			onResult(transcript);
		};

		recognitionRef.current.start();
	};

	const stop = () => {
		if (!recognitionRef.current) return;
		recognitionRef.current.stop();
		setListening(false);
	};

	return { start, stop, listening };
}
