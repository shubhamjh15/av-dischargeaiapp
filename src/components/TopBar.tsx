"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TopBar() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20">
      <div className="glass-strong mx-auto mt-4 flex max-w-5xl items-center justify-between rounded-2xl px-5 py-3">
        <Link href="/" className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-extrabold text-white"
            style={{
              background: "linear-gradient(135deg, #2f8765, #1f6f52)",
              boxShadow: "0 8px 18px -8px rgba(19,61,47,0.6)",
            }}
          >
            AV
          </div>
          <div className="leading-tight">
            <p className="text-sm font-extrabold text-slate-800">
              A.V. Multispeciality
            </p>
            <p className="text-[11px] font-medium text-slate-500">
              Discharge Summary Platform
            </p>
          </div>
        </Link>

        <button onClick={logout} className="btn-ghost px-4 py-2 text-sm">
          Sign out
        </button>
      </div>
    </header>
  );
}
