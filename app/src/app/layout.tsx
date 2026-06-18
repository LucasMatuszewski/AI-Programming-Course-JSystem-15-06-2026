import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asystent reklamacji rowerów",
  description: "PoC aplikacji do wstępnej oceny reklamacji rowerów.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
