/**
 * Recorded FastNEAR Transactions API answer (kb/50 §FastNEAR Transactions API), for the birth-actions tests.
 * POST https://tx.test.fastnear.com/v0/transactions {"tx_hashes":["2AMrb8J8…","7PX6TLCd…"]}, read 2026-10-22 (read-only, keyless).
 * - 2AMrb8J8NpLvXGAUWXC1qNMjvAx48Qwe41mbDJkKGtQR: the 11-action keyless birth of kb2.satchel-spk-chain-e9ea1a.testnet
 *   (research/spikes/keyless-birth/RESULTS.md test 2; example NFT contract: `new_default_meta`, `nft_mint` args carry token_id).
 * - 7PX6TLCddZ6vT7nCYdCjitfsKvyXEy9FryymKNiM2bLt: a keyed `near account create-account` of hello.satchel-spk-sdk-e9ea1a.testnet
 *   (research/spikes/sdk/RESULTS.md §2): CreateAccount, Transfer, AddKey.
 * Trimmed to the fields the app reads: `transaction.signature`, gas/metadata fields and 13 of the 16 receipts of 2AMrb8J8 (all
 * Transfer refunds to the signer, none to the new account) are dropped. Block timestamps are the values `res.json()` yields
 * (nanoseconds rounded to a double). DeployContract.code is the base64 SHA-256 of the wasm, as FastNEAR returns it.
 */
import type { FastnearTx } from "@/lib/near/history";

export const RECORDED_TXS = {
  transactions: [
    {
      transaction: {
        signer_id: "satchel-spk-chain-e9ea1a.testnet",
        public_key: "ed25519:7nb1QqCj5nRwWSAVtgrkSE6hMe337uJ5LahFxeSaA7nk",
        nonce: 274087434000014,
        receiver_id: "kb2.satchel-spk-chain-e9ea1a.testnet",
        actions: [
          "CreateAccount",
          { Transfer: { deposit: "4000000000000000000000000" } },
          { DeployContract: { code: "l67L4GNijScMpVeCJvDI+Snbwk/gU7kIklT9NOw7VoM=" } },
          {
            FunctionCall: {
              method_name: "new_default_meta",
              args: "eyJvd25lcl9pZCI6InNhdGNoZWwtc3BrLWNoYWluLWU5ZWExYS50ZXN0bmV0In0=",
              gas: 30000000000000,
              deposit: "0",
            },
          },
          {
            FunctionCall: {
              method_name: "nft_mint",
              args: "eyJ0b2tlbl9pZCI6IjEiLCJ0b2tlbl9vd25lcl9pZCI6InNhdGNoZWwtc3BrLWNoYWluLWU5ZWExYS50ZXN0bmV0IiwidG9rZW5fbWV0YWRhdGEiOnsidGl0bGUiOiJrYi0xIn19",
              gas: 20000000000000,
              deposit: "10000000000000000000000",
            },
          },
          {
            FunctionCall: {
              method_name: "nft_mint",
              args: "eyJ0b2tlbl9pZCI6IjIiLCJ0b2tlbl9vd25lcl9pZCI6InNhdGNoZWwtc3BrLWNoYWluLWU5ZWExYS50ZXN0bmV0IiwidG9rZW5fbWV0YWRhdGEiOnsidGl0bGUiOiJrYi0yIn19",
              gas: 20000000000000,
              deposit: "10000000000000000000000",
            },
          },
          {
            FunctionCall: {
              method_name: "nft_mint",
              args: "eyJ0b2tlbl9pZCI6IjMiLCJ0b2tlbl9vd25lcl9pZCI6InNhdGNoZWwtc3BrLWNoYWluLWU5ZWExYS50ZXN0bmV0IiwidG9rZW5fbWV0YWRhdGEiOnsidGl0bGUiOiJrYi0zIn19",
              gas: 20000000000000,
              deposit: "10000000000000000000000",
            },
          },
          {
            FunctionCall: {
              method_name: "nft_mint",
              args: "eyJ0b2tlbl9pZCI6IjQiLCJ0b2tlbl9vd25lcl9pZCI6InNhdGNoZWwtc3BrLWNoYWluLWU5ZWExYS50ZXN0bmV0IiwidG9rZW5fbWV0YWRhdGEiOnsidGl0bGUiOiJrYi00In19",
              gas: 20000000000000,
              deposit: "10000000000000000000000",
            },
          },
          {
            FunctionCall: {
              method_name: "nft_mint",
              args: "eyJ0b2tlbl9pZCI6IjUiLCJ0b2tlbl9vd25lcl9pZCI6InNhdGNoZWwtc3BrLWNoYWluLWU5ZWExYS50ZXN0bmV0IiwidG9rZW5fbWV0YWRhdGEiOnsidGl0bGUiOiJrYi01In19",
              gas: 20000000000000,
              deposit: "10000000000000000000000",
            },
          },
          {
            FunctionCall: {
              method_name: "nft_mint",
              args: "eyJ0b2tlbl9pZCI6IjYiLCJ0b2tlbl9vd25lcl9pZCI6InNhdGNoZWwtc3BrLWNoYWluLWU5ZWExYS50ZXN0bmV0IiwidG9rZW5fbWV0YWRhdGEiOnsidGl0bGUiOiJrYi02In19",
              gas: 20000000000000,
              deposit: "10000000000000000000000",
            },
          },
          {
            FunctionCall: {
              method_name: "nft_mint",
              args: "eyJ0b2tlbl9pZCI6IjciLCJ0b2tlbl9vd25lcl9pZCI6InNhdGNoZWwtc3BrLWNoYWluLWU5ZWExYS50ZXN0bmV0IiwidG9rZW5fbWV0YWRhdGEiOnsidGl0bGUiOiJrYi03In19",
              gas: 20000000000000,
              deposit: "10000000000000000000000",
            },
          },
        ],
        priority_fee: 0,
        hash: "2AMrb8J8NpLvXGAUWXC1qNMjvAx48Qwe41mbDJkKGtQR",
      },
      execution_outcome: {
        block_height: 274111787,
        block_timestamp: 1792595023667331300,
        id: "2AMrb8J8NpLvXGAUWXC1qNMjvAx48Qwe41mbDJkKGtQR",
        outcome: {
          logs: [],
          receipt_ids: ["2WUst1hUL5HZt17Rn5rp6pnaKap1FRKLgW2SpQvdyWF7"],
          executor_id: "satchel-spk-chain-e9ea1a.testnet",
          status: { SuccessReceiptId: "2WUst1hUL5HZt17Rn5rp6pnaKap1FRKLgW2SpQvdyWF7" },
        },
      },
      receipts: [
        {
          receipt: {
            block_height: 274111788,
            predecessor_id: "satchel-spk-chain-e9ea1a.testnet",
            receiver_id: "kb2.satchel-spk-chain-e9ea1a.testnet",
            receipt_id: "2WUst1hUL5HZt17Rn5rp6pnaKap1FRKLgW2SpQvdyWF7",
            receipt: {
              Action: {
                signer_id: "satchel-spk-chain-e9ea1a.testnet",
                actions: [
                  "CreateAccount",
                  { Transfer: { deposit: "4000000000000000000000000" } },
                  { DeployContract: { code: "l67L4GNijScMpVeCJvDI+Snbwk/gU7kIklT9NOw7VoM=" } },
                  {
                    FunctionCall: {
                      method_name: "new_default_meta",
                      args: "eyJvd25lcl9pZCI6InNhdGNoZWwtc3BrLWNoYWluLWU5ZWExYS50ZXN0bmV0In0=",
                      gas: 30000000000000,
                      deposit: "0",
                    },
                  },
                  {
                    FunctionCall: {
                      method_name: "nft_mint",
                      args: "eyJ0b2tlbl9pZCI6IjEiLCJ0b2tlbl9vd25lcl9pZCI6InNhdGNoZWwtc3BrLWNoYWluLWU5ZWExYS50ZXN0bmV0IiwidG9rZW5fbWV0YWRhdGEiOnsidGl0bGUiOiJrYi0xIn19",
                      gas: 20000000000000,
                      deposit: "10000000000000000000000",
                    },
                  },
                  {
                    FunctionCall: {
                      method_name: "nft_mint",
                      args: "eyJ0b2tlbl9pZCI6IjIiLCJ0b2tlbl9vd25lcl9pZCI6InNhdGNoZWwtc3BrLWNoYWluLWU5ZWExYS50ZXN0bmV0IiwidG9rZW5fbWV0YWRhdGEiOnsidGl0bGUiOiJrYi0yIn19",
                      gas: 20000000000000,
                      deposit: "10000000000000000000000",
                    },
                  },
                  {
                    FunctionCall: {
                      method_name: "nft_mint",
                      args: "eyJ0b2tlbl9pZCI6IjMiLCJ0b2tlbl9vd25lcl9pZCI6InNhdGNoZWwtc3BrLWNoYWluLWU5ZWExYS50ZXN0bmV0IiwidG9rZW5fbWV0YWRhdGEiOnsidGl0bGUiOiJrYi0zIn19",
                      gas: 20000000000000,
                      deposit: "10000000000000000000000",
                    },
                  },
                  {
                    FunctionCall: {
                      method_name: "nft_mint",
                      args: "eyJ0b2tlbl9pZCI6IjQiLCJ0b2tlbl9vd25lcl9pZCI6InNhdGNoZWwtc3BrLWNoYWluLWU5ZWExYS50ZXN0bmV0IiwidG9rZW5fbWV0YWRhdGEiOnsidGl0bGUiOiJrYi00In19",
                      gas: 20000000000000,
                      deposit: "10000000000000000000000",
                    },
                  },
                  {
                    FunctionCall: {
                      method_name: "nft_mint",
                      args: "eyJ0b2tlbl9pZCI6IjUiLCJ0b2tlbl9vd25lcl9pZCI6InNhdGNoZWwtc3BrLWNoYWluLWU5ZWExYS50ZXN0bmV0IiwidG9rZW5fbWV0YWRhdGEiOnsidGl0bGUiOiJrYi01In19",
                      gas: 20000000000000,
                      deposit: "10000000000000000000000",
                    },
                  },
                  {
                    FunctionCall: {
                      method_name: "nft_mint",
                      args: "eyJ0b2tlbl9pZCI6IjYiLCJ0b2tlbl9vd25lcl9pZCI6InNhdGNoZWwtc3BrLWNoYWluLWU5ZWExYS50ZXN0bmV0IiwidG9rZW5fbWV0YWRhdGEiOnsidGl0bGUiOiJrYi02In19",
                      gas: 20000000000000,
                      deposit: "10000000000000000000000",
                    },
                  },
                  {
                    FunctionCall: {
                      method_name: "nft_mint",
                      args: "eyJ0b2tlbl9pZCI6IjciLCJ0b2tlbl9vd25lcl9pZCI6InNhdGNoZWwtc3BrLWNoYWluLWU5ZWExYS50ZXN0bmV0IiwidG9rZW5fbWV0YWRhdGEiOnsidGl0bGUiOiJrYi03In19",
                      gas: 20000000000000,
                      deposit: "10000000000000000000000",
                    },
                  },
                ],
              },
            },
          },
          execution_outcome: {
            block_height: 274111788,
            block_timestamp: 1792595024382798800,
            id: "2WUst1hUL5HZt17Rn5rp6pnaKap1FRKLgW2SpQvdyWF7",
            outcome: {
              logs: [],
              receipt_ids: [
                "3XXLYENEehAuvzv3p3H9SGU7t6MCTpGsQWSJ5xM7mBZ3",
                "2wubc4rSMJoeJnnk8xRDEXCtj65j1FqEx4QafiZ9B26M",
                "HJXCbENqDht2RPRkSQBNLjQf89ChA892nFzUrVayfzYN",
                "2DDGCRnqLX4qDzJqqZJo6HACimhHHXvnHfbaPYorGdZp",
                "GQABWhGDG6rEvPmEDcsPFr6pXzE9zttWEybVcJrTA1UJ",
                "H1ejCHTArfEVsosqQkCaJ5yLZsuF4KU8AzVuJpbH1LXi",
                "cJRhYUoJG8zwDnEybZk5ofMNPrUYjcRTgN9XXMoGcuf",
                "129GGwPLpUuAgvLbeNra4v84WwWdR94YYYmcuTVW11JD",
              ],
              executor_id: "kb2.satchel-spk-chain-e9ea1a.testnet",
              status: {
                SuccessValue: "eyJ0b2tlbl9pZCI6IjciLCJvd25lcl9pZCI6InNhdGNoZWwtc3BrLWNoYWluLWU5ZWExYS50ZXN0bmV0IiwibWV0YWRhdGEiOnsidGl0bGUiOiJrYi03IiwiZGVzY3JpcHRpb24iOm51bGwsIm1lZGlhIjpudWxsLCJtZWRpYV9oYXNoIjpudWxsLCJjb3BpZXMiOm51bGwsImlzc3VlZF9hdCI6bnVsbCwiZXhwaXJlc19hdCI6bnVsbCwic3RhcnRzX2F0IjpudWxsLCJ1cGRhdGVkX2F0IjpudWxsLCJleHRyYSI6bnVsbCwicmVmZXJlbmNlIjpudWxsLCJyZWZlcmVuY2VfaGFzaCI6bnVsbH0sImFwcHJvdmVkX2FjY291bnRfaWRzIjp7fX0=",
              },
            },
          },
        },
        {
          receipt: {
            block_height: 274111789,
            predecessor_id: "kb2.satchel-spk-chain-e9ea1a.testnet",
            receiver_id: "satchel-spk-chain-e9ea1a.testnet",
            receipt_id: "3XXLYENEehAuvzv3p3H9SGU7t6MCTpGsQWSJ5xM7mBZ3",
            receipt: { Action: { signer_id: "satchel-spk-chain-e9ea1a.testnet", actions: [{ Transfer: { deposit: "4270000000000000000000" } }] } },
          },
          execution_outcome: {
            block_height: 274111789,
            block_timestamp: 1792595024921161700,
            id: "3XXLYENEehAuvzv3p3H9SGU7t6MCTpGsQWSJ5xM7mBZ3",
            outcome: {
              logs: [],
              receipt_ids: ["DRoToTPudEPRLN2mhE2zfJrtsHUKhaqJWC6nBpv7NGTg"],
              executor_id: "satchel-spk-chain-e9ea1a.testnet",
              status: { SuccessValue: "" },
            },
          },
        },
        {
          receipt: {
            block_height: 274111789,
            predecessor_id: "system",
            receiver_id: "satchel-spk-chain-e9ea1a.testnet",
            receipt_id: "129GGwPLpUuAgvLbeNra4v84WwWdR94YYYmcuTVW11JD",
            receipt: { Action: { signer_id: "satchel-spk-chain-e9ea1a.testnet", actions: [{ Transfer: { deposit: "190694273476287600000000" } }] } },
          },
          execution_outcome: {
            block_height: 274111789,
            block_timestamp: 1792595024921161700,
            id: "129GGwPLpUuAgvLbeNra4v84WwWdR94YYYmcuTVW11JD",
            outcome: { logs: [], receipt_ids: [], executor_id: "satchel-spk-chain-e9ea1a.testnet", status: { SuccessValue: "" } },
          },
        },
      ],
      data_receipts: [],
    },
    {
      transaction: {
        signer_id: "satchel-spk-sdk-e9ea1a.testnet",
        public_key: "ed25519:bvXRiiHUb72EoCE285nBJ3dcPzqcAV82eAP8j8d9iAK",
        nonce: 274087472000001,
        receiver_id: "hello.satchel-spk-sdk-e9ea1a.testnet",
        actions: [
          "CreateAccount",
          { Transfer: { deposit: "2000000000000000000000000" } },
          { AddKey: { public_key: "ed25519:49y8ocozK1BJ1Y7J4ptPCcSAAJAqNZMWg9K6UP15CKDg", access_key: { nonce: 0, permission: "FullAccess" } } },
        ],
        priority_fee: 0,
        hash: "7PX6TLCddZ6vT7nCYdCjitfsKvyXEy9FryymKNiM2bLt",
      },
      execution_outcome: {
        block_height: 274089941,
        block_timestamp: 1792582563468257500,
        id: "7PX6TLCddZ6vT7nCYdCjitfsKvyXEy9FryymKNiM2bLt",
        outcome: {
          logs: [],
          receipt_ids: ["8ZoN8yfmCHNNbcMiZeDQ6ZRKkUbZmm6TSAjEAvY6aabw"],
          executor_id: "satchel-spk-sdk-e9ea1a.testnet",
          status: { SuccessReceiptId: "8ZoN8yfmCHNNbcMiZeDQ6ZRKkUbZmm6TSAjEAvY6aabw" },
        },
      },
      receipts: [
        {
          receipt: {
            block_height: 274089942,
            predecessor_id: "satchel-spk-sdk-e9ea1a.testnet",
            receiver_id: "hello.satchel-spk-sdk-e9ea1a.testnet",
            receipt_id: "8ZoN8yfmCHNNbcMiZeDQ6ZRKkUbZmm6TSAjEAvY6aabw",
            receipt: {
              Action: {
                signer_id: "satchel-spk-sdk-e9ea1a.testnet",
                actions: [
                  "CreateAccount",
                  { Transfer: { deposit: "2000000000000000000000000" } },
                  {
                    AddKey: { public_key: "ed25519:49y8ocozK1BJ1Y7J4ptPCcSAAJAqNZMWg9K6UP15CKDg", access_key: { nonce: 0, permission: "FullAccess" } },
                  },
                ],
              },
            },
          },
          execution_outcome: {
            block_height: 274089942,
            block_timestamp: 1792582563824384300,
            id: "8ZoN8yfmCHNNbcMiZeDQ6ZRKkUbZmm6TSAjEAvY6aabw",
            outcome: {
              logs: [],
              receipt_ids: ["CCLK7mLGDB6Y2dsFkRFpBgiKqtSpWjfqdaPWJpafnsg4"],
              executor_id: "hello.satchel-spk-sdk-e9ea1a.testnet",
              status: { SuccessValue: "" },
            },
          },
        },
        {
          receipt: {
            block_height: 274089943,
            predecessor_id: "system",
            receiver_id: "satchel-spk-sdk-e9ea1a.testnet",
            receipt_id: "CCLK7mLGDB6Y2dsFkRFpBgiKqtSpWjfqdaPWJpafnsg4",
            receipt: { Action: { signer_id: "satchel-spk-sdk-e9ea1a.testnet", actions: [{ Transfer: { deposit: "492452918750000000000" } }] } },
          },
          execution_outcome: {
            block_height: 274089943,
            block_timestamp: 1792582564380001800,
            id: "CCLK7mLGDB6Y2dsFkRFpBgiKqtSpWjfqdaPWJpafnsg4",
            outcome: { logs: [], receipt_ids: [], executor_id: "satchel-spk-sdk-e9ea1a.testnet", status: { SuccessValue: "" } },
          },
        },
      ],
      data_receipts: [],
    },
  ],
};

/** The recorded shapes are the app's `FastnearTx` (checked by the compiler, without excess-property checks). */
export const KEYLESS_BIRTH: FastnearTx = RECORDED_TXS.transactions[0];
export const KEYED_CREATION: FastnearTx = RECORDED_TXS.transactions[1];
