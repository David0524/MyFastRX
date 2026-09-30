// Load any image as raw RGBA via ffmpeg: {w,h,data}
import {execFileSync} from 'node:child_process';
export function load(file){
  const [w,h]=execFileSync('ffprobe',['-v','error','-show_entries','stream=width,height','-of','csv=p=0',file]).toString().trim().split(',').map(Number);
  const data=execFileSync('ffmpeg',['-v','error','-i',file,'-f','rawvideo','-pix_fmt','rgba','-'],{maxBuffer:1<<30});
  return {w,h,data};
}
export const hex=(r,g,b)=>'#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase();
