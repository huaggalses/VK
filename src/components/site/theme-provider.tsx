"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Тема включается автоматически по системной настройке телефона/компьютера,
 * без кнопки-переключателя — как договаривались: «само».
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
