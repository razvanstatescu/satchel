// Throwaway colour utilities for the ux spec (WCAG 2.x contrast, alpha compositing, OKLCH->sRGB).
export const hex2rgb = (h) => { h = h.replace('#',''); if (h.length===3) h=[...h].map(c=>c+c).join(''); return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255); };
export const rgb2hex = (rgb) => '#' + rgb.map(v => Math.round(Math.min(1,Math.max(0,v))*255).toString(16).padStart(2,'0')).join('').toUpperCase();
const lin = (c) => c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
const gam = (c) => c <= 0.0031308 ? 12.92*c : 1.055*Math.pow(c,1/2.4)-0.055;
export const lum = (rgb) => { const [r,g,b] = rgb.map(lin); return 0.2126*r + 0.7152*g + 0.0722*b; };
export const contrast = (a, b) => { const la = lum(typeof a==='string'?hex2rgb(a):a), lb = lum(typeof b==='string'?hex2rgb(b):b); const [hi,lo] = la>lb?[la,lb]:[lb,la]; return (hi+0.05)/(lo+0.05); };
// composite fg (rgb, alpha) over bg (rgb) in sRGB space (what browsers do for normal blending)
export const over = (fg, alpha, bg) => fg.map((v,i)=> v*alpha + bg[i]*(1-alpha));
export function oklch2rgb(L, C, H) {
  const h = H*Math.PI/180, a = C*Math.cos(h), b = C*Math.sin(h);
  const l_ = L + 0.3963377774*a + 0.2158037573*b;
  const m_ = L - 0.1055613458*a - 0.0638541728*b;
  const s_ = L - 0.0894841775*a - 1.2914855480*b;
  const l = l_**3, m = m_**3, s = s_**3;
  const r =  4.0767416621*l - 3.3077115913*m + 0.2309699292*s;
  const g = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s;
  const bb= -0.0041960863*l - 0.7034186147*m + 1.7076147010*s;
  return [r,g,bb].map(gam);
}
export const inGamut = (rgb) => rgb.every(v => v >= -1e-6 && v <= 1+1e-6);
// CSS-Color-4-style simple gamut map: keep L,H; bisect chroma down until in sRGB gamut
export function oklchToHexClamped(L, C, H) {
  let rgb = oklch2rgb(L, C, H); if (inGamut(rgb)) return rgb2hex(rgb);
  let lo = 0, hi = C; for (let i=0;i<24;i++){ const mid=(lo+hi)/2; if (inGamut(oklch2rgb(L,mid,H))) lo=mid; else hi=mid; }
  return rgb2hex(oklch2rgb(L, lo, H));
}
export function rgb2oklch(rgb) {
  const [r,g,b] = rgb.map(lin);
  const l = Math.cbrt(0.4122214708*r + 0.5363325363*g + 0.0514459929*b);
  const m = Math.cbrt(0.2119034982*r + 0.6806995451*g + 0.1073969566*b);
  const s = Math.cbrt(0.0883024619*r + 0.2817188376*g + 0.6299787005*b);
  const L = 0.2104542553*l + 0.7936177850*m - 0.0040720468*s;
  const A = 1.9779984951*l - 2.4285922050*m + 0.4505937099*s;
  const B = 0.0259040371*l + 0.7827717662*m - 0.8086757660*s;
  const C = Math.sqrt(A*A+B*B); let H = Math.atan2(B,A)*180/Math.PI; if (H<0) H+=360;
  return [L, C, H];
}
