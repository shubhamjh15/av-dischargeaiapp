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
        <style>{`html { zoom: 1.15; }`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
