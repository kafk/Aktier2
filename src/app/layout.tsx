import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aktier - Keyword Management",
  description: "Manage keywords for stock news scraping",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
