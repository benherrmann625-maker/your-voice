import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.yourvoice.organizer",
  appName: "Your Voice",
  webDir: "mobile-shell",
  server: {
    androidScheme: "https",
  },
};

export default config;
