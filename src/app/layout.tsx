import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ViFinance — Tus finanzas, en un solo lugar",
    template: "%s · ViFinance",
  },
  description:
    "Control de finanzas personales para México: cuentas, apartados con rendimiento, presupuestos y simuladores de inversión y crédito.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b1210" },
    { media: "(prefers-color-scheme: light)", color: "#f7faf8" },
  ],
  width: "device-width",
  initialScale: 1,
  // Sin zoom máximo: limitarlo rompe la accesibilidad para quien necesita
  // acercar la pantalla.
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-MX"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-full">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
