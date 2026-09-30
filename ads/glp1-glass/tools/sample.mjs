import {load,hex} from './raw.mjs';
for (const f of process.argv.slice(2)){
  const {w,h,data}=load(f); const c=new Map();
  for(let i=0;i<data.length;i+=4){const k=hex(data[i]&~3,data[i+1]&~3,data[i+2]&~3); c.set(k,(c.get(k)||0)+1);}
  const top=[...c].sort((a,b)=>b[1]-a[1]).slice(0,10);
  const px=(x,y)=>{const i=(y*w+x)*4;return hex(data[i],data[i+1],data[i+2]);};
  console.log(f,w+'x'+h,'corners',px(2,2),px(w-3,2),px(2,h-3),px(w-3,h-3));
  console.log('  top',top.map(([k,v])=>`${k}:${(100*v/(w*h)).toFixed(1)}%`).join(' '));
}
