;; Throwaway spike contract (NOT product code): minimal NEP-141 receiver.
;; ft_on_transfer logs predecessor + raw input, then returns "250000" (unused amount to refund).
(module
  (import "env" "predecessor_account_id" (func $pred (param i64)))
  (import "env" "input" (func $input (param i64)))
  (import "env" "register_len" (func $rlen (param i64) (result i64)))
  (import "env" "read_register" (func $rreg (param i64 i64)))
  (import "env" "log_utf8" (func $log (param i64 i64)))
  (import "env" "value_return" (func $ret (param i64 i64)))
  (memory 1)
  (export "memory" (memory 0))
  (data (i32.const 0) "pred=")
  (data (i32.const 1024) "input=")
  (data (i32.const 32) "\"250000\"")
  (func (export "ft_on_transfer")
    (local $n i64)
    ;; log "pred=<predecessor>" : prefix at 0 (5 bytes), register 0 copied to 5
    (call $pred (i64.const 0))
    (local.set $n (call $rlen (i64.const 0)))
    (call $rreg (i64.const 0) (i64.const 5))
    (call $log (i64.add (local.get $n) (i64.const 5)) (i64.const 0))
    ;; log "input=<json args>" : prefix "input=" sits at 1024 (6 bytes), args copied to 1030
    (call $input (i64.const 1))
    (local.set $n (call $rlen (i64.const 1)))
    (call $rreg (i64.const 1) (i64.const 1030))
    (call $log (i64.add (local.get $n) (i64.const 6)) (i64.const 1024))
    ;; return JSON string "250000" => token contract refunds 250000 units to sender
    (call $ret (i64.const 8) (i64.const 32)))
)
