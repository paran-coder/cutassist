import {DRAFT_LOCATION} from './2026-10-17-portable-export.mjs';
const MAX=512*1024*1024, INDEX='root_meta_info.json';
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const safe=s=>typeof s==='string'&&s.length>0&&s.length<=180&&!/[\\/:<>"|?*\x00-\x1f]/.test(s)&&s!=='.'&&s!=='..'&&!/[. ]$/.test(s)&&! /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(s);
async function fileText(dir,name){const file=await (await dir.getFileHandle(name)).getFile();if(file.size>16*1024*1024)throw Error('JSON 파일은 16MiB 이하만 읽을 수 있습니다.');return file.text();}
function parse(raw,label){try{const v=JSON.parse(raw);if(!object(v))throw Error();return v;}catch{throw Error(label+' JSON 형식이 올바르지 않습니다.');}}
export async function inspectRoot(handle){
 const raw=await fileText(handle,INDEX),index=parse(raw,'캡컷 목록');
 const path=typeof index.root_path==='string'?index.root_path.replaceAll('\\','/').replace(/\/+$/,''):'';
 if(!/^[A-Za-z]:\//.test(path)||path.split('/').slice(1).some(s=>!safe(s))||path.split('/').at(-1).toLowerCase()!==handle.name.toLowerCase())throw Error('캡컷 보관 폴더와 root_path가 일치하지 않습니다.');
 if(!Array.isArray(index.all_draft_store)||!index.all_draft_store.every(object)||!Number.isSafeInteger(index.draft_ids)||index.draft_ids<0)throw Error('캡컷 목록 구조가 올바르지 않습니다.');
 return {handle,raw,index,path,name:handle.name};
}
async function scan(dir,prefix='',out=[]){for await(const [name,h]of dir.entries()){if(!safe(name))throw Error('안전하지 않은 프로젝트 파일 이름입니다.');const path=prefix+name;if(h.kind==='directory'){if((!prefix&&!['media','Timelines'].includes(name))||(prefix.startsWith('Timelines/')&&prefix.split('/').filter(Boolean).length>=2))throw Error('지원하지 않는 프로젝트 하위 폴더입니다: '+path);await scan(h,path+'/',out);}else if(h.kind==='file'){if(!prefix&&!/^(draft_content\.json|draft_meta_info\.json|draft_cover\.(jpg|png)|\d{4}-\d{2}-\d{2}-[^/]+\.(json|txt|srt))$/.test(name))throw Error('지원하지 않는 프로젝트 파일입니다: '+path);if(prefix.startsWith('Timelines/')&&!['project.json','draft_content.json'].includes(name))throw Error('지원하지 않는 타임라인 파일입니다: '+path);const f=await h.getFile();out.push({path,handle:h,size:f.size});if(out.length>2000)throw Error('프로젝트 파일 수 제한을 초과했습니다.');}else throw Error('지원하지 않는 파일 형식입니다.');}return out;}
export async function inspectSource(handle){
 if(!safe(handle.name))throw Error('올바르지 않은 프로젝트 폴더 이름입니다.');
 const files=await scan(handle),totalBytes=files.reduce((s,f)=>s+f.size,0),mediaBytes=files.filter(f=>f.path.startsWith('media/')).reduce((s,f)=>s+f.size,0);
 if(mediaBytes>MAX||totalBytes>MAX+16*1024*1024)throw Error('미디어 512MiB 제한을 초과했습니다.');
 const get=async path=>{const f=files.find(f=>f.path===path);if(!f||f.size>16*1024*1024)throw Error('필수 프로젝트 파일이 없거나 너무 큽니다: '+path);return parse(await (await f.handle.getFile()).text(),path);};
 const draft=await get('draft_content.json'),meta=await get('draft_meta_info.json'),project=await get('Timelines/project.json');
 if(!safe(project.id)||!safe(project.main_timeline_id)||meta.draft_id!==project.id||draft.id!==project.main_timeline_id||!Array.isArray(project.timelines)||!project.timelines.some(t=>t.id===draft.id))throw Error('프로젝트 및 타임라인 ID가 일치하지 않습니다.');
 const timeline=await get('Timelines/'+draft.id+'/draft_content.json');
 if(JSON.stringify(timeline)!==JSON.stringify(draft))throw Error('프로젝트 타임라인 내용이 일치하지 않습니다.');
 if(!object(draft.materials)||!Array.isArray(draft.tracks)||!Number.isFinite(draft.duration)||draft.duration<0)throw Error('프로젝트 내용이 올바르지 않습니다.');
 for(const kind of ['videos','audios']){if(draft.materials[kind]!==undefined&&!Array.isArray(draft.materials[kind]))throw Error('미디어 목록이 올바르지 않습니다.');for(const m of draft.materials[kind]||[]){const p=m.path;if(typeof p!=='string'||!p.startsWith(DRAFT_LOCATION+'/media/'))throw Error('v0.7.1 이상에서 저장한 이동 가능한 프로젝트를 선택하세요.');const rel=p.slice(DRAFT_LOCATION.length+1);if(rel.split('/').some(s=>!safe(s))||!files.some(f=>f.path===rel))throw Error('프로젝트 미디어가 누락되었거나 경로가 올바르지 않습니다.');}}
 return {handle,name:handle.name,files,totalBytes,mediaBytes,draft,meta,project,projectId:project.id,timelineId:draft.id};
}
async function write(dir,name,data){const h=await dir.getFileHandle(name,{create:true}),w=await h.createWritable();try{await w.write(data);await w.close();}catch(e){try{await w.abort();}catch{}throw e;}}
async function absent(dir,name){try{await dir.getDirectoryHandle(name);return false;}catch(e){if(e.name!=='NotFoundError')throw e;}try{await dir.getFileHandle(name);return false;}catch(e){if(e.name!=='NotFoundError')throw e;}return true;}
async function uniqueBackup(root){const stem='2026-10-17-root-meta-backup-'+Date.now();for(let i=0;i<100;i++){const n=stem+'-'+i+'.json';if(await absent(root,n))return n;}throw Error('백업 파일 이름을 만들지 못했습니다.');}
export async function registerProject(source,root,{lockManager=globalThis.navigator?.locks,...options}={}){
 if(!lockManager?.request)throw Error('이 브라우저는 동시 등록 보호를 지원하지 않습니다. 최신 Chrome/Edge에서 열어 주세요.');
 return lockManager.request('cutassist-capcut-registration-v1',{mode:'exclusive'},()=>registerProjectUnlocked(source,root,options));
}
async function registerProjectUnlocked(source,root,{closedConfirmed=false,onProgress=()=>{}}={}){
 if(closedConfirmed!==true)throw Error('캡컷을 완전히 종료했는지 먼저 확인하세요.');
 if((await fileText(root.handle,INDEX))!==root.raw)throw Error('캡컷 목록이 변경되었습니다. 보관 폴더를 다시 선택하세요.');
 const fresh=await inspectSource(source.handle);const roster=files=>JSON.stringify(files.map(f=>[f.path,f.size]).sort((a,b)=>a[0].localeCompare(b[0])));if(roster(fresh.files)!==roster(source.files))throw Error('프로젝트 파일 목록이나 크기가 변경되었습니다. 다시 선택하세요.');if(fresh.projectId!==source.projectId||fresh.timelineId!==source.timelineId||JSON.stringify(fresh.meta)!==JSON.stringify(source.meta)||JSON.stringify(fresh.draft)!==JSON.stringify(source.draft))throw Error('원본 프로젝트가 변경되었습니다. 다시 선택하세요.');
 const path=root.path+'/'+fresh.name;if(root.index.all_draft_store.some(e=>String(e.draft_id).toLowerCase()===fresh.projectId.toLowerCase()||String(e.draft_fold_path).replaceAll('\\','/').replace(/\/+$/,'').toLowerCase()===path.toLowerCase()))throw Error('이미 등록된 프로젝트입니다.');
 let target,inPlace=false,created=false;
 try{if(!await absent(root.handle,fresh.name)){target=await root.handle.getDirectoryHandle(fresh.name);inPlace=!!(await target.isSameEntry?.(fresh.handle));if(!inPlace)throw Error('같은 이름의 프로젝트 폴더가 있습니다. 덮어쓰지 않습니다.');}
 if(!inPlace){target=await root.handle.getDirectoryHandle(fresh.name,{create:true});created=true;for(let i=0;i<fresh.files.length;i++){const f=fresh.files[i],parts=f.path.split('/');let d=target;for(const n of parts.slice(0,-1))d=await d.getDirectoryHandle(n,{create:true});await write(d,parts.at(-1),await (await f.handle.getFile()).arrayBuffer());onProgress(i+1,fresh.files.length);}}
 if(await fileText(root.handle,INDEX)!==root.raw)throw Error('복사 중 캡컷 목록이 변경되었습니다.');
 const backupName=await uniqueBackup(root.handle);try{await write(root.handle,backupName,root.raw);}catch(e){throw Error('백업에 실패하여 목록은 변경하지 않았습니다: '+e.message);}
 if(await fileText(root.handle,INDEX)!==root.raw)throw Error('백업 중 캡컷 목록이 변경되었습니다.');
 const now=Date.now()*1000,entry={draft_id:fresh.projectId,draft_name:fresh.name,draft_fold_path:path,draft_root_path:root.path,draft_json_file:path+'/draft_content.json',draft_cover:fresh.files.some(f=>f.path==='draft_cover.jpg')?path+'/draft_cover.jpg':'',tm_duration:fresh.draft.duration,tm_draft_create:Number.isFinite(fresh.meta.tm_draft_create)?fresh.meta.tm_draft_create:now,tm_draft_modified:now,tm_draft_removed:0,draft_is_invisible:false,draft_is_cloud_temp_draft:false,cloud_draft_sync:false,streaming_edit_draft_ready:true,draft_timeline_materials_size:fresh.mediaBytes};
 const next={...root.index,all_draft_store:[...root.index.all_draft_store,entry],draft_ids:root.index.draft_ids+1};
 await write(root.handle,INDEX,JSON.stringify(next));return {name:fresh.name,path,projectId:fresh.projectId,backupName,inPlace,entry};
 }catch(e){throw Error(e.message+(created?' 새로 복사한 프로젝트 폴더는 남겨 두었습니다. 목록을 확인한 뒤 다시 시도하세요.':''));}
}

