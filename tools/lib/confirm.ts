/** Dry-run by default; `--send` plus a typed "yes" before anything is signed (HACKATHON.md agent rules). */
import { createInterface } from 'node:readline/promises'

export type Ask = (question: string) => Promise<string>

export const ttyAsk: Ask = async (q) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return await rl.question(q)
  } finally {
    rl.close()
  }
}

export interface ConfirmOptions {
  send: boolean
  /** e2e only: skip the prompt (standing approval H-20 b). Never accepted by the keyless-birth tool. */
  yes?: boolean
  /** refuse unless stdin is a TTY (so "yes" cannot be piped in); default false */
  requireTty?: boolean
  isTty?: boolean
  ask?: Ask
  prompt?: string
}

export type ConfirmResult = 'dry-run' | 'confirmed' | 'declined'

export async function confirmSend(o: ConfirmOptions): Promise<ConfirmResult> {
  if (!o.send) return 'dry-run'
  if (o.yes && !o.requireTty) return 'confirmed'
  const tty = o.isTty ?? Boolean(process.stdin.isTTY)
  if (o.requireTty && !tty) throw new Error('refusing to read the confirmation from a non-interactive stdin: run this in a terminal')
  const answer = await (o.ask ?? ttyAsk)(o.prompt ?? 'Type "yes" to sign and send: ')
  return answer.trim() === 'yes' ? 'confirmed' : 'declined'
}

export const DRY_RUN_NOTE = 'DRY RUN: nothing was signed or sent. Re-run with --send to sign (you will be asked to type "yes").'
