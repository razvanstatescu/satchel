// THROWAWAY: exact unsigned EIP-1559 byte layout that a contract would hash (keccak256) and parse
import { serializeTransaction, keccak256, fromRlp, type Hex } from 'viem'
const unsigned = { type: 'eip1559' as const, chainId: 11155111, nonce: 0, to: '0x61739f33AdbB7F76c1b5B222E4119085257528BE' as Hex, value: 100000000000000n, gas: 21000n, maxFeePerGas: 200028n, maxPriorityFeePerGas: 200008n }
const bytes = serializeTransaction(unsigned)
const fields = fromRlp(('0x' + bytes.slice(4)) as Hex, 'hex') as Hex[]
const names = ['chain_id','nonce','max_priority_fee_per_gas','max_fee_per_gas','gas_limit','to','value','data','access_list']
console.log(JSON.stringify({ unsignedHex: bytes, lengthBytes: (bytes.length - 2) / 2, typeByte: bytes.slice(0, 4), keccak: keccak256(bytes), fields: Object.fromEntries(fields.map((f, i) => [names[i], f])) }, null, 1))
