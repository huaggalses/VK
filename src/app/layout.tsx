import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/site/theme-provider";
import { getGroup } from "@/lib/feed";
import { withBase } from "@/lib/base-path";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

export function generateMetadata(): Metadata {
  const g = getGroup();
  const title = `${g.name} — живая лента сообщества`;
  const description =
    g.description.slice(0, 160) ||
    "Все посты сообщества в удобной ленте. Обновляется автоматически, работает молниеносно.";
  return {
    title,
    description,
    keywords: ["лента", "сообщество", "новости", "ВК"],
    icons: { icon: withBase("/logo.svg") },
    openGraph: { title, description, type: "website" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${manrope.variable} antialiased bg-background text-foreground`}>
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
