// Project-location token found in CapCut 9.6 and verified with local video/audio.
export const DRAFT_LOCATION='##_draftpath_placeholder_0E685133-18CE-45ED-8CB8-2904A212EC80_##';
export function portableProject(base){
 const result=structuredClone(base),prefix=base.folder+'/media/';
 for(const kind of ['videos','audios'])for(const material of result.draft.materials[kind]||[]){if(typeof material.path!=='string'||!material.path.startsWith(prefix))throw Error('프로젝트 안에 없는 미디어 경로입니다.');material.path=DRAFT_LOCATION+'/media/'+material.path.slice(prefix.length);}
 result.folder=DRAFT_LOCATION;result.meta.draft_fold_path=DRAFT_LOCATION;result.meta.draft_root_path='';if(result.meta.draft_cover?.startsWith(base.folder+'/'))result.meta.draft_cover=DRAFT_LOCATION+result.meta.draft_cover.slice(base.folder.length);return result;
}
