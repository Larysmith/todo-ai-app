import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Todo AI — turn a goal into a plan",
  description:
    "Describe a goal and get an AI-generated task plan, manage notes, run a Pomodoro timer and track progress. Works without an API key.",
  applicationName: "Todo AI",
  keywords: ["todo", "ai", "planner", "notes", "pomodoro", "productivity"],
  authors: [{ name: "Todo AI" }],
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c13" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface text-ink">{children}</body>
    </html>
  );
}
