import {load,hex} from './raw.mjs';
const [f,axis,...pos]=process.argv.slice(2); const {w,h,data}=load(f);
const px=(x,y)=>{const i=(y*w+x)*4;return [data[i],data[i+1],data[i+2]];};
for(const p of pos.map(Number)){ const out=[]; const N=axis==='y'?w:h;
  for(let k=0;k<N;k+=Math.max(1,Math.floor(N/48))){ const [r,g,b]=axis==='y'?px(k,p):px(p,k); out.push(`${k}:${hex(r,g,b)}`);} console.log(axis+'='+p, out.join(' ')); }
