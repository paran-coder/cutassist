import {uid,validateClips,buildBoundaries} from './2026-10-16-model.mjs';
export function copyVideoState(s){return {...s,clips:s.clips.map(c=>({...c,...(c.color?{color:{...c.color}}:{})})),selectedIds:[...(s.selectedIds||[])],boundaries:structuredClone(s.boundaries),cues:structuredClone(s.cues||[]),reviews:structuredClone(s.reviews||[])};}
function duplicateNotes(notes,oldId,newId,start,end,unique){return notes.filter(n=>n.clipId===oldId&&n.end>start&&n.start<end).map(n=>({...n,...(unique?{id:uid()}:{}),clipId:newId,start:Math.max(start,n.start),end:Math.min(end,n.end)}));}
export function clipClipboard(s,id){const c=s.clips.find(c=>c.id===id);if(!c)throw Error('영상을 선택하세요.');return {clip:{...c},cues:duplicateNotes(s.cues||[],id,id,c.in,c.out,false),reviews:duplicateNotes(s.reviews||[],id,id,c.in,c.out,false)};}
export function editVideo(state,op){
 const s=copyVideoState(state);let cursor=0,index=s.clips.length,offset=0;const total=s.clips.reduce((n,c)=>n+c.out-c.in,0),time=Math.max(0,Math.min(total,op.time??s.time??0));
 for(let i=0;i<s.clips.length;i++){const len=s.clips[i].out-s.clips[i].in;if(time<cursor+len-.000001){index=i;offset=time-cursor;break;}cursor+=len;}
 function split(i,d){const c=s.clips[i];if(!c||d<.15-1e-8||c.out-c.in-d<.15-1e-8)throw Error('분할한 양쪽 영상은 각각 0.15초 이상이어야 합니다.');const point=c.in+d,right={...c,id:uid(),in:point};s.clips.splice(i,1,{...c,out:point},right);for(const key of ['cues','reviews']){const notes=s[key];s[key]=[...notes.filter(n=>n.clipId!==c.id),...duplicateNotes(notes,c.id,c.id,c.in,point,false),...duplicateNotes(notes,c.id,right.id,point,c.out,true)];}return right;}
 if(op.type==='split'){const r=split(index,offset);s.selectedClip=r.id;s.selectedIds=[r.id];s.time=time;}
 else if(op.type==='paste'){const items=op.clipboard?.items||(op.clipboard?.clip?[op.clipboard]:[]);if(!items.length)throw Error('먼저 영상을 복사하세요.');if(offset>.000001){split(index,offset);index++;}s.selectedIds=[];for(const item of items){const c={...item.clip,id:uid(),...(item.clip.color?{color:{...item.clip.color}}:{})};s.clips.splice(index++,0,c);s.cues.push(...duplicateNotes(item.cues,item.clip.id,c.id,c.in,c.out,true));s.reviews.push(...duplicateNotes(item.reviews,item.clip.id,c.id,c.in,c.out,true));s.selectedIds.push(c.id);}s.selectedClip=s.selectedIds[0];s.time=time;}
 else if(op.type==='delete'){const ids=op.ids||[op.id],i=s.clips.findIndex(c=>ids.includes(c.id));if(i<0)throw Error('영상을 선택하세요.');s.clips=s.clips.filter(c=>!ids.includes(c.id));s.cues=s.cues.filter(c=>!ids.includes(c.clipId));s.reviews=s.reviews.filter(c=>!ids.includes(c.clipId));s.selectedClip=s.clips[Math.min(i,s.clips.length-1)]?.id;s.selectedIds=s.selectedClip?[s.selectedClip]:[];}
 else throw Error('지원하지 않는 편집입니다.');
 s.mode='clip';if(s.clips.length)validateClips(s.clips);s.boundaries=s.clips.length?buildBoundaries(s.clips,s.boundaries):[];
 // Edited ranges can invalidate even locked transition lengths.
 s.boundaries=s.boundaries.map((b,i)=>b.seconds>Math.min(2,(s.clips[i].out-s.clips[i].in)/2,(s.clips[i+1].out-s.clips[i+1].in)/2)?{...b,kind:'cut',seconds:0,locked:false,reason:'구간 변경 · 전환 길이 초기화'}:b);
 s.time=Math.min(s.time||0,s.clips.reduce((n,c)=>n+c.out-c.in,0));return s;
}
export class VideoHistory{
 constructor(limit=50){this.limit=limit;this.past=[];this.future=[];}
 get canUndo(){return !!this.past.length;}get canRedo(){return !!this.future.length;}
 push(s){this.past.push(copyVideoState(s));if(this.past.length>this.limit)this.past.shift();this.future=[];}
 undo(current){if(!this.canUndo)return null;this.future.push(copyVideoState(current));return this.past.pop();}
 redo(current){if(!this.canRedo)return null;this.past.push(copyVideoState(current));return this.future.pop();}
 clear(){this.past=[];this.future=[];}
}

export function clipGroupClipboard(s,ids){const items=s.clips.filter(c=>ids.includes(c.id)).map(c=>clipClipboard(s,c.id));if(!items.length)throw Error('영상을 선택하세요.');return {items};}
