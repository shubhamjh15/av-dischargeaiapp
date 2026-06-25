"use client";

import { useEffect, useRef, useState } from "react";
import { DischargeSummary } from "@/lib/schema";
import { registerActiveMic, unregisterActiveMic } from "@/lib/micRegistry";

type SpeechRecognitionResult = { 0: { transcript: string; confidence: number }; isFinal: boolean };
type SpeechRecognitionEvent  = { resultIndex: number; results: { length: number; [i: number]: SpeechRecognitionResult } };
interface ISpeechRecognition {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror:  ((e: { error: string }) => void) | null;
  onend:    (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
}

// Reject low-confidence final results — this is what filters out background chatter/noise.
const MIN_CONFIDENCE = 0.55;

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

const SILENCE_MS = 2500; // auto-stop after this much silence

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
  const [liveText, setLiveText]   = useState("");   // committed words (React state → re-renders)
  const [interim, setInterim]     = useState("");   // current in-progress words
  const [rawSnap, setRawSnap]     = useState("");
  const [cleanSnap, setCleanSnap] = useState("");
  const [aiError, setAiError]     = useState(false);

  const recRef        = useRef<ISpeechRecognition | null>(null);
  const dictatedRef   = useRef("");     // accumulates all final transcripts this session
  const stoppingRef   = useRef(false);  // true once we've decided to finish (prevents double-clean)
  const listeningRef  = useRef(false);  // mirror of "is the mic actively running" for callbacks
  const silenceTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef      = useRef(value);
  valueRef.current    = value;

  // keep stable refs to functions used in recognition callbacks
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    const rec = getRecognition();
    if (!rec) { setSupported(false); return; }
    rec.lang = "en-IN"; rec.continuous = true; rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let fin = "", inter = "";
      // Rebuild from scratch each event using only final results — simplest correct approach.
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          // NOISE FILTER: drop low-confidence finals (background talk, coughs, etc.).
          // confidence can be 0 on some engines — treat 0 as "unknown" and keep it.
          const conf = r[0].confidence;
          if (conf === 0 || conf >= MIN_CONFIDENCE) fin += r[0].transcript + " ";
        } else {
          inter += r[0].transcript;
        }
      }
      dictatedRef.current = fin;          // full final text so far (not appended — rebuilt)
      setLiveText(fin.trim());
      setInterim(inter);
      // Reset silence countdown on any speech activity
      armSilenceTimer();
    };

    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        hardReset();
        setMicState("done");
        setRawSnap("Microphone blocked. Allow mic access in your browser, then retry.");
        setAiError(true);
        setTimeout(() => resetBubble(), 4500);
      }
      // "no-speech"/"aborted" are non-fatal — onend handles them
    };

    rec.onend = () => {
      clearSilenceTimer();
      // If we're intentionally stopping → clean. Otherwise (Chrome dropped) restart to keep going.
      if (stoppingRef.current) {
        finishRef.current();
      } else if (listeningRef.current) {
        try { rec.start(); } catch { /* will retry */ }
      }
    };

    recRef.current = rec;
    return () => { try { rec.abort(); } catch { /* noop */ } clearSilenceTimer(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearSilenceTimer() {
    if (silenceTimer.current) { clearTimeout(silenceTimer.current); silenceTimer.current = null; }
  }
  function armSilenceTimer() {
    clearSilenceTimer();
    silenceTimer.current = setTimeout(() => {
      // Auto-stop after silence — only if we actually captured something
      if (dictatedRef.current.trim()) requestStop();
    }, SILENCE_MS);
  }

  function resetBubble() {
    setMicState("idle"); setRawSnap(""); setCleanSnap(""); setAiError(false);
    setLiveText(""); setInterim("");
  }

  function hardReset() {
    stoppingRef.current = false;
    listeningRef.current = false;
    dictatedRef.current = "";
    clearSilenceTimer();
    unregisterActiveMic(requestStop);
    try { recRef.current?.abort(); } catch { /* noop */ }
  }

  // Called by the global registry when ANOTHER mic starts — flush our text first, no data loss.
  function requestStop() {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    listeningRef.current = false;
    clearSilenceTimer();
    unregisterActiveMic(requestStop);
    try { recRef.current?.stop(); } catch { /* noop */ }
    // onend will fire finishRef → finishAndClean. If onend doesn't fire fast, finish anyway:
    setTimeout(() => { if (stoppingRef.current) finishRef.current(); }, 400);
  }

  async function finishAndClean() {
    if (!stoppingRef.current) return;
    stoppingRef.current = false; // guard so this runs exactly once

    const dictated = dictatedRef.current.trim();
    dictatedRef.current = "";
    clearSilenceTimer();

    if (!dictated) { resetBubble(); return; }

    // ALWAYS APPEND: never erase existing field content
    const existing    = valueRef.current.trim();
    const textToClean = existing ? `${existing} ${dictated}` : dictated;

    onChange(textToClean);          // commit raw immediately so nothing is lost
    setRawSnap(dictated);
    setCleanSnap("");
    setAiError(false);
    setLiveText(""); setInterim("");
    setMicState("cleaning");

    try {
      const res = await fetch("/api/clean-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToClean, fieldKey, label,
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
      setTimeout(() => resetBubble(), 5000);
    }
  }
  finishRef.current = finishAndClean;

  function start() {
    const rec = recRef.current;
    if (!rec) return;
    registerActiveMic(requestStop);  // stops any other mic (which flushes its own text safely)
    stoppingRef.current = false;
    listeningRef.current = true;
    dictatedRef.current = "";
    setLiveText(""); setInterim("");
    try { rec.start(); setMicState("listening"); armSilenceTimer(); } catch { /* already running */ }
  }

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    if (!recRef.current || micState === "cleaning" || micState === "done") return;
    if (micState === "listening") requestStop();
    else start();
  }

  if (!supported) return null;

  const shownText = (liveText + (interim ? " " + interim : "")).trim();

  // Bubble is rendered INLINE inside the wrap (position:absolute, anchored to the button).
  // This is immune to page zoom and scroll — it always sits directly under the mic button.
  const bubble = micState !== "idle" ? (
    <div style={{
      position: "absolute", top: "calc(100% + 8px)", right: 0, width: "min(320px, 86vw)",
      zIndex: 9999, background: "white", border: "1px solid rgba(31,111,82,0.2)",
      borderRadius: 14, boxShadow: "0 12px 32px -8px rgba(19,61,47,0.22)",
      padding: "12px 14px", fontFamily: "inherit", textAlign: "left",
    }}>

      {/* LISTENING */}
      {micState === "listening" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulseRing 1.2s ease-out infinite" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#b42318", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Listening — {label}
              </span>
            </div>
          </div>
          {shownText ? (
            <p style={{ margin: 0, fontSize: 13, color: "#1a2e24", lineHeight: 1.6 }}>
              {liveText && <span style={{ fontWeight: 600 }}>{liveText} </span>}
              {interim && <span style={{ fontStyle: "italic", color: "#6b8f7a" }}>{interim}</span>}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: "#9aa8a1" }}>Speak now — pauses for 2.5s auto-stop.</p>
          )}
          <p style={{ margin: "8px 0 0", fontSize: 10, color: "#b9c7bf" }}>Tap the button again to stop now.</p>
        </div>
      )}

      {/* CLEANING */}
      {micState === "cleaning" && rawSnap && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(31,111,82,0.25)", borderTopColor: "#1f6f52", animation: "spin 0.7s linear infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1f6f52", letterSpacing: "0.04em", textTransform: "uppercase" }}>AI Correcting</span>
          </div>
          <div style={{ background: "#fef9ec", borderRadius: 8, padding: "8px 10px", marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.05em" }}>You said</span>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#5a4a2a", fontStyle: "italic", lineHeight: 1.5 }}>&ldquo;{rawSnap}&rdquo;</p>
          </div>
        </div>
      )}

      {/* DONE */}
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
              {aiError ? "Heads up" : "Done"}
            </span>
          </div>

          <div style={{ background: aiError ? "#fffbeb" : "#fff5f5", borderRadius: 8, padding: "8px 10px", marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: aiError ? "#92400e" : "#b42318", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {aiError ? "Saved as spoken" : "You said"}
            </span>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: aiError ? "#5a4a2a" : "#7a3030", fontStyle: "italic", lineHeight: 1.5, textDecoration: aiError ? "none" : "line-through" }}>{rawSnap}</p>
          </div>

          {!aiError && (cleanSnap && cleanSnap !== rawSnap ? (
            <div style={{ background: "#f0faf4", borderRadius: 8, padding: "8px 10px" }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#1f6f52", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI fixed</span>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#16241d", fontWeight: 600, lineHeight: 1.5 }}>{cleanSnap}</p>
            </div>
          ) : (
            <div style={{ background: "#f0faf4", borderRadius: 8, padding: "8px 10px" }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#1f6f52", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI</span>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475a52" }}>Looks correct — no changes needed.</p>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="field-mic-wrap">
      <button
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

      {bubble}
    </div>
  );
}
