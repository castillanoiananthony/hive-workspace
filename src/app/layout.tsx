import type { Metadata, Viewport } from "next";
import { Gabarito, Manrope } from "next/font/google";
import { DEFAULT_THEME, themeVars } from "@/lib/themes";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const gabarito = Gabarito({ variable: "--font-gabarito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "HIVE-WORKSPACE", template: "%s · HIVE-WORKSPACE" },
  description: "Keep your goals visible. Let the team reminders send themselves.",
};

export const viewport: Viewport = { themeColor: "#17171A", width: "device-width", initialScale: 1, viewportFit: "cover" };

// Reads the vars saved by src/lib/apply-theme.ts; kept tiny and dependency-free because it runs before React.
const THEME_BOOT = `try{var t=JSON.parse(localStorage.getItem("hive-theme"));if(t&&t.vars){for(var k in t.vars)document.documentElement.style.setProperty(k,t.vars[k])}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Honey is rendered on the server; the inline script swaps in the user's saved theme before first paint.
  const vars = themeVars(DEFAULT_THEME.preset, DEFAULT_THEME.accent);
  return (
    <html lang="en" className={`${manrope.variable} ${gabarito.variable} h-full`} style={vars as React.CSSProperties} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
