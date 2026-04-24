import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HemAI — Smarta hem i Sverige",
  description: "AI-driven Swedish home search. Find your next home with intelligent insights, neighborhood analysis, and value scoring.",
  keywords: ["bostad", "lägenhet", "villa", "Göteborg", "Stockholm", "Malmö", "Sverige", "house hunting", "AI"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body className="antialiased bg-gray-50 text-gray-900">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-2xl">🦞</span>
              <span className="text-xl font-bold tracking-tight text-blue-900">
                Hem<span className="text-blue-600">AI</span>
              </span>
            </a>
            <div className="flex items-center gap-6 text-sm font-medium">
              <a href="/sok" className="hover:text-blue-600 transition-colors">Sök bostad</a>
              <a href="/annonser" className="hover:text-blue-600 transition-colors">Annonser</a>
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="border-t border-gray-200 bg-white mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} HemAI — Smarta hem i Sverige</p>
          </div>
        </footer>
      </body>
    </html>
  );
}