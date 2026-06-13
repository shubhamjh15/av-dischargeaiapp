import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AV Multispeciality — Discharge Summary",
  description:
    "AI-powered discharge summary automation for AV Multispeciality Hospital.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Scale the whole UI to 85% — keeps layout intact, just smaller */}
        <style>{`
          html { zoom: 0.85; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
