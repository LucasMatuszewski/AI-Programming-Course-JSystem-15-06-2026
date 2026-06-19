import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Best Service Decision",
  description: "Obsługa zgłoszeń reklamacji i zwrotów elektroniki"
};

export default function RootLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
