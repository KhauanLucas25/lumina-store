import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {width: 'device-width', initialScale: 1};

export const metadata: Metadata = {
  title: "Lumina | Velas, Essências & Rituais",
  description: "Velas aromáticas, essências e acessórios para momentos de acolhimento.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
