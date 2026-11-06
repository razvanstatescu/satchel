/** The message size cap and UTF-8 decoder on their own (no hash libraries), so the web shell can validate a message
 * without loading `policy/msg.ts`'s keccak and sha256. */

export const MAX_MESSAGE_BYTES = 1024

const fatalUtf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })

/** The UTF-8 text of a body, or null if it isn't valid UTF-8 (WHATWG decoder = Rust `str::from_utf8`). */
export function decodeMessageText(m: Uint8Array): string | null {
  try {
    return fatalUtf8.decode(m)
  } catch {
    return null
  }
}
