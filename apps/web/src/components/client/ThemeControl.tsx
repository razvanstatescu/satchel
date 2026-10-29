"use client";

import { useId, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { copy } from "@/lib/copy";
import { applyTheme, readTheme, THEME_KEY, type Theme } from "@/lib/theme";
import { Segmented, cx, type SegmentOption } from "@/components/ui";

/**
 * "Theme: System · Day · Night" (design-system-impl §4.11): the 2.0 segmented control, a radiogroup whose arrow keys
 * move and select. It writes storage and updates `data-theme` and theme-color in place (lib/theme.ts). Day is the
 * default whatever the OS (R12.3): with nothing stored, Day is checked, also in the server HTML; System is the only way
 * to follow the OS. One per surface (design-spec §3.3): the side nav from 1024, the menu sheet below, the landing
 * footer. Each option is 44 tall and carries `data-theme-option`.
 */
const OPTIONS: SegmentOption<Theme>[] = [
  { value: "system", label: copy.theme.system, icon: Monitor },
  { value: "day", label: copy.theme.day, icon: Sun },
  { value: "night", label: copy.theme.night, icon: Moon },
];

/* The stored choice as an external store: every ThemeControl reads the same value, no effect needed. */
const themeListeners = new Set<() => void>();
let chosen: Theme | null = null; // survives private modes where localStorage throws
function currentTheme(): Theme {
  return chosen ?? readTheme();
}
function subscribeTheme(fn: () => void) {
  themeListeners.add(fn);
  const onStorage = (e: StorageEvent) => e.key === THEME_KEY && fn();
  window.addEventListener("storage", onStorage);
  return () => {
    themeListeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}
function setThemeChoice(t: Theme) {
  chosen = t;
  applyTheme(t);
  themeListeners.forEach((l) => l());
}

/**
 * `layout="stacked"` puts the label above a full-width control (the side nav); `inline` (default) sets them on one
 * row. `size="sm"` is the compact option text of the side nav and the menu sheet (still 44 tall).
 */
export function ThemeControl({ className, size = "md", layout = "inline" }: { className?: string; size?: "sm" | "md"; layout?: "inline" | "stacked" }) {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, () => "day" as Theme);
  const labelId = useId();
  const stacked = layout === "stacked";
  return (
    <div className={cx(stacked ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
      <span id={labelId} className="font-sans text-[0.875rem] leading-5 font-semibold text-ink-muted">
        {copy.theme.label}
      </span>
      <Segmented
        options={OPTIONS}
        value={theme}
        onChange={setThemeChoice}
        labelledBy={labelId}
        size={size}
        block={stacked}
        optionAttr="theme-option"
      />
    </div>
  );
}
