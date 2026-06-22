"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DischargeSummary } from "@/lib/schema";
import { registerActiveMic, unregisterActiveMic } from "@/lib/micRegistry";

type SpeechRecognitionResult = { 0: { transcript: string }; isFinal: boolean };
type SpeechRecognitionEvent  = { resultIndex: number; results: { length: number; [i: number]: SpeechRecognitionResult } };
interface ISpeechRecognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror:  ((e: { error: string }) => void) | null;
  onend:    (() => void) | null;
  start: () => void; stop: () => void;
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
  const [rawSnap, setRawSnap]     = useState("");
  const [cleanSnap, setCleanSnap] = useState("");
  const [aiError, setAiError]     = useState(false);

  const btnRef      = useRef<HTMLButtonElement>(null);
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number; width: number } | null>(null);
  const recRef      = useRef<ISpeechRecognition | null>(null);
  const dictatedRef   = useRef("");      // accumulates all finals during this session
  const activeRef     = useRef(false);  // true only while THIS mic is intentionally running
  const finalizedUpTo = useRef(-1);     // highest resultIndex we've already committed (dedup)
  const valueRef      = useRef(value);
  valueRef.current    = value;

  useEffect(() => {
    const rec = getRecognition();
    if (!rec) { setSupported(false); return; }
    rec.lang = "en-IN"; rec.continuous = true; rec.interimResults = true;

    rec.onresult = (e) => {
      let fin = "", inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          // Only commit if we haven't already processed this index
          if (i > finalizedUpTo.current) {
            fin += r[0].transcript + " ";
            finalizedUpTo.current = i;
          }
        } else {
          inter += r[0].transcript;
        }
      }
      if (fin.trim()) dictatedRef.current += fin;
      setInterim(inter);
    };

    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        forceStop();
        // Show mic permission error in bubble briefly
        setMicState("done");
        setRawSnap("Microphone access denied. Please allow mic in browser settings.");
        setAiError(true);
        setTimeout(() => { setMicState("idle"); setRawSnap(""); setAiError(false); setBubblePos(null); }, 4000);
      }
      setInterim("");
    };

    // onend fires on silence. For field mics: auto-stop and clean — do NOT restart.
    // This is the fix for "should automatically close after speaking".
    rec.onend = () => {
      setInterim("");
      if (activeRef.current) {
        // Natural silence end — auto-stop and clean
        activeRef.current = false;
        unregisterActiveMic(forceStop);
        void finishAndClean();
      }
    };

    recRef.current = rec;
    return () => { forceStop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update bubble position — clamp so it never overflows viewport
  useEffect(() => {
    if (micState !== "idle" && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const bubbleW = Math.min(320, window.innerWidth - 16);
      const left = Math.min(
        Math.max(8, r.right + window.scrollX - bubbleW),
        window.innerWidth + window.scrollX - bubbleW - 8
      );
      setBubblePos({ top: r.bottom + window.scrollY + 8, left, width: bubbleW });
    } else {
      setBubblePos(null);
    }
  }, [micState, interim]);

  function forceStop() {
    activeRef.current = false;
    setMicState("idle");
    setInterim("");
    dictatedRef.current = "";
    finalizedUpTo.current = -1;
    try { recRef.current?.stop(); } catch { /* noop */ }
  }

  async function finishAndClean() {
    const dictated = dictatedRef.current.trim();
    dictatedRef.current = "";
    if (!dictated) { setMicState("idle"); return; }

    // Read the CURRENT field value at the moment we finish (not a stale closure)
    const existing    = valueRef.current.trim();
    const textToClean = existing ? `${existing} ${dictated}` : dictated;

    onChange(textToClean);
    setRawSnap(dictated);
    setCleanSnap("");
    setAiError(false);
    setMicState("cleaning");

    try {
      const res = await fetch("/api/clean-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToClean,
          fieldKey,
          label,
          currentSummary: getSummary ? getSummary() : undefined,
        }),
      });
      if (!res.ok) throw new Error("api-error");
      const data = await res.json();
      if (data?.text) { onChange(data.text); setCleanSnap(data.text); }
    } catch {
      setAiError(true);
    } finally {
      setMicState("done");
      setTimeout(() => {
        setMicState("idle");
        setRawSnap(""); setCleanSnap(""); setAiError(false); setBubblePos(null);
      }, 5000);
    }
  }

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    const rec = recRef.current;
    if (!rec || micState === "cleaning" || micState === "done") return;

    if (micState === "listening") {
      // Manual stop — unregister, then let onend fire and call finishAndClean
      activeRef.current = false;
      unregisterActiveMic(forceStop);
      try { rec.stop(); } catch { /* noop */ }
    } else {
      // Register as the global active mic — stops any other field mic that's running
      registerActiveMic(forceStop);
      dictatedRef.current = "";
      finalizedUpTo.current = -1;
      setInterim("");
      activeRef.current = true;
      try { rec.start(); setMicState("listening"); } catch { /* noop */ }
    }
  }

  if (!supported) return null;

  // Display interim text inside the field by showing it in the bubble
  const bubble = bubblePos ? createPortal(
    <div style={{
      position: "absolute",
      top: bubblePos.top,
      left: bubblePos.left,
      width: bubblePos.width,
      zIndex: 9999,
      background: "white",
      border: "1px solid rgba(31,111,82,0.2)",
      borderRadius: 14,
      boxShadow: "0 12px 32px -8px rgba(19,61,47,0.22)",
      padding: "12px 14px",
      fontFamily: "inherit",
    }}>

      {/* LISTENING state */}
      {micState === "listening" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{
              display: "inline-block", width: 10, height: 10, borderRadius: "50%",
              background: "#ef4444", animation: "pulseRing 1.2s ease-out infinite",
            }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#b42318", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Listening — {label}
            </span>
          </div>
          {/* Show accumulated finals + current interim so user sees everything */}
          {(dictatedRef.current.trim() || interim) ? (
            <p style={{ margin: 0, fontSize: 13, color: "#1a2e24", lineHeight: 1.6 }}>
              {dictatedRef.current && (
                <span style={{ fontWeight: 600 }}>{dictatedRef.current}</span>
              )}
              {interim && (
                <span style={{ fontStyle: "italic", color: "#6b8f7a" }}>{interim}</span>
              )}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: "#9aa8a1" }}>Speak now — will auto-stop on silence</p>
          )}
        </div>
      )}

      {/* CLEANING state */}
      {micState === "cleaning" && rawSnap && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{
              display: "inline-block", width: 14, height: 14, borderRadius: "50%",
              border: "2px solid rgba(31,111,82,0.25)", borderTopColor: "#1f6f52",
              animation: "spin 0.7s linear infinite",
            }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1f6f52", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              AI Correcting
            </span>
          </div>
          <div style={{ background: "#fef9ec", borderRadius: 8, padding: "8px 10px", marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.05em" }}>You said</span>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#5a4a2a", fontStyle: "italic", lineHeight: 1.5 }}>&ldquo;{rawSnap}&rdquo;</p>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "#9aa8a1" }}>Fixing medical spelling, format &amp; punctuation&hellip;</p>
        </div>
      )}

      {/* DONE state */}
      {micState === "done" && rawSnap && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            {aiError ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1f6f52" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            <span style={{ fontSize: 12, fontWeight: 700, color: aiError ? "#b45309" : "#1f6f52", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {aiError ? "AI Unavailable" : "Done"}
            </span>
          </div>

          <div style={{ background: aiError ? "#fffbeb" : "#fff5f5", borderRadius: 8, padding: "8px 10px", marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: aiError ? "#92400e" : "#b42318", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {aiError ? "Saved as spoken" : "You said"}
            </span>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: aiError ? "#5a4a2a" : "#7a3030", fontStyle: "italic", lineHeight: 1.5, textDecoration: aiError ? "none" : "line-through" }}>{rawSnap}</p>
            {aiError && (
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "#92400e" }}>AI correction failed — your text was saved as-is.</p>
            )}
          </div>

          {!aiError && (cleanSnap && cleanSnap !== rawSnap ? (
            <div style={{ background: "#f0faf4", borderRadius: 8, padding: "8px 10px" }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#1f6f52", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI fixed</span>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#16241d", fontWeight: 600, lineHeight: 1.5 }}>{cleanSnap}</p>
            </div>
          ) : (
            <div style={{ background: "#f0faf4", borderRadius: 8, padding: "8px 10px" }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#1f6f52", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI</span>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475a52" }}>Text looks correct — no changes needed.</p>
            </div>
          ))}
        </div>
      )}

    </div>,
    document.body
  ) : null;

  return (
    <>
      <div className="field-mic-wrap">
        <button
          ref={btnRef}
          type="button"
          onClick={toggle}
          disabled={micState === "cleaning" || micState === "done"}
          className="field-mic"
          data-state={micState === "done" ? "idle" : micState}
          aria-label={`Dictate ${label}`}
        >
          {micState === "listening" && <span className="field-mic-ring" />}

          {micState === "cleaning" ? (
            <span className="field-mic-spinner" />
          ) : micState === "done" ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative">
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

      {bubble}
    </>
  );
}
