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
  (data (i32.const 2048) "\45\56\45\4e\54\5f\4a\53\4f\4e\3a\7b\22\73\74\61\6e\64\61\72\64\22\3a\22\6e\65\70\31\37\31\22\2c\22\76\65\72\73\69\6f\6e\22\3a\22\31\2e\32\2e\30\22\2c\22\65\76\65\6e\74\22\3a\22\6e\66\74\5f\74\72\61\6e\73\66\65\72\22\2c\22\64\61\74\61\22\3a\5b\7b\22\6f\6c\64\5f\6f\77\6e\65\72\5f\69\64\22\3a\22\73\61\74\63\68\65\6c\2d\73\70\6b\2d\70\61\79\2d\65\39\65\61\31\61\2e\74\65\73\74\6e\65\74\22\2c\22\6e\65\77\5f\6f\77\6e\65\72\5f\69\64\22\3a\22\73\65\6c\6c\65\72\2e\73\61\74\63\68\65\6c\2d\73\70\6b\2d\70\61\79\2d\65\39\65\61\31\61\2e\74\65\73\74\6e\65\74\22\2c\22\74\6f\6b\65\6e\5f\69\64\73\22\3a\5b\22\31\22\5d\7d\5d\7d")
  (data (i32.const 4096) "\45\56\45\4e\54\5f\4a\53\4f\4e\3a\7b\22\73\74\61\6e\64\61\72\64\22\3a\22\73\61\74\63\68\65\6c\22\2c\22\76\65\72\73\69\6f\6e\22\3a\22\31\2e\30\2e\30\22\2c\22\65\76\65\6e\74\22\3a\22\73\69\67\6e\61\74\75\72\65\5f\69\73\73\75\65\64\22\2c\22\64\61\74\61\22\3a\7b\22\74\6f\6b\65\6e\5f\69\64\22\3a\22\31\22\2c\22\63\68\61\69\6e\22\3a\22\65\76\6d\22\2c\22\70\61\79\6c\6f\61\64\5f\68\61\73\68\22\3a\22\64\30\39\64\64\31\64\63\38\30\63\30\61\34\61\31\31\63\35\64\33\63\66\66\34\64\32\34\62\39\30\36\31\32\62\64\66\36\61\30\39\38\37\37\63\62\63\34\32\63\61\64\33\33\30\35\31\37\33\61\61\34\61\35\22\2c\22\6f\77\6e\65\72\5f\69\64\22\3a\22\73\65\6c\6c\65\72\2e\73\61\74\63\68\65\6c\2d\73\70\6b\2d\70\61\79\2d\65\39\65\61\31\61\2e\74\65\73\74\6e\65\74\22\7d\7d")
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

  ;; emit(): logs one standard NEP-171 nft_transfer event and one custom satchel event (fixed strings)
  (func (export "emit")
    (call $log (i64.const 205) (i64.const 2048))
    (call $log (i64.const 249) (i64.const 4096)))
)
