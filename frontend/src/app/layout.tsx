import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AssignSmart — AI Math Homework Platform",
  description: "AI-powered worksheets, instant grading, and real-time classroom progress tracking",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
