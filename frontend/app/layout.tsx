import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { VideoBackground } from "@/components/VideoBackground";

export const metadata: Metadata = {
  title: "OPN Mini Swap",
  description: "Demo mini swap for the OPN Chain (IOPn) Testnet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-950 font-sans">
        <VideoBackground />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
