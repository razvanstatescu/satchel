import { spring } from "motion";
function m(name, opts, from, to) { const g = spring({ keyframes:[from,to], ...opts }); const d = to-from; let t95=null,t99=null,peak=from,last=0,done=null; for (let t=0;t<=5000;t++){ const s=g.next(t); const p=(s.value-from)/d; if(t95===null&&p>=0.95)t95=t; if(t99===null&&p>=0.99)t99=t; if((d>0&&s.value>peak)||(d<0&&s.value<peak))peak=s.value; if(Math.abs(p-1)>0.01)last=t; if(s.done){done=t;break;} } console.log(name, JSON.stringify({t95,t99,settle1pct:last,done,overshootPct:+(((peak-to)/d)*100).toFixed(2)})); }
m('vd0.6 b0.2 slide 240', { visualDuration: 0.6, bounce: 0.2 }, 0, 240);
m('vd0.7 b0.2 slide 240', { visualDuration: 0.7, bounce: 0.2 }, 0, 240);
m('B 120/18/1.2 slide 520 (desktop)', { stiffness:120, damping:18, mass:1.2 }, 0, 520);
m('lift rotate 0->6 peak check', { stiffness:260, damping:22, mass:1 }, 0, 6);
