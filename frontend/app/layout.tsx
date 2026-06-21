import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "OPN Mini Swap",
  description: "Mini swap de demonstração para a OPN Chain (IOPn) Testnet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-950 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
