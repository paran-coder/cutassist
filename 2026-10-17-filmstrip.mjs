import {loadFile,seekClip,disposeClip} from './2026-10-08-media-v1.2.0.mjs';
export function frameTiles(c,scale,left,right){
 if(!(scale>0)||!(c.out>c.in))return [];
 const width=Math.max(12,(c.out-c.in)*scale),tile=Math.max(32,Math.min(120,Math.round(56*c.width/c.height))),start=Math.max(0,left),end=Math.min(width,right),out=[];
 for(let x=Math.floor(start/tile)*tile;x<end;x+=tile){const a=Math.max(start,x),b=Math.min(end,x+tile);if(b>a)out.push({x:a,width:b-a,time:Math.min(c.out-.001,c.in+((a+b)/2/width)*(c.out-c.in))});}return out;
}
// One independent muted decoder; cache contains at most 256 small canvases.
export function createFilmstrip(viewport){
 let rows=[],scale=1,epoch=0,controller=null,running=false,scheduled=0,dead=false;
 const cache=new Map(),fileIds=new WeakMap();let serial=0;
 function schedule(){if(dead)return;epoch++;controller?.abort();if(!scheduled)scheduled=requestAnimationFrame(()=>{scheduled=0;refresh();});}
 function reset(next,s){rows=next;scale=s;schedule();}
 async function refresh(){
  if(dead||running)return;running=true;const token=epoch;controller=new AbortController();const signal=controller.signal;let media=null,currentFile=null;
  try{const visibleLeft=viewport.scrollLeft+62,visibleRight=viewport.scrollLeft+viewport.clientWidth;
   for(const {clip,canvas,start} of rows){if(token!==epoch||dead)break;const x=62+start*scale,width=Math.max(12,(clip.out-clip.in)*scale),left=Math.max(0,visibleLeft-x),right=Math.min(width,visibleRight-x);
    canvas.dataset.frames='0';canvas.dataset.ready='false';if(right<=left){canvas.width=1;canvas.style.display='none';continue;}canvas.style.display='block';canvas.style.left=left+'px';canvas.style.width=(right-left)+'px';canvas.width=Math.max(1,Math.ceil(right-left));canvas.height=56;const ctx=canvas.getContext('2d');ctx.fillStyle='#142529';ctx.fillRect(0,0,canvas.width,56);const tiles=frameTiles(clip,scale,left,right);let done=0;
    for(const t of tiles){if(token!==epoch||dead)break;if(!fileIds.has(clip.file))fileIds.set(clip.file,++serial);const key=fileIds.get(clip.file)+':'+t.time.toFixed(3);let frame=cache.get(key);
     if(!frame){if(currentFile!==clip.file){disposeClip(media);media=null;media=await loadFile(clip.file,signal);currentFile=clip.file;}await seekClip(media,t.time,signal);if(token!==epoch||dead)break;frame=document.createElement('canvas');frame.width=Math.max(1,Math.round(56*clip.width/clip.height));frame.width=Math.min(120,frame.width);frame.height=56;const f=frame.getContext('2d');f.fillStyle='#090c10';f.fillRect(0,0,frame.width,56);const k=Math.min(frame.width/media.width,56/media.height),w=media.width*k,h=media.height*k;f.drawImage(media.video,(frame.width-w)/2,(56-h)/2,w,h);cache.set(key,frame);if(cache.size>256)cache.delete(cache.keys().next().value);
     }else{cache.delete(key);cache.set(key,frame);}
     ctx.drawImage(frame,t.x-left,0,t.width,56);done++;canvas.dataset.frames=String(done);
    }
    canvas.dataset.sourceStart=String(clip.in);canvas.dataset.sourceEnd=String(clip.out);canvas.dataset.ready=String(done===tiles.length&&token===epoch);
   }
  }catch(e){if(e.name!=='AbortError')for(const r of rows)r.canvas.title='프레임 미리보기 실패 · 플레이어에서 확인하세요.';}
  finally{disposeClip(media);running=false;if(token!==epoch&&!dead)schedule();}
 }
 viewport.addEventListener('scroll',schedule,{passive:true});
 return {reset,destroy(){dead=true;epoch++;controller?.abort();cancelAnimationFrame(scheduled);viewport.removeEventListener('scroll',schedule);cache.clear();rows=[];}};
}
