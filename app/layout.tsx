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
  const runtimeConfig = {
    googleCalendarClientId: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID || "",
  };

  return (
    <html lang="de">
      <head>
        <link rel="stylesheet" href="/styles.css" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__YOURVOICE_RUNTIME__ = ${JSON.stringify(runtimeConfig).replace(/</g, "\\u003c")};`,
          }}
        />
        <script src="https://accounts.google.com/gsi/client" async defer />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
