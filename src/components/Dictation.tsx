"use client";

import { useEffect, useRef, useState } from "react";

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

export default function Dictation({
  onAppend,
}: {
  onAppend: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [interim, setInterim] = useState("");
  const recRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    const rec = getRecognition();
    if (!rec) { setSupported(false); return; }
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalChunk += r[0].transcript;
        else interimChunk += r[0].transcript;
      }
      if (finalChunk) onAppend(finalChunk.trim() + " ");
      setInterim(interimChunk);
    };
    rec.onerror = () => { setListening(false); setInterim(""); };
    rec.onend   = () => { setListening(false); setInterim(""); };

    recRef.current = rec;
    return () => { try { rec.stop(); } catch { /* noop */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      try { rec.start(); setListening(true); } catch { /* already started */ }
    }
  }

  if (!supported) {
    return (
      <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
        Voice input needs Chrome or Edge. You can still type your notes below.
      </div>
    );
  }

  const bgStyle = listening
    ? { background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 4px 14px -4px rgba(220,38,38,0.5)" }
    : { background: "linear-gradient(135deg, #2f8765, #1f6f52)", boxShadow: "0 4px 14px -4px rgba(19,61,47,0.5)" };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        className="relative inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition active:scale-95"
        style={bgStyle}
        aria-label={listening ? "Stop dictation" : "Start dictation"}
      >
        {listening && (
          <span className="absolute inset-0 animate-pulse-ring rounded-xl bg-red-400 opacity-30" />
        )}
        {listening ? (
          <svg width="13" height="13" viewBox="0 0 12 12" fill="currentColor" className="relative shrink-0">
            <rect x="2" y="2" width="8" height="8" rx="1.5" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative shrink-0">
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        )}
        <span className="relative">{listening ? "Stop" : "Dictate"}</span>
      </button>

      {(interim || listening) && (
        <p className="min-w-0 truncate text-sm">
          {interim ? (
            <span className="italic text-[var(--green-600)]">&ldquo;{interim}&rdquo;</span>
          ) : (
            <span className="font-medium text-red-500">Listening&hellip; speak now</span>
          )}
        </p>
      )}
    </div>
  );
}
