export function validateDestination(handle,root){
 const normalized=root.trim().replaceAll('\\','/').replace(/\/+$/,'');
 if(!/^[A-Za-z]:\//.test(normalized))throw Error('Windows 전체 경로를 입력하세요.');
 const leaf=normalized.split('/').pop();
 if(leaf.toLowerCase()!==handle.name.toLowerCase())throw Error('선택한 폴더 이름과 입력 경로의 마지막 폴더 이름이 일치하지 않습니다.');
}
export async function saveProjectDirectory(parent,name,entries,onProgress=()=>{}){
 if(!/^[A-Za-z0-9가-힣_-]{1,60}$/.test(name))throw Error('잘못된 프로젝트 이름');
 const paths=entries.map(e=>{const parts=e.name.split('/');if(parts.shift()!==name||!parts.length||parts.some(s=>!s||s==='.'||s==='..'||/[\\:<>"|?*]/.test(s)))throw Error('잘못된 저장 경로');return parts;});
 try{await parent.getDirectoryHandle(name);throw Error('같은 이름의 프로젝트 폴더가 이미 있습니다. 다른 프로젝트 이름을 입력하세요.');}catch(e){if(e.name!=='NotFoundError')throw e;}
 let project;try{project=await parent.getDirectoryHandle(name,{create:true});for(let i=0;i<entries.length;i++){let dir=project;const parts=paths[i];for(const part of parts.slice(0,-1))dir=await dir.getDirectoryHandle(part,{create:true});const file=await dir.getFileHandle(parts.at(-1),{create:true});const stream=await file.createWritable();try{await stream.write(entries[i].data);await stream.close();}catch(e){try{await stream.abort();}catch{}throw e;}onProgress(i+1,entries.length);}}catch(e){throw Error('폴더 저장을 완료하지 못했습니다. '+(project?'생성된 프로젝트 폴더에 일부 파일이 남을 수 있습니다. 새 이름으로 다시 시도하세요. ':'')+e.message);}
}
