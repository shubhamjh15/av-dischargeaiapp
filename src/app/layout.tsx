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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        {/* 15% zoom only on desktop. On phones/tablets the screen is already small,
            so zoom would blow the layout out of the viewport (caused the broken mobile UI). */}
        <style>{`
          @media (min-width: 768px) { html { zoom: 1.15; } }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
