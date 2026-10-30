"use client";

import { useEffect, useRef } from "react";
import { refreshSnapshot } from "@/lib/data/client";
import { useIntents } from "@/lib/signing/client";

/**
 * Balances follow a send without a page refresh: when any send reaches "sent" (broadcast) or "confirmed", its Satchel's
 * snapshot is read fresh from the chains, and again while they settle (refreshSnapshot). Mounted once in the app shell.
 */
const MOVED = new Set(["sent", "confirmed"]);

export function RefreshAfterSend() {
  const intents = useIntents();
  const seen = useRef(new Map<string, string>());
  useEffect(() => {
    for (const i of intents) {
      const before = seen.current.get(i.id);
      seen.current.set(i.id, i.stage);
      if (before !== undefined && before !== i.stage && MOVED.has(i.stage)) refreshSnapshot(i.tokenId);
    }
  }, [intents]);
  return null;
}
