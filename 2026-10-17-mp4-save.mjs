export async function chooseMp4Save(name,host=globalThis){
 if(typeof host.showSaveFilePicker!=='function')return {kind:'download',name};
 const handle=await host.showSaveFilePicker({id:'cutassist-mp4',suggestedName:name,types:[{description:'MP4 영상',accept:{'video/mp4':['.mp4']}}],excludeAcceptAllOption:true});
 return {kind:'file',handle,name:handle.name};
}
export async function writeMp4Save(target,blob){
 if(target.kind!=='file')throw Error('직접 저장할 파일이 선택되지 않았습니다.');
 const stream=await target.handle.createWritable();try{await stream.write(blob);await stream.close();}catch(e){try{await stream.abort();}catch{}throw e;}
}
