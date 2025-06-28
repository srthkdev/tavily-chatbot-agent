import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Walnut AI - Business Intelligence & Research",
  description: "Comprehensive company research, financial insights, and AI-powered business intelligence. Get detailed reports and chat with company-specific AI assistants.",
  keywords: "business intelligence, company research, financial analysis, AI research, market analysis, corporate intelligence",
  authors: [{ name: "Walnut AI Team" }],
  openGraph: {
    title: "Walnut AI - Business Intelligence & Research",
    description: "Comprehensive company research and AI-powered business intelligence.",
    type: "website",
    url: "https://walnut-ai.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "Walnut AI",
    description: "AI-powered business intelligence and company research platform",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <ThemeProvider
            defaultTheme="light"
            storageKey="tavily-ai-theme"
          >
            <AuthProvider>
              {children}
              <Toaster position="top-center" richColors />
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
