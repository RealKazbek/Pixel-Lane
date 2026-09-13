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
  title: {
    default: "Pixel Lane — Intelligent Urban Traffic Management",
    template: "%s — Pixel Lane",
  },
  description:
    "Pixel Lane models city road networks, analyzes traffic, and prepares infrastructure for simulation-driven urban mobility decisions.",
};

/** Root layout only sets up fonts/global styles. The public marketing
 * chrome and the internal application chrome are separate nested layouts
 * (`(marketing)/layout.tsx` and `app/layout.tsx`) so the two experiences
 * never share header/nav markup. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-dvh bg-background text-foreground">{children}</body>
    </html>
  );
}
