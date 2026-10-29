"use client";

import { useLayoutEffect } from "react";
import { MOTION_HEAD_SCRIPT } from "@/lib/motion-flag";
import { THEME_HEAD_SCRIPT } from "@/lib/theme";

/**
 * Puts back what the root layout's head script set when React renders the whole document on the client.
 *
 * Next serves a `notFound()` thrown in a blocking route shell as its error document (`<html id="__next_error__">`), and
 * the browser then renders that document from scratch instead of hydrating it: React resets `<html>`'s attributes and
 * never runs a `<script>` it creates (the dev console's "Encountered a script tag…"). Without this a stored Night would
 * turn Day under a theme control that still reads Night, and `data-js` / `data-motion` would be gone. `/s/999` no longer
 * goes that way (its layout renders the not-found view, QA-POLISH #6); this stays as the safety net for any route that
 * still throws in its shell. On every ordinary (hydrated) page `data-theme` is already set and this does nothing. It
 * re-runs the same head script (theme, theme-color, the System listener, the motion flags) rather than a copy of it.
 */
export function RestoreHeadFlags() {
  useLayoutEffect(() => {
    if (document.documentElement.dataset.theme) return;
    const s = document.createElement("script");
    s.textContent = THEME_HEAD_SCRIPT + MOTION_HEAD_SCRIPT;
    document.head.append(s); // a script inserted through the DOM runs at once
    s.remove();
  }, []);
  return null;
}
