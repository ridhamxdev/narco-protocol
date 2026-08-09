import "./globals.css";
import { Archivo } from "next/font/google";
import Providers from "@/components/providers";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo" });

export const metadata = {
  title: "NARCO PROTOCOL",
  description: "Personal discipline operating system. The empire is built one day at a time.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "NARCO" },
};

export const viewport = {
  themeColor: "#F7F5F1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const CONTRACT = `<!--
THESIS: one scored ledger per day on a calm, light surface; refuses both the dark war-room costume and the icon-card-grid dashboard.
OWN-WORLD: warm paper neutrals (#F7F5F1 page, white cards), one amber accent (#D9A441 fills, #9A6B1F text), charcoal primary actions, Archivo throughout with tabular numerals; segmented progress meters are the single signature.
STORY: the owner opens Today, sees Day N and what's still open, logs each item in one tap, and watches the day's meter fill to 100.
FIRST VIEWPORT (mobile): Day N + score numeral over the segmented meter, then the checklist; every log is one tap deep.
FORM: clean ledger (owner-revised brief: "much cleaner, lighter" — supersedes the dark vault world).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>
        <div hidden aria-hidden="true" dangerouslySetInnerHTML={{ __html: CONTRACT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
