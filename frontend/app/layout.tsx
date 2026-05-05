import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Video, BookOpen } from "lucide-react";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Video Analyzer Pro",
  description: "Manage courses and analyze video transcripts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 font-sans">
        <header className="bg-white border-b px-8 py-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
          <Link href="/" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors">
            <Video className="w-8 h-8" />
            <span className="text-2xl font-bold">Video Analyzer Pro</span>
          </Link>
          <nav className="flex gap-6 text-sm font-medium text-gray-600">
            <Link href="/" className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
              <BookOpen className="w-4 h-4" /> Courses
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
