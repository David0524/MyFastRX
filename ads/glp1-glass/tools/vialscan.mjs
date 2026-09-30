import {load,hex} from './raw.mjs';
const {w,h,data}=load('images/vial_semaglutide.png');
const px=(x,y)=>{const i=(y*w+x)*4;return [data[i],data[i+1],data[i+2]];};
for(let y=200;y<1536;y+=20){
  const bl=px(40,y), br=px(w-40,y); const bg=bl.map((v,i)=>(v+br[i])/2);
  let L=-1,R=-1;
  for(let x=60;x<w-60;x++){const p=px(x,y); const d=Math.abs(p[0]-bg[0])+Math.abs(p[1]-bg[1])+Math.abs(p[2]-bg[2]); if(d>18){ if(L<0)L=x; R=x; }}
  const c=px(512,y);
  console.log(y,'bg',hex(...bg),'L',L,'R',R,'center',hex(...c), 'x=L+15', L>0?hex(...px(L+15,y)):'');
}
