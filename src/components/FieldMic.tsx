"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

type MicState = "idle" | "listening" | "cleaning" | "done";

interface Props {
  fieldKey: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  getSummary?: () => Partial<DischargeSummary>;
}

export default function FieldMic({ fieldKey, label, value, onChange, getSummary }: Props) {
  const [micState, setMicState]   = useState<MicState>("idle");
  const [supported, setSupported] = useState(true);
  const [interim, setInterim]     = useState("");
  const [mode, setMode]           = useState<"replace" | "append">("replace");
  const [rawSnap, setRawSnap]     = useState("");
  const [cleanSnap, setCleanSnap] = useState("");

  // For portal positioning
  const btnRef   = useRef<HTMLButtonElement>(null);
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number; width: number } | null>(null);

  const recRef      = useRef<ISpeechRecognition | null>(null);
  const dictatedRef = useRef("");
  const valueRef    = useRef(value);
  valueRef.current  = value;

  useEffect(() => {
    const rec = getRecognition();
    if (!rec) { setSupported(false); return; }

    rec.lang           = "en-IN";
    rec.continuous     = true;
    rec.interimResults = true;

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
    rec.onend   = () => { setInterim(""); void finishAndClean(); };

    recRef.current = rec;
    return () => { try { rec.stop(); } catch { /* noop */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalculate bubble position when it should show
  useEffect(() => {
    if ((micState === "listening" || micState === "cleaning" || micState === "done") && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setBubblePos({
        top:   r.bottom + window.scrollY + 6,
        left:  Math.max(8, r.right + window.scrollX - 300), // right-align, min 8px from left edge
        width: 300,
      });
    } else {
      setBubblePos(null);
    }
  }, [micState, interim]);

  async function finishAndClean() {
    const dictated = dictatedRef.current.trim();
    dictatedRef.current = "";
    if (!dictated) { setMicState("idle"); return; }

    const existing    = valueRef.current.trim();
    const textToClean = mode === "replace" || !existing
      ? dictated
      : `${existing} ${dictated}`;

    onChange(textToClean);
    setRawSnap(dictated);
    setCleanSnap("");
    setMicState("cleaning");

    try {
      const res = await fetch("/api/clean-field", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToClean,
          fieldKey,
          label,
          currentSummary: getSummary ? getSummary() : undefined,
        }),
      });
      const data = await res.json();
      if (data?.text) {
        onChange(data.text);
        setCleanSnap(data.text);
      }
    } catch { /* keep raw */ }
    finally {
      setMicState("done");
      setTimeout(() => {
        setMicState("idle");
        setRawSnap("");
        setCleanSnap("");
        setBubblePos(null);
      }, 4500);
    }
  }

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    const rec = recRef.current;
    if (!rec || micState === "cleaning" || micState === "done") return;
    if (micState === "listening") {
      rec.stop();
    } else {
      dictatedRef.current = "";
      setInterim("");
      try { rec.start(); setMicState("listening"); } catch { /* already running */ }
    }
  }

  if (!supported) return null;

  const hasContent = value.trim().length > 0;

  // The bubble content — rendered via portal so it's never clipped
  const bubble = bubblePos ? createPortal(
    <div
      className="field-mic-preview"
      style={{ position: "absolute", top: bubblePos.top, left: bubblePos.left, width: bubblePos.width }}
    >
      {micState === "listening" && interim && (
        <div className="field-mic-preview-row">
          <span className="field-mic-preview-label heard">Hearing</span>
          <span className="field-mic-preview-text raw" style={{ textDecoration: "none", color: "var(--ink-2)", fontStyle: "italic" }}>
            &ldquo;{interim}&rdquo;
          </span>
        </div>
      )}
      {(micState === "cleaning") && rawSnap && (
        <>
          <div className="field-mic-preview-row">
            <span className="field-mic-preview-label heard">Heard</span>
            <span className="field-mic-preview-text raw" style={{ textDecoration: "none", fontStyle: "italic" }}>{rawSnap}</span>
          </div>
          <div className="field-mic-preview-row" style={{ marginTop: "0.2rem" }}>
            <span className="field-mic-preview-label fixed">AI</span>
            <span className="field-mic-preview-text clean" style={{ color: "var(--ink-3)" }}>Correcting&hellip;</span>
          </div>
        </>
      )}
      {micState === "done" && rawSnap && (
        <>
          <div className="field-mic-preview-row">
            <span className="field-mic-preview-label heard">Heard</span>
            <span className="field-mic-preview-text raw">{rawSnap}</span>
          </div>
          {cleanSnap && cleanSnap !== rawSnap && (
            <div className="field-mic-preview-row">
              <span className="field-mic-preview-label fixed">Fixed</span>
              <span className="field-mic-preview-text clean">{cleanSnap}</span>
            </div>
          )}
          {(!cleanSnap || cleanSnap === rawSnap) && (
            <div className="field-mic-preview-row">
              <span className="field-mic-preview-label fixed">AI</span>
              <span className="field-mic-preview-text clean">No changes needed</span>
            </div>
          )}
        </>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div className="field-mic-wrap">
        {/* Mode toggle — only when field has content and idle */}
        {hasContent && micState === "idle" && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setMode(m => m === "replace" ? "append" : "replace"); }}
            title={mode === "replace" ? "Will replace existing text" : "Will append to existing text"}
            className="field-mic-mode"
            data-mode={mode}
          >
            {mode === "replace" ? (
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 8a6 6 0 1 1 12 0A6 6 0 0 1 2 8zm6-4a.5.5 0 0 0-.5.5v3.793L5.854 6.646a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l2.5-2.5a.5.5 0 0 0-.708-.708L8.5 8.293V4.5A.5.5 0 0 0 8 4z"/>
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
              </svg>
            )}
            <span>{mode === "replace" ? "Replace" : "Append"}</span>
          </button>
        )}

        {/* Mic button */}
        <button
          ref={btnRef}
          type="button"
          onClick={toggle}
          disabled={micState === "cleaning" || micState === "done"}
          className="field-mic"
          data-state={micState === "done" ? "idle" : micState}
          aria-label="Dictate into this field"
        >
          {micState === "listening" && <span className="field-mic-ring" />}

          {micState === "cleaning" ? (
            <span className="field-mic-spinner" />
          ) : micState === "done" ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative" style={{ color: "var(--green)" }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
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
             : micState === "done" ? "Done"
             : "Speak"}
          </span>
        </button>
      </div>

      {/* Portal bubble — renders at document.body level, never clipped */}
      {bubble}
    </>
  );
}
