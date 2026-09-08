import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "Ledger — Transaction Manager",
    template: "%s | Ledger",
  },
  description: "A simple personal transaction tracking application.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Load Google Sans from unofficial CDN or fallback to sans-serif */}
        <link href="https://fonts.cdnfonts.com/css/product-sans" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
