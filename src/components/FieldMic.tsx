"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DischargeSummary } from "@/lib/schema";

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

  const btnRef      = useRef<HTMLButtonElement>(null);
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
  const recRef      = useRef<ISpeechRecognition | null>(null);
  const dictatedRef = useRef("");
  const valueRef    = useRef(value);
  valueRef.current  = value;

  useEffect(() => {
    const rec = getRecognition();
    if (!rec) { setSupported(false); return; }
    rec.lang = "en-IN"; rec.continuous = true; rec.interimResults = true;
    rec.onresult = (e) => {
      let fin = "", inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript + " ";
        else inter += r[0].transcript;
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

  // Update bubble anchor position whenever state changes
  useEffect(() => {
    if (micState !== "idle" && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setBubblePos({
        top:  r.bottom + window.scrollY + 8,
        left: Math.max(8, r.right + window.scrollX - 320),
      });
    } else {
      setBubblePos(null);
    }
  }, [micState, interim]);

  async function finishAndClean() {
    const dictated = dictatedRef.current.trim();
    dictatedRef.current = "";
    if (!dictated) { setMicState("idle"); return; }

    // AUTO: if field already has content → append; if empty → replace
    const existing    = valueRef.current.trim();
    const textToClean = existing ? `${existing} ${dictated}` : dictated;

    onChange(textToClean);
    setRawSnap(dictated);
    setCleanSnap("");
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
      const data = await res.json();
      if (data?.text) { onChange(data.text); setCleanSnap(data.text); }
    } catch { /* keep raw */ }
    finally {
      setMicState("done");
      setTimeout(() => {
        setMicState("idle");
        setRawSnap(""); setCleanSnap(""); setBubblePos(null);
      }, 5000);
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

  // ── portal bubble ──────────────────────────────────────────────────────
  const bubble = bubblePos ? createPortal(
    <div style={{
      position: "absolute",
      top: bubblePos.top,
      left: bubblePos.left,
      width: 320,
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
            {/* pulsing red dot */}
            <span style={{
              display: "inline-block", width: 10, height: 10, borderRadius: "50%",
              background: "#ef4444", animation: "pulseRing 1.2s ease-out infinite",
            }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#b42318", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Listening
            </span>
          </div>
          {interim ? (
            <p style={{ margin: 0, fontSize: 13, color: "#1a2e24", fontStyle: "italic", lineHeight: 1.5 }}>
              &ldquo;{interim}&rdquo;
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: "#9aa8a1" }}>Speak now — hearing your voice&hellip;</p>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1f6f52" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1f6f52", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Done
            </span>
          </div>

          {/* You said */}
          <div style={{ background: "#fff5f5", borderRadius: 8, padding: "8px 10px", marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#b42318", textTransform: "uppercase", letterSpacing: "0.05em" }}>You said</span>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#7a3030", fontStyle: "italic", lineHeight: 1.5, textDecoration: "line-through" }}>{rawSnap}</p>
          </div>

          {/* AI fixed */}
          {cleanSnap && cleanSnap !== rawSnap ? (
            <div style={{ background: "#f0faf4", borderRadius: 8, padding: "8px 10px" }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#1f6f52", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI fixed</span>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#16241d", fontWeight: 600, lineHeight: 1.5 }}>{cleanSnap}</p>
            </div>
          ) : (
            <div style={{ background: "#f0faf4", borderRadius: 8, padding: "8px 10px" }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#1f6f52", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI</span>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475a52" }}>Text looks correct — no changes needed.</p>
            </div>
          )}
        </div>
      )}

    </div>,
    document.body
  ) : null;

  return (
    <>
      <div className="field-mic-wrap">
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
