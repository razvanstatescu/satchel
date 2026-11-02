"use client";

import { useRef, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Icon, IconButton, TextInput } from "@/components/ui";
import { copy } from "@/lib/copy";

/**
 * /questions' one interactive bit (progressive enhancement): a text filter over the server-rendered groups below it.
 * Every question is already in the HTML (judge pages render their facts with no Suspense fallback, kb/90 §7-9), so
 * with JS off — or before hydration — the full list just shows: this only ever hides matches, never fetches or
 * replaces content. It matches each question's own text (`data-faq-q`, lower-cased) and, if every question in a
 * group is hidden, hides that group's heading too (`data-faq-group`).
 */
export function QuestionsSearch({ children }: { children: ReactNode }) {
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  function apply(next: string) {
    setQ(next);
    const root = rootRef.current;
    if (!root) return;
    const term = next.trim().toLowerCase();
    let anyGroupVisible = false;
    for (const group of root.querySelectorAll<HTMLElement>("[data-faq-group]")) {
      let anyVisible = false;
      for (const item of group.querySelectorAll<HTMLElement>("[data-faq-q]")) {
        const text = (item.dataset.faqQ ?? "").toLowerCase();
        const match = term === "" || text.includes(term);
        item.hidden = !match;
        if (match) anyVisible = true;
      }
      group.hidden = !anyVisible;
      if (anyVisible) anyGroupVisible = true;
    }
    const empty = root.querySelector<HTMLElement>("[data-faq-empty]");
    if (empty) empty.hidden = anyGroupVisible;
  }

  return (
    <div ref={rootRef}>
      <div className="relative mb-6">
        <Icon icon={Search} size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted" />
        <TextInput
          type="search"
          value={q}
          onChange={(e) => apply(e.target.value)}
          placeholder={copy.questionsPage.searchPlaceholder}
          aria-label={copy.questionsPage.searchLabel}
          className="pl-10.5"
        />
        {q ? (
          <IconButton
            icon={X}
            label={copy.questionsPage.searchClear}
            onClick={() => apply("")}
            className="absolute top-1/2 right-1.5 -translate-y-1/2"
            iconSize={20}
          />
        ) : null}
      </div>
      {children}
    </div>
  );
}
