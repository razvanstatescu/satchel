import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
const root = dirname(fileURLToPath(import.meta.url))
export default { turbopack: { root }, outputFileTracingRoot: root }
