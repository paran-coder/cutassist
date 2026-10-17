import {DraftStore} from './2026-10-17-recovery-store.mjs';
import {download} from './2026-10-16-zip.mjs';
const $=id=>document.getElementById(id);
export function createRecovery({getPlan,applyPlan,addFiles,isBusy,hasUnapplied}){
 let store=null,last='',pending='',timer=null,failed=false,writing=false;const id=crypto.randomUUID();
 function status(text,error=false){$('autosavestatus').textContent=text;$('autosavestatus').classList.toggle('error',error);}
 try{store=new DraftStore(localStorage,id);const count=store.list().length;status(count?'복구 가능한 작업 '+count+'개':'이 브라우저에 자동 저장');}catch(e){failed=true;status('자동 저장 사용 불가 · JSON으로 저장하세요',true);}
 function flush(){clearTimeout(timer);timer=null;if(!pending)return;try{if(!store)throw Error('브라우저 저장을 사용할 수 없습니다.');store.save(JSON.parse(pending));last=pending;pending='';failed=false;status('자동 저장됨 · '+new Date().toLocaleTimeString('ko-KR'));}catch(e){failed=true;status('자동 저장 실패 · JSON으로 저장하세요',true);$('autosavestatus').title=e.message;}}
 function schedule(){if(writing||isBusy())return;const p=getPlan();if(!p.clips.length&&!p.audioAssets?.length){clearTimeout(timer);pending='';status(failed?'자동 저장 사용 불가 · JSON으로 저장하세요':'영상 없음 · 이전 저장 기록 유지',failed);return;}const next=JSON.stringify(p);if(next===last){clearTimeout(timer);timer=null;pending='';if(!failed)status('자동 저장됨');return;}if(next===pending)return;pending=next;status('저장 중…');clearTimeout(timer);timer=setTimeout(flush,500);}
 function selected(){const key=$('recoverylist').value;return key?store?.read(key):null;}
 function details(){try{const record=selected();$('recoverydetails').textContent=record?new Date(record.savedAt).toLocaleString('ko-KR')+' · '+record.plan.clips.length+'개 영상 · '+(record.plan.audioAssets?.length||0)+'개 오디오 · '+record.plan.captions.length+'개 자막\n'+[...record.plan.clips,...(record.plan.audioAssets||[])].map(c=>c.name).join('\n'):'저장된 작업이 없습니다.';for(const key of ['applyrecovery','downloadrecovery','deleterecovery'])$(key).disabled=!record;}catch(e){$('recoverystatus').textContent=e.message;}}
 function refresh(){const keep=$('recoverylist').value;$('recoverylist').replaceChildren();try{for(const record of store?.list()||[]){const o=document.createElement('option');o.value=record.id;o.textContent=new Date(record.savedAt).toLocaleString('ko-KR')+' · '+record.plan.clips.length+'개 영상 · '+(record.plan.clips[0]?.name||record.plan.audioAssets?.[0]?.name||'빈 작업');$('recoverylist').append(o);}if([...$('recoverylist').options].some(o=>o.value===keep))$('recoverylist').value=keep;details();}catch(e){$('recoverystatus').textContent='복구 목록을 읽지 못했습니다: '+e.message;}}
 $('openrecovery').onclick=()=>{if(isBusy())return;flush();$('recoverystatus').textContent='원본 영상·오디오를 연결한 뒤 복구를 누르세요. JSON 불러오기와 달리 저장 당시 전환 잠금 상태를 그대로 복원합니다.';refresh();$('recoverydialog').showModal();};
 $('closerecovery').onclick=()=>$('recoverydialog').close();$('recoverylist').onchange=details;
 $('recoveryfiles').onchange=async e=>{const files=[...e.target.files];e.target.value='';await addFiles(files);$('recoverystatus').textContent='영상 연결을 마쳤습니다. 선택 작업 복구를 누르세요. 누락된 영상은 복구 시 안내합니다.';};
 $('applyrecovery').onclick=()=>{try{const record=selected();if(!record)throw Error('저장된 작업이 없습니다.');flush();if(pending&&!confirm('현재 작업을 자동 저장하지 못했습니다. JSON으로 먼저 저장했는지 확인하세요. 그래도 선택한 작업으로 바꿀까요?'))return;writing=true;applyPlan(record.plan);store=new DraftStore(store.storage,crypto.randomUUID());last='';pending='';writing=false;schedule();flush();$('recoverydialog').close();}catch(e){writing=false;$('recoverystatus').textContent=e.message;}};
 $('downloadrecovery').onclick=()=>{try{const record=selected();if(record)download(new Blob([JSON.stringify(record.plan,null,2)],{type:'application/json'}),'2026-10-17-CutAssist-recovered.json');}catch(e){$('recoverystatus').textContent=e.message;}};
 $('deleterecovery').onclick=()=>{if(!confirm('선택한 자동 저장 기록을 삭제할까요? 현재 편집과 원본 영상은 삭제하지 않습니다.'))return;try{store.remove($('recoverylist').value);refresh();}catch(e){$('recoverystatus').textContent=e.message;}};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});window.addEventListener('pagehide',flush);
 window.addEventListener('beforeunload',e=>{flush();if(pending||isBusy()||hasUnapplied()){e.preventDefault();e.returnValue='';}});
 return {schedule,flush,get unsaved(){return !!pending;}};
}
