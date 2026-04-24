import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Your Voice Organizer",
  description: "Premium Voice Organizer mit deutschem Regelparser und Review-Flow.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="de">
      <head>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
