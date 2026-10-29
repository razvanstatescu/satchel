import { contrast, hex2rgb, rgb2hex, over, oklchToHexClamped } from './color.mjs';
import { fnv1a32 } from './card_seed.mjs';
const r = (x) => x.toFixed(2);
const WORST = '#93AB99'; // worst-case card pixel from card_seed.mjs sweep (ids 1..100000)
const GLASS = '#08090B';
for (const a of [0.48, 0.72]) {
  const comp = rgb2hex(over(hex2rgb(GLASS), a, hex2rgb(WORST)));
  console.log(`glass ${a}: composite ${comp} | fg #F3F5F8 ${r(contrast('#F3F5F8',comp))} | fg2 #B4BBC5 ${r(contrast('#B4BBC5',comp))} | btcFg #FFA94D ${r(contrast('#FFA94D',comp))} | btc #F7931A ${r(contrast('#F7931A',comp))} | ethFg #9AABF5 ${r(contrast('#9AABF5',comp))} | solFg #C09BFF ${r(contrast('#C09BFF',comp))} | success ${r(contrast('#4ADE9B',comp))} | frozen ${r(contrast('#9AD8FF',comp))} | listed ${r(contrast('#E8C77A',comp))} | warning ${r(contrast('#F6C453',comp))} | info ${r(contrast('#7DB8FF',comp))}`);
}
// metal CTA stops with on-metal text
for (const m of ['#E9EDF2','#C7CFD8','#AEB8C4']) console.log('onMetal #0A0B0D on', m, r(contrast('#0A0B0D', m)));
console.log('metal hover #F4F6F9', r(contrast('#0A0B0D','#F4F6F9')));
console.log('dangerSolid #CF3B40: white', r(contrast('#FFFFFF','#CF3B40')), '| vs bg', r(contrast('#CF3B40','#0A0B0D')));
console.log('ring #8CC8FF vs bg', r(contrast('#8CC8FF','#0A0B0D')), 'vs surface2', r(contrast('#8CC8FF','#181B20')), 'vs metal #E9EDF2 (why offset is needed)', r(contrast('#8CC8FF','#E9EDF2')));
console.log('btc brand text on btc soft (14% over surface1):', r(contrast('#F7931A', rgb2hex(over(hex2rgb('#F7931A'),0.14,hex2rgb('#111317'))))));
// Seeded account avatar: hue from fnv1a32(accountId), oklch(0.74 0.12 h), initial in #0A0B0D
let minAv = 99, maxAv = 0, worstH = 0;
for (let h = 0; h < 360; h += 1) { const c = oklchToHexClamped(0.74, 0.12, h); const k = contrast('#0A0B0D', c); if (k < minAv) { minAv = k; worstH = h; } maxAv = Math.max(maxAv, k); }
console.log('avatar oklch(0.74 0.12 h) with #0A0B0D initial: min', r(minAv), '@h', worstH, 'max', r(maxAv), '| ring vs bg min', r(Math.min(...Array.from({length:360},(_,h)=>contrast(oklchToHexClamped(0.74,0.12,h),'#0A0B0D')))));
for (const id of ['alice.testnet','bob.testnet','satchel-buyer.testnet']) { const h = fnv1a32(id) % 360; console.log('avatar', id, 'hue', h, oklchToHexClamped(0.74, 0.12, h)); }
// muted/secondary on dialog surface (surface2) and input (surface3) already checked; placeholder
console.log('placeholder fgMuted #8F98A5 on surface3 #20242A', r(contrast('#8F98A5','#20242A')));
console.log('fgDisabled #5D6570 on surface2 (exempt, info)', r(contrast('#5D6570','#181B20')));
