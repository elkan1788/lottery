import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "C9 Lottery",
  description: "A neon-themed lottery web app for live events.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
