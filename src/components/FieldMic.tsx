"use client";

import { useEffect, useRef, useState } from "react";
import { DischargeSummary } from "@/lib/schema";

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

type MicState = "idle" | "listening" | "cleaning";

interface Props {
  fieldKey: string;               // schema key, e.g. "diagnosis"
  label: string;                  // human label, e.g. "Diagnosis"
  value: string;
  onChange: (next: string) => void;
  getSummary?: () => Partial<DischargeSummary>; // snapshot of other fields for context
}

export default function FieldMic({ fieldKey, label, value, onChange, getSummary }: Props) {
  const [micState, setMicState] = useState<MicState>("idle");
  const [supported, setSupported] = useState(true);
  const [interim, setInterim]   = useState("");
  // Whether we'll REPLACE the field value or APPEND to it
  const [mode, setMode]         = useState<"replace" | "append">("replace");

  const recRef      = useRef<ISpeechRecognition | null>(null);
  const dictatedRef = useRef("");   // text captured this session
  const valueRef    = useRef(value);
  valueRef.current  = value;

  useEffect(() => {
    const rec = getRecognition();
    if (!rec) { setSupported(false); return; }

    rec.lang            = "en-IN";
    rec.continuous      = true;
    rec.interimResults  = true;

    rec.onresult = (e) => {
      let fin = "", inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin   += r[0].transcript + " ";
        else           inter += r[0].transcript;
      }
      if (fin) dictatedRef.current += fin;
      setInterim(inter);
    };

    rec.onerror = () => { setInterim(""); };
    rec.onend   = () => {
      setInterim("");
      void finishAndClean();
    };

    recRef.current = rec;
    return () => { try { rec.stop(); } catch { /* noop */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finishAndClean() {
    const dictated = dictatedRef.current.trim();
    dictatedRef.current = "";
    if (!dictated) { setMicState("idle"); return; }

    // Build the text we'll send: replace or append
    const existing = valueRef.current.trim();
    const textToClean = mode === "replace" || !existing
      ? dictated
      : `${existing} ${dictated}`;

    // Optimistic: show raw immediately so nothing is lost
    onChange(textToClean);
    setMicState("cleaning");

    try {
      const currentSummary = getSummary ? getSummary() : undefined;
      const res = await fetch("/api/clean-field", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToClean,
          fieldKey,
          label,
          currentSummary,
        }),
      });
      const data = await res.json();
      if (data?.text) onChange(data.text);
    } catch {
      // keep the optimistic raw text
    } finally {
      setMicState("idle");
    }
  }

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    const rec = recRef.current;
    if (!rec || micState === "cleaning") return;

    if (micState === "listening") {
      rec.stop();
    } else {
      dictatedRef.current = "";
      setInterim("");
      // Auto-decide mode: if field has content, default to append;
      // user can toggle the mode button before speaking
      try {
        rec.start();
        setMicState("listening");
      } catch { /* already running */ }
    }
  }

  if (!supported) return null;

  const hasContent = value.trim().length > 0;

  return (
    <div className="field-mic-wrap">
      {/* Mode toggle — only shown when field has content and we're idle */}
      {hasContent && micState === "idle" && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setMode(m => m === "replace" ? "append" : "replace");
          }}
          title={mode === "replace" ? "Will replace existing text" : "Will append to existing text"}
          className="field-mic-mode"
          data-mode={mode}
        >
          {mode === "replace" ? (
            // Replace icon: arrow pointing to field
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 8a6 6 0 1 1 12 0A6 6 0 0 1 2 8zm6-4a.5.5 0 0 0-.5.5v3.793L5.854 6.646a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l2.5-2.5a.5.5 0 0 0-.708-.708L8.5 8.293V4.5A.5.5 0 0 0 8 4z"/>
            </svg>
          ) : (
            // Append icon: plus
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
          )}
          <span>{mode === "replace" ? "Replace" : "Append"}</span>
        </button>
      )}

      {/* Main mic button */}
      <button
        type="button"
        onClick={toggle}
        disabled={micState === "cleaning"}
        title={
          micState === "listening" ? "Stop — AI will correct"
          : micState === "cleaning" ? "Correcting with AI…"
          : `Dictate (${mode})`
        }
        aria-label="Dictate into this field"
        className="field-mic"
        data-state={micState}
      >
        {micState === "listening" && <span className="field-mic-ring" />}

        {micState === "cleaning" ? (
          <span className="field-mic-spinner" />
        ) : micState === "listening" ? (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" className="relative">
            <rect x="2" y="2" width="8" height="8" rx="1.5" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative">
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        )}

        <span className="relative">
          {micState === "cleaning" ? "AI…"
           : micState === "listening" ? "Stop"
           : "Speak"}
        </span>
      </button>

      {/* Live interim transcript */}
      {micState === "listening" && interim && (
        <span className="field-mic-interim">&ldquo;{interim}&rdquo;</span>
      )}
    </div>
  );
}
