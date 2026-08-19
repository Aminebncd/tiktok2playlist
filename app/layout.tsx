import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Soundsift — TikTok sounds to Spotify",
  description: "Turn your saved TikTok sounds into a Spotify playlist without uploading your archive.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
