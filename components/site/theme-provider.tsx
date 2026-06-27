"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

/**
 * Wraps the app in next-themes provider. Theme preference is stored in
 * localStorage and applied as a `class` on <html>. Respects the user's
 * OS preference when set to "system".
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
