"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FloatingBackground from "@/components/FloatingBackground";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Login failed.");
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center p-6">
      <FloatingBackground />

      <div className="relative z-10 w-full max-w-md animate-fade-up">
        {/* Logo mark */}
        <div className="mb-6 flex flex-col items-center">
          <div
            className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl text-2xl font-extrabold text-white"
            style={{
              background: "linear-gradient(135deg, #2f8765, #1f6f52)",
              boxShadow:
                "0 20px 40px -12px rgba(19,61,47,0.6), inset 0 2px 0 rgba(255,255,255,0.3)",
            }}
          >
            AV
          </div>
          <h1 className="text-center text-2xl font-extrabold tracking-tight text-slate-800">
            A.V. Multispeciality
          </h1>
          <p className="mt-1 text-center text-sm font-medium text-slate-500">
            AI Discharge Summary Platform
          </p>
        </div>

        <form onSubmit={submit} className="glass-strong rounded-3xl p-8">
          <h2 className="mb-1 text-lg font-bold text-slate-800">Staff Sign In</h2>
          <p className="mb-6 text-sm text-slate-500">
            Enter the shared hospital password to continue.
          </p>

          <label className="field-label" htmlFor="pw">
            Password
          </label>
          <input
            id="pw"
            type="password"
            autoFocus
            className="field"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="btn-3d mt-6 flex w-full items-center justify-center gap-2 py-3"
          >
            {loading ? (
              <>
                <Spinner /> Signing in…
              </>
            ) : (
              <>Sign In →</>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Powered by AI Automation Labs · Voice + AI documentation
        </p>
      </div>
    </main>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}
