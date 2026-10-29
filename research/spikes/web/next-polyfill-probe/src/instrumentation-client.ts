// THROWAWAY spike: optional global Buffer for libs that read globalThis.Buffer explicitly.
import { Buffer } from 'buffer';
(globalThis as { Buffer?: typeof Buffer }).Buffer ??= Buffer;
