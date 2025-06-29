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
  title: "Walnut AI - Business Intelligence Platform for Sales & Strategy Teams",
  description: "Transform sales prospecting, M&A analysis, and market research. Get investment-grade company intelligence in 2 minutes. Trusted by VCs, consultants, and Fortune 500 teams.",
  keywords: "business intelligence, sales prospecting, M&A analysis, market research, competitive intelligence, company research, due diligence, investment analysis, sales intelligence, corporate strategy",
  authors: [{ name: "Walnut AI Team" }],
  openGraph: {
    title: "Walnut AI - Business Intelligence Platform",
    description: "95% faster company research for sales teams, corporate strategy, and entrepreneurs. From prospect research to M&A analysis.",
    type: "website",
    url: "https://walnut-ai.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "Walnut AI - Business Intelligence Platform",
    description: "Transform sales prospecting and M&A analysis with AI-powered company intelligence",
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
            storageKey="walnut-ai-theme"
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
