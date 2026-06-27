"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/**
 * Three-state theme toggle: light / dark / system.
 * Cycles on click. Icon reflects the current effective theme.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch by waiting for client render before showing
  // the dynamic icon. Render a neutral placeholder server-side.
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const cycle = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };

  const Icon = !mounted
    ? Sun
    : theme === "dark"
      ? Moon
      : theme === "system"
        ? Monitor
        : Sun;

  const label = !mounted
    ? "Toggle theme"
    : theme === "dark"
      ? "Switch to system theme"
      : theme === "system"
        ? "Switch to light theme"
        : "Switch to dark theme";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={label}
      title={label}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </Button>
  );
}
