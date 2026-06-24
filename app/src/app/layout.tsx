import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Copilot ds. decyzji o serwisie sprzętu",
  description: "Wstępna ocena zgłoszeń serwisowych i zwrotów sprzętu."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className="app-body">{children}</body>
    </html>
  );
}
