"use client";

import { useEffect, useRef, useState } from "react";

// Per-field voice + AI clean-up.
// Flow: tap mic -> speak -> tap stop. The dictated text is sent to Groq, which
// corrects medical spelling/grammar/format, and the cleaned result is written
// into THIS field. The doctor never loses words — on any error we keep the raw
// transcript.

type SpeechRecognitionResult = {
  0: { transcript: string };
  isFinal: boolean;
};
type SpeechRecognitionEvent = {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResult };
};
interface ISpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getRecognition(): ISpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

type State = "idle" | "listening" | "cleaning";

export default function FieldMic({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [state, setState] = useState<State>("idle");
  const [supported, setSupported] = useState(true);
  const recRef = useRef<ISpeechRecognition | null>(null);
  // text captured during the current dictation session
  const dictatedRef = useRef("");
  // freshest field value (avoids stale closure when appending)
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const rec = getRecognition();
    if (!rec) {
      setSupported(false);
      return;
    }
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = false;

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) dictatedRef.current += r[0].transcript + " ";
      }
    };
    rec.onerror = () => {
      // surface nothing; just stop. onend handles cleanup.
    };
    rec.onend = () => {
      // when recognition ends (user stop or silence), run AI clean-up
      void finishAndClean();
    };

    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finishAndClean() {
    const dictated = dictatedRef.current.trim();
    dictatedRef.current = "";
    if (!dictated) {
      setState("idle");
      return;
    }

    // append dictated onto existing field text
    const base = valueRef.current;
    const sep = base && !/\s$/.test(base) ? " " : "";
    const combined = (base + sep + dictated).trim();

    // optimistic: show raw immediately so nothing is lost, then clean
    onChange(combined);
    setState("cleaning");
    try {
      const res = await fetch("/api/clean-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: combined, label }),
      });
      const data = await res.json();
      if (data?.text) onChange(data.text);
    } catch {
      /* keep the raw combined text */
    } finally {
      setState("idle");
    }
  }

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    const rec = recRef.current;
    if (!rec || state === "cleaning") return;
    if (state === "listening") {
      rec.stop(); // onend -> finishAndClean
    } else {
      dictatedRef.current = "";
      try {
        rec.start();
        setState("listening");
      } catch {
        /* already started */
      }
    }
  }

  if (!supported) return null;

  const btnText =
    state === "cleaning" ? "AI…" : state === "listening" ? "Stop" : "Speak";

  return (
    <button
      type="button"
      onClick={toggle}
      title={
        state === "listening"
          ? "Stop & auto-correct"
          : state === "cleaning"
          ? "Correcting…"
          : "Dictate — AI auto-corrects"
      }
      aria-label="Dictate into this field, AI auto-corrects"
      className="field-mic"
      data-state={state}
    >
      {state === "listening" && <span className="field-mic-ring" />}
      {state === "cleaning" ? (
        <span className="field-mic-spinner" />
      ) : state === "listening" ? (
        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill="currentColor"
          className="relative"
        >
          <rect x="2" y="2" width="8" height="8" rx="1.5" />
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="relative"
        >
          <rect x="9" y="2" width="6" height="11" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      )}
      <span className="relative">{btnText}</span>
    </button>
  );
}
