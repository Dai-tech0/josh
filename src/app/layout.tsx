import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import Nav from "@/components/Nav";
import RequireChildSelection from "@/components/RequireChildSelection";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yatta - 課題・タスク管理",
  description: "子供と親、両方の負担を減らす課題・タスク管理ツール",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <StoreProvider>
          <Nav />
          <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6">
            <RequireChildSelection>{children}</RequireChildSelection>
          </main>
        </StoreProvider>
      </body>
    </html>
  );
}
