import {load,hex} from './raw.mjs';
const {w,h,data}=load('images/vial_semaglutide.png');
const px=(x,y)=>{const i=(y*w+x)*4;return [data[i],data[i+1],data[i+2]];};
const [x,y0,y1,st]=process.argv.slice(2).map(Number);
let s=''; for(let y=y0;y<=y1;y+=st){const p=px(x,y); s+=`${y}:${hex(...p)} `;} console.log('x='+x,s);
