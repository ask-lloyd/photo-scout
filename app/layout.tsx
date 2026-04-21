import type { Metadata } from "next";
import { Syne, Figtree, IBM_Plex_Mono } from "next/font/google";
import { LocaleProvider } from "@/lib/locale-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ActivityProvider } from "@/lib/activity-context";
import { ActivityPickerModal } from "@/components/activity-picker-modal";
import "./globals.css";

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const figtree = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "ConditionsScout — Know when the conditions are right",
  description: "Real-time intelligence for photographers, kitesurfers, and more. Weather, wind, light, tides, and gear advice tailored to your activity.",
  icons: {
    icon: [
      { url: "/icons/favicon-32.svg", sizes: "32x32", type: "image/svg+xml" },
      { url: "/icons/favicon-16.svg", sizes: "16x16", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/app-icon-180.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${syne.variable} ${figtree.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var t = localStorage.getItem("photoscout-theme") || "dark";
            if (t === "system") t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
            if (t === "dark") document.documentElement.classList.add("dark");
          })();
        `}} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <LocaleProvider>
            <ActivityProvider>
              {children}
              <ActivityPickerModal />
            </ActivityProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
