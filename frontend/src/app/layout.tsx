import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MathClass — Math Homework Platform",
  description: "AI-powered math homework platform for teachers and students",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
