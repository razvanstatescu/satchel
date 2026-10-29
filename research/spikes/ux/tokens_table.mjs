// Emits the [VERIFIED] contrast table for kb/81-design-tokens.md (WCAG 2.x relative-luminance formula).
import { contrast, hex2rgb, rgb2hex, over } from './color.mjs';
const C = {
  '--bg':'#0A0B0D','--surface-1':'#111317','--surface-2':'#181B20','--surface-3':'#20242A','--surface-4':'#2A2F37',
  '--fg':'#F3F5F8','--fg-2':'#B4BBC5','--fg-muted':'#8F98A5',
  '--link':'#8CC8FF','--success':'#4ADE9B','--warning':'#F6C453','--danger':'#FF7A7A','--info':'#7DB8FF',
  '--state-frozen':'#9AD8FF','--state-listed':'#E8C77A',
  '--chain-btc-fg':'#FFA94D','--chain-eth-fg':'#9AABF5','--chain-sol-fg':'#C09BFF',
  '--chain-btc':'#F7931A','--chain-eth':'#627EEA','--chain-sol':'#9945FF','--chain-sol-2':'#14F195',
  '--ring':'#8CC8FF','--line-input':'#69717D',
};
const S = ['--bg','--surface-1','--surface-2','--surface-3'];
const text = ['--fg','--fg-2','--fg-muted','--link','--success','--warning','--danger','--info','--state-frozen','--state-listed','--chain-btc-fg','--chain-eth-fg','--chain-sol-fg'];
const nontext = ['--chain-btc','--chain-eth','--chain-sol','--chain-sol-2','--ring','--line-input'];
console.log('| Foreground | ' + S.join(' | ') + ' | Min | Need | Result |');
console.log('|---|' + S.map(()=> '---:').join('|') + '|---:|---:|---|');
const row = (k, need) => { const v = S.map(s => contrast(C[k], C[s])); const m = Math.min(...v); console.log(`| \`${k}\` ${C[k]} | ${v.map(x=>x.toFixed(2)).join(' | ')} | ${m.toFixed(2)} | ${need}:1 | ${m>=need?'pass':'**fail (see note)**'} |`); };
text.forEach(k => row(k, 4.5)); nontext.forEach(k => row(k, 3));
console.log('\nTinted pills (colour at 14% over surface):');
console.log('| Text = tint colour | on 14% tint over --surface-1 | on 14% tint over --surface-2 |'); console.log('|---|---:|---:|');
for (const k of ['--success','--warning','--danger','--info','--state-frozen','--state-listed','--chain-btc-fg','--chain-eth-fg','--chain-sol-fg','--fg-2']) {
  const a = rgb2hex(over(hex2rgb(C[k]),0.14,hex2rgb(C['--surface-1']))), b = rgb2hex(over(hex2rgb(C[k]),0.14,hex2rgb(C['--surface-2'])));
  console.log(`| \`${k}\` | ${contrast(C[k],a).toFixed(2)} (${a}) | ${contrast(C[k],b).toFixed(2)} (${b}) |`);
}
