import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MailIcon } from "lucide-react";
import "./globals.css";

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.111.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.089-.745.083-.729.083-.729 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.304 3.495.997.108-.776.418-1.305.762-1.605-2.665-.305-5.467-1.332-5.467-5.93 0-1.31.467-2.382 1.235-3.221-.123-.303-.535-1.527.117-3.176 0 0 1.008-.323 3.3 1.23a11.46 11.46 0 0 1 3.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.553 3.295-1.23 3.295-1.23.655 1.65.243 2.873.12 3.176.77.839 1.232 1.911 1.232 3.221 0 4.609-2.807 5.621-5.479 5.92.43.371.815 1.103.815 2.222 0 1.604-.015 2.896-.015 3.286 0 .32.216.694.825.576C20.565 21.795 24 17.297 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  );
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Book a meeting with Jake",
  description: "Pick a time on Jake's calendar.",
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
      <body className="min-h-full flex flex-col">
        <nav className="fixed right-3 top-3 z-50 flex items-center gap-0.5 sm:right-5 sm:top-5">
          <a
            href="mailto:jake.s@posthog.com"
            aria-label="Email Jake"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <MailIcon className="size-[18px]" strokeWidth={1.75} />
          </a>
          <a
            href="https://github.com/jakesciotto"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Jake on GitHub"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <GithubMark className="size-[18px]" />
          </a>
        </nav>
        {children}
      </body>
    </html>
  );
}
