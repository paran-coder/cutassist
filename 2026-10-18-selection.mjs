export function chooseSelection(clips,previous,id,{toggle=false,range=false,anchor=null,tail=false}={}){
 const all=clips.map(c=>c.id),at=all.indexOf(id);if(at<0)return previous.filter(x=>all.includes(x));let selected;
 if(tail)selected=all.slice(at);else if(range&&all.includes(anchor)){const from=all.indexOf(anchor);selected=all.slice(Math.min(at,from),Math.max(at,from)+1);}else if(toggle)selected=previous.includes(id)?previous.filter(x=>x!==id):[...previous,id];else selected=[id];return all.filter(x=>selected.includes(x));
}
export function reorderSelection(clips,ids,target,side='before'){
 const selected=new Set(ids);if(selected.has(target)||!clips.some(c=>c.id===target))return [...clips];const group=clips.filter(c=>selected.has(c.id)),remaining=clips.filter(c=>!selected.has(c.id));const index=remaining.findIndex(c=>c.id===target)+(side==='after'?1:0);remaining.splice(index,0,...group);return remaining;
}
export const targetBoundaries=(boundaries,ids)=>boundaries.filter(b=>ids.includes(b.leftId)&&ids.includes(b.rightId)).map(b=>b.id);
export function changeTransitions(boundaries,clips,ids,{kind,seconds=0}){
 if(!['cut','dissolve','fade'].includes(kind))throw Error('지원하지 않는 전환입니다.');const targets=new Set(ids);
 for(let i=0;i<boundaries.length;i++){if(!targets.has(boundaries[i].id))continue;const max=Math.min(2,(clips[i].out-clips[i].in)/2,(clips[i+1].out-clips[i+1].in)/2);if(!Number.isFinite(seconds)||(kind!=='cut'&&(!(seconds>0)||seconds>max)))throw Error('전환 길이가 선택 구간에 비해 깁니다.');}
 return boundaries.map(b=>targets.has(b.id)?{...b,kind,seconds:kind==='cut'?0:seconds,locked:true,userEdited:true,reason:kind==='cut'?'사용자가 전환을 제거했습니다.':'선택 클립 사이에 전환을 적용했습니다.',ideas:[]}:b);
}
