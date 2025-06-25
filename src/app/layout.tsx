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
  title: "Tavily Chatbot - AI-Powered Search & Conversation",
  description: "Get real-time answers from the web with personalized memory. Powered by Tavily search, Mem0 memory, and multiple AI providers.",
  keywords: "AI chatbot, Tavily search, web search, real-time answers, AI conversation, Mem0 memory",
  authors: [{ name: "Tavily Chatbot Team" }],
  openGraph: {
    title: "Tavily Chatbot - AI-Powered Search & Conversation",
    description: "Get real-time answers from the web with personalized memory.",
    type: "website",
    url: "https://tavily-chatbot.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tavily Chatbot",
    description: "AI-powered search and conversation with real-time web results",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
